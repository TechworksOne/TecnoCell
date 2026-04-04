const db = require('../config/database');

// ========== CAJA CHICA ==========

// Obtener saldo actual de caja chica
exports.getSaldoCajaChica = async (req, res) => {
  try {
    const [ingresos] = await db.query(
      "SELECT COALESCE(SUM(monto), 0) as total FROM caja_chica WHERE tipo_movimiento = 'INGRESO' AND estado = 'CONFIRMADO'"
    );
    const [egresos] = await db.query(
      "SELECT COALESCE(SUM(monto), 0) as total FROM caja_chica WHERE tipo_movimiento = 'EGRESO' AND estado = 'CONFIRMADO'"
    );
    
    // Obtener pendientes
    const [pendientes] = await db.query(
      "SELECT COALESCE(SUM(monto), 0) as total FROM caja_chica WHERE estado = 'PENDIENTE'"
    );
    
    const saldo = ingresos[0].total - egresos[0].total;
    
    res.json({
      success: true,
      data: {
        saldo,
        ingresos: ingresos[0].total,
        egresos: egresos[0].total,
        pendientes: pendientes[0].total
      }
    });
  } catch (error) {
    console.error('Error getting saldo caja chica:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Obtener movimientos de caja chica
exports.getMovimientosCajaChica = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, tipo, estado } = req.query;
    
    let query = 'SELECT * FROM caja_chica WHERE 1=1';
    const params = [];
    
    if (fecha_inicio) {
      query += ' AND fecha_movimiento >= ?';
      params.push(fecha_inicio);
    }
    if (fecha_fin) {
      query += ' AND fecha_movimiento <= ?';
      params.push(fecha_fin);
    }
    if (tipo) {
      query += ' AND tipo_movimiento = ?';
      params.push(tipo);
    }
    if (estado) {
      query += ' AND estado = ?';
      params.push(estado);
    }
    
    query += ' ORDER BY fecha_movimiento DESC';
    
    const [movimientos] = await db.query(query, params);
    
    res.json({ success: true, data: movimientos });
  } catch (error) {
    console.error('Error getting movimientos caja chica:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Registrar movimiento de caja chica (manual)
exports.registrarMovimientoCajaChica = async (req, res) => {
  try {
    const { tipo_movimiento, monto, concepto, categoria, observaciones, realizado_por } = req.body;
    
    const [result] = await db.query(
      `INSERT INTO caja_chica (tipo_movimiento, monto, concepto, categoria, estado, realizado_por, observaciones)
       VALUES (?, ?, ?, ?, 'CONFIRMADO', ?, ?)`,
      [tipo_movimiento, monto, concepto, categoria || 'Otro', realizado_por, observaciones]
    );
    
    res.status(201).json({
      success: true,
      message: 'Movimiento registrado exitosamente',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Error registrando movimiento caja chica:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== CUENTAS BANCARIAS ==========

// Obtener todas las cuentas bancarias
exports.getCuentasBancarias = async (req, res) => {
  try {
    const [cuentas] = await db.query(
      'SELECT * FROM cuentas_bancarias WHERE activa = TRUE ORDER BY nombre'
    );
    
    res.json({ success: true, data: cuentas });
  } catch (error) {
    console.error('Error getting cuentas bancarias:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Obtener saldo de una cuenta bancaria
exports.getSaldoCuentaBancaria = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [cuenta] = await db.query('SELECT * FROM cuentas_bancarias WHERE id = ?', [id]);
    
    if (cuenta.length === 0) {
      return res.status(404).json({ success: false, message: 'Cuenta no encontrada' });
    }
    
    const [ingresos] = await db.query(
      "SELECT COALESCE(SUM(monto), 0) as total FROM movimientos_bancarios WHERE cuenta_id = ? AND tipo_movimiento = 'INGRESO'",
      [id]
    );
    const [egresos] = await db.query(
      "SELECT COALESCE(SUM(monto), 0) as total FROM movimientos_bancarios WHERE cuenta_id = ? AND tipo_movimiento = 'EGRESO'",
      [id]
    );
    
    const saldo = ingresos[0].total - egresos[0].total;
    
    // Actualizar saldo en la tabla
    await db.query('UPDATE cuentas_bancarias SET saldo_actual = ? WHERE id = ?', [saldo, id]);
    
    res.json({
      success: true,
      data: {
        ...cuenta[0],
        saldo,
        ingresos: ingresos[0].total,
        egresos: egresos[0].total
      }
    });
  } catch (error) {
    console.error('Error getting saldo cuenta bancaria:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Obtener movimientos bancarios
exports.getMovimientosBancarios = async (req, res) => {
  try {
    const { cuenta_id, fecha_inicio, fecha_fin, tipo } = req.query;
    
    let query = `
      SELECT mb.*, cb.nombre as cuenta_nombre 
      FROM movimientos_bancarios mb
      JOIN cuentas_bancarias cb ON mb.cuenta_id = cb.id
      WHERE 1=1
    `;
    const params = [];
    
    if (cuenta_id) {
      query += ' AND mb.cuenta_id = ?';
      params.push(cuenta_id);
    }
    if (fecha_inicio) {
      query += ' AND mb.fecha_movimiento >= ?';
      params.push(fecha_inicio);
    }
    if (fecha_fin) {
      query += ' AND mb.fecha_movimiento <= ?';
      params.push(fecha_fin);
    }
    if (tipo) {
      query += ' AND mb.tipo_movimiento = ?';
      params.push(tipo);
    }
    
    query += ' ORDER BY mb.fecha_movimiento DESC';
    
    const [movimientos] = await db.query(query, params);
    
    res.json({ success: true, data: movimientos });
  } catch (error) {
    console.error('Error getting movimientos bancarios:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Registrar movimiento bancario (manual)
exports.registrarMovimientoBancario = async (req, res) => {
  try {
    const {
      cuenta_id,
      tipo_movimiento,
      monto,
      concepto,
      categoria,
      numero_referencia,
      observaciones,
      realizado_por
    } = req.body;
    
    const [result] = await db.query(
      `INSERT INTO movimientos_bancarios 
       (cuenta_id, tipo_movimiento, monto, concepto, categoria, estado, numero_referencia, realizado_por, observaciones)
       VALUES (?, ?, ?, ?, ?, 'CONFIRMADO', ?, ?, ?)`,
      [cuenta_id, tipo_movimiento, monto, concepto, categoria || 'Otro', numero_referencia, realizado_por, observaciones]
    );
    
    // Actualizar saldo de la cuenta (movimientos manuales se confirman automáticamente)
    const operacion = tipo_movimiento === 'INGRESO' ? '+' : '-';
    await db.query(
      `UPDATE cuentas_bancarias SET saldo_actual = saldo_actual ${operacion} ? WHERE id = ?`,
      [monto, cuenta_id]
    );
    
    res.status(201).json({
      success: true,
      message: 'Movimiento bancario registrado exitosamente',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Error registrando movimiento bancario:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== CONFIRMACIÓN DE MOVIMIENTOS ==========

// Confirmar movimiento de caja chica
exports.confirmarMovimientoCajaChica = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Actualizar estado a CONFIRMADO
    await db.query(
      "UPDATE caja_chica SET estado = 'CONFIRMADO' WHERE id = ?",
      [id]
    );
    
    res.json({ 
      success: true, 
      message: 'Movimiento confirmado exitosamente' 
    });
  } catch (error) {
    console.error('Error confirmando movimiento caja chica:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Confirmar movimiento bancario
exports.confirmarMovimientoBancario = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Obtener detalles del movimiento
    const [movimiento] = await db.query(
      'SELECT * FROM movimientos_bancarios WHERE id = ?',
      [id]
    );
    
    if (movimiento.length === 0) {
      return res.status(404).json({ success: false, message: 'Movimiento no encontrado' });
    }
    
    const mov = movimiento[0];
    
    // Actualizar estado a CONFIRMADO
    await db.query(
      "UPDATE movimientos_bancarios SET estado = 'CONFIRMADO' WHERE id = ?",
      [id]
    );
    
    // Actualizar saldo de la cuenta bancaria
    const operacion = mov.tipo_movimiento === 'INGRESO' ? '+' : '-';
    await db.query(
      `UPDATE cuentas_bancarias SET saldo_actual = saldo_actual ${operacion} ? WHERE id = ?`,
      [mov.monto, mov.cuenta_id]
    );
    
    res.json({ 
      success: true, 
      message: 'Movimiento confirmado y saldo actualizado' 
    });
  } catch (error) {
    console.error('Error confirmando movimiento bancario:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== FUNCIÓN AUTOMÁTICA PARA VENTAS ==========
// Esta función se llamará desde el controlador de ventas
exports.registrarMovimientoVenta = async (
  ventaId, 
  metodoPago, 
  monto, 
  usuarioNombre, 
  connection = null,
  posSeleccionado = null,
  bancoId = null,
  referencia = null
) => {
  const dbConn = connection || db;
  
  try {
    const concepto = `Venta ${ventaId}`;
    
    if (metodoPago === 'EFECTIVO' || metodoPago === 'Efectivo') {
      // Registrar en caja chica como PENDIENTE (convertir centavos a quetzales)
      const montoQuetzales = monto / 100;
      await dbConn.query(
        `INSERT INTO caja_chica (tipo_movimiento, monto, concepto, venta_id, categoria, estado, realizado_por)
         VALUES ('INGRESO', ?, ?, ?, 'Venta', 'PENDIENTE', ?)`,
        [montoQuetzales, concepto, ventaId, usuarioNombre]
      );
      console.log(`✅ Movimiento PENDIENTE registrado en CAJA CHICA: Q${montoQuetzales} - Venta ${ventaId}`);
    } else if (metodoPago === 'TARJETA' || metodoPago === 'Tarjeta') {
      // Determinar cuenta bancaria según POS seleccionado
      let cuentaId = null;
      
      if (posSeleccionado === 'POS BAC') {
        const [cuentaBac] = await dbConn.query(
          'SELECT id FROM cuentas_bancarias WHERE nombre = ? AND activa = TRUE',
          ['BAC']
        );
        cuentaId = cuentaBac.length > 0 ? cuentaBac[0].id : null;
      } else if (posSeleccionado === 'POS NEONET') {
        const [cuentaIndustrial] = await dbConn.query(
          'SELECT id FROM cuentas_bancarias WHERE nombre = ? AND activa = TRUE',
          ['Banco Industrial']
        );
        cuentaId = cuentaIndustrial.length > 0 ? cuentaIndustrial[0].id : null;
      }
      
      // Si no se encontró cuenta específica, usar la primera activa
      if (!cuentaId) {
        const [cuentas] = await dbConn.query(
          'SELECT id FROM cuentas_bancarias WHERE activa = TRUE ORDER BY id LIMIT 1'
        );
        cuentaId = cuentas.length > 0 ? cuentas[0].id : null;
      }
      
      if (cuentaId) {
        const montoQuetzales = monto / 100;
        await dbConn.query(
          `INSERT INTO movimientos_bancarios 
           (cuenta_id, tipo_movimiento, monto, concepto, venta_id, categoria, estado, numero_referencia, realizado_por)
           VALUES (?, 'INGRESO', ?, ?, ?, 'POS', 'PENDIENTE', ?, ?)`,
          [cuentaId, montoQuetzales, concepto, ventaId, referencia, usuarioNombre]
        );
        
        // NO actualizar saldo hasta que se confirme
        console.log(`✅ Movimiento PENDIENTE registrado en BANCO (${posSeleccionado}): Q${montoQuetzales} - Venta ${ventaId}`);
      }
    } else if (metodoPago === 'TRANSFERENCIA' || metodoPago === 'Transferencia' || metodoPago === 'DEPOSITO' || metodoPago === 'Deposito') {
      // Usar el banco seleccionado o la primera cuenta activa
      let cuentaId = bancoId;
      
      if (!cuentaId) {
        const [cuentas] = await dbConn.query(
          'SELECT id FROM cuentas_bancarias WHERE activa = TRUE ORDER BY id LIMIT 1'
        );
        cuentaId = cuentas.length > 0 ? cuentas[0].id : null;
      }
      
      if (cuentaId) {
        const categoria = metodoPago === 'TRANSFERENCIA' || metodoPago === 'Transferencia' ? 'Transferencia' : 'Deposito';
        const montoQuetzales = monto / 100;
        
        await dbConn.query(
          `INSERT INTO movimientos_bancarios 
           (cuenta_id, tipo_movimiento, monto, concepto, venta_id, categoria, estado, numero_referencia, realizado_por)
           VALUES (?, 'INGRESO', ?, ?, ?, ?, 'PENDIENTE', ?, ?)`,
          [cuentaId, montoQuetzales, concepto, ventaId, categoria, referencia, usuarioNombre]
        );
        
        // NO actualizar saldo hasta que se confirme
        console.log(`✅ Movimiento PENDIENTE registrado en BANCO (${categoria}): Q${montoQuetzales} - Venta ${ventaId}`);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error registrando movimiento de venta:', error);
    throw error;
  }
};

module.exports = exports;
