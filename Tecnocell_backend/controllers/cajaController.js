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
      "SELECT COALESCE(SUM(monto), 0) as total FROM movimientos_bancarios WHERE cuenta_id = ? AND tipo_movimiento = 'INGRESO' AND estado = 'CONFIRMADO'",
      [id]
    );
    const [egresos] = await db.query(
      "SELECT COALESCE(SUM(monto), 0) as total FROM movimientos_bancarios WHERE cuenta_id = ? AND tipo_movimiento = 'EGRESO' AND estado = 'CONFIRMADO'",
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

    const [[mov]] = await db.query('SELECT * FROM caja_chica WHERE id = ?', [id]);
    if (!mov) {
      return res.status(404).json({ success: false, message: 'Movimiento no encontrado' });
    }

    // No se puede confirmar un movimiento ya confirmado
    if (mov.estado === 'CONFIRMADO') {
      return res.status(409).json({
        success: false,
        message: 'Este movimiento ya está confirmado'
      });
    }

    // No se puede confirmar un movimiento anulado
    if (mov.estado === 'ANULADO') {
      return res.status(409).json({
        success: false,
        message: 'Este movimiento ha sido anulado y no puede confirmarse'
      });
    }

    // No se puede confirmar un anticipo de una reparación cancelada
    if (mov.referencia_tipo === 'REPARACION' && mov.referencia_id) {
      const [[rep]] = await db.query(
        'SELECT estado FROM reparaciones WHERE id = ?', [mov.referencia_id]
      );
      if (rep && rep.estado === 'CANCELADA') {
        return res.status(409).json({
          success: false,
          message: 'No se puede confirmar este movimiento porque la reparación asociada está cancelada'
        });
      }
    }

    await db.query("UPDATE caja_chica SET estado = 'CONFIRMADO' WHERE id = ?", [id]);
    res.json({ success: true, message: 'Movimiento confirmado exitosamente' });
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

    // No se puede confirmar un movimiento ya confirmado
    if (mov.estado === 'CONFIRMADO') {
      return res.status(409).json({
        success: false,
        message: 'Este movimiento ya está confirmado'
      });
    }

    // No se puede confirmar un movimiento anulado
    if (mov.estado === 'ANULADO') {
      return res.status(409).json({
        success: false,
        message: 'Este movimiento ha sido anulado y no puede confirmarse'
      });
    }

    // No se puede confirmar un anticipo de una reparación cancelada
    if (mov.referencia_tipo === 'REPARACION' && mov.referencia_id) {
      const [[rep]] = await db.query(
        'SELECT estado FROM reparaciones WHERE id = ?', [mov.referencia_id]
      );
      if (rep && rep.estado === 'CANCELADA') {
        return res.status(409).json({
          success: false,
          message: 'No se puede confirmar este movimiento porque la reparación asociada está cancelada'
        });
      }
    }

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
    const metodo = String(metodoPago || '').toUpperCase();
    const montoQuetzales = Number(monto || 0) / 100;

    // Resolver venta_id numérico y referencia legible (numero_venta) en un solo paso.
    let ventaIdNumerico = Number.isInteger(Number(ventaId)) ? Number(ventaId) : null;
    let referenciaVenta = String(ventaId || '').trim();

    try {
      if (ventaIdNumerico !== null) {
        // Llegó como ID numérico: buscar numero_venta para usar en el concepto legible.
        const [filas] = await dbConn.query(
          'SELECT numero_venta FROM ventas WHERE id = ? LIMIT 1',
          [ventaIdNumerico]
        );
        if (filas.length > 0 && filas[0].numero_venta) {
          referenciaVenta = filas[0].numero_venta;
        }
      } else if (referenciaVenta) {
        // Llegó como correlativo (p.ej. "V-2026-0008"): buscar id y numero_venta.
        const [filas] = await dbConn.query(
          'SELECT id, numero_venta FROM ventas WHERE numero_venta = ? LIMIT 1',
          [referenciaVenta]
        );
        if (filas.length > 0) {
          ventaIdNumerico = filas[0].id;
          referenciaVenta = filas[0].numero_venta || referenciaVenta;
          console.log(`🔍 venta_id resuelto: "${ventaId}" → ${ventaIdNumerico}`);
        } else {
          console.warn(`⚠️ venta_id no resuelto: no se encontró venta con numero_venta="${ventaId}".`);
        }
      }
    } catch (lookupErr) {
      console.warn(`⚠️ Error al resolver venta_id numérico desde "${ventaId}":`, lookupErr.message);
    }

    if (ventaIdNumerico === null) {
      console.warn(`⚠️ venta_id queda sin relación numérica. Concepto será: "Venta ${referenciaVenta || ventaId || 'SIN_REFERENCIA'}".`);
    }

    const concepto = `Venta ${referenciaVenta || ventaId || 'SIN_REFERENCIA'}`;

    const buscarPrimeraCuentaActiva = async () => {
      const [cuentas] = await dbConn.query(
        'SELECT id, nombre FROM cuentas_bancarias WHERE activa = TRUE ORDER BY id LIMIT 1'
      );

      return cuentas.length > 0 ? cuentas[0] : null;
    };

    const buscarCuentaPorPOS = async (tipoPOS) => {
      let patrones = [];

      if (tipoPOS === 'BAC') {
        patrones = ['%BAC%'];
      } else if (tipoPOS === 'NEONET') {
        patrones = ['%NEONET%', '%Neonet%', '%Industrial%'];
      }

      if (patrones.length === 0) {
        return null;
      }

      try {
        const condiciones = patrones
          .map(() => '(nombre LIKE ? OR pos_asociado LIKE ?)')
          .join(' OR ');

        const params = patrones.flatMap((patron) => [patron, patron]);

        const [cuentas] = await dbConn.query(
          `SELECT id, nombre 
           FROM cuentas_bancarias 
           WHERE (${condiciones}) 
           AND activa = TRUE 
           ORDER BY id 
           LIMIT 1`,
          params
        );

        return cuentas.length > 0 ? cuentas[0] : null;
      } catch (error) {
        /*
          Fallback por si la tabla cuentas_bancarias todavía no tiene
          la columna pos_asociado.
        */
        if (
          error.code === 'ER_BAD_FIELD_ERROR' ||
          String(error.message || '').includes('pos_asociado')
        ) {
          const condiciones = patrones
            .map(() => 'nombre LIKE ?')
            .join(' OR ');

          const [cuentas] = await dbConn.query(
            `SELECT id, nombre 
             FROM cuentas_bancarias 
             WHERE (${condiciones}) 
             AND activa = TRUE 
             ORDER BY id 
             LIMIT 1`,
            patrones
          );

          return cuentas.length > 0 ? cuentas[0] : null;
        }

        throw error;
      }
    };

    const registrarMovimientoBanco = async (cuenta, categoria = 'POS') => {
      if (!cuenta || !cuenta.id) {
        return false;
      }

      // Anti-duplicado: verificar si ya existe un movimiento activo para esta venta/cuenta/categoría
      if (ventaIdNumerico !== null) {
        const [dup] = await dbConn.query(
          `SELECT id FROM movimientos_bancarios WHERE venta_id = ? AND cuenta_id = ? AND tipo_movimiento = 'INGRESO' AND categoria = ? AND estado IN ('PENDIENTE', 'CONFIRMADO') LIMIT 1`,
          [ventaIdNumerico, cuenta.id, categoria]
        );
        if (dup.length > 0) {
          console.warn(`⚠️ Movimiento duplicado detectado en movimientos_bancarios para venta_id=${ventaIdNumerico}, cuenta_id=${cuenta.id}, categoria=${categoria}. Se omite inserción.`);
          return false;
        }
      }

      await dbConn.query(
        `INSERT INTO movimientos_bancarios 
        (cuenta_id, tipo_movimiento, monto, concepto, venta_id, categoria, estado, numero_referencia, realizado_por)
        VALUES (?, 'INGRESO', ?, ?, ?, ?, 'PENDIENTE', ?, ?)`,
        [
          cuenta.id,
          montoQuetzales,
          concepto,
          ventaIdNumerico,
          categoria,
          referencia,
          usuarioNombre,
        ]
      );

      console.log(
        `✅ Movimiento PENDIENTE registrado en BANCO (${cuenta.nombre || 'Cuenta bancaria'} id=${cuenta.id}): Q${montoQuetzales} - Venta ${referenciaVenta || ventaId}`
      );

      return true;
    };

    if (metodo === 'EFECTIVO') {
      // Anti-duplicado: verificar si ya existe movimiento de ingreso por venta en caja_chica
      if (ventaIdNumerico !== null) {
        const [dup] = await dbConn.query(
          `SELECT id FROM caja_chica WHERE venta_id = ? AND tipo_movimiento = 'INGRESO' AND categoria = 'Venta' AND estado IN ('PENDIENTE', 'CONFIRMADO') LIMIT 1`,
          [ventaIdNumerico]
        );
        if (dup.length > 0) {
          console.warn(`⚠️ Movimiento duplicado detectado en caja_chica para venta_id=${ventaIdNumerico}. Se omite inserción.`);
          return { success: true, skipped: true };
        }
      }

      await dbConn.query(
        `INSERT INTO caja_chica 
         (tipo_movimiento, monto, concepto, venta_id, categoria, estado, realizado_por)
         VALUES ('INGRESO', ?, ?, ?, 'Venta', 'PENDIENTE', ?)`,
        [montoQuetzales, concepto, ventaIdNumerico, usuarioNombre]
      );

      console.log(
        `✅ Movimiento PENDIENTE registrado en CAJA CHICA: Q${montoQuetzales} - Venta ${referenciaVenta || ventaId} (id=${ventaIdNumerico})`
      );
    } else if (metodo === 'TARJETA') {
      /*
        Compatibilidad con ventas antiguas que todavía usan metodo_pago = TARJETA
        y dependen de posSeleccionado.
      */
      let cuenta = null;

      const pos = String(posSeleccionado || '').toUpperCase();

      if (pos.includes('BAC')) {
        cuenta = await buscarCuentaPorPOS('BAC');

        if (!cuenta) {
          console.warn('⚠️ No se encontró cuenta BAC, usando primera cuenta activa');
          cuenta = await buscarPrimeraCuentaActiva();
        }
      } else if (pos.includes('NEONET') || pos.includes('INDUSTRIAL')) {
        cuenta = await buscarCuentaPorPOS('NEONET');

        if (!cuenta) {
          console.warn('⚠️ No se encontró cuenta Neonet/Industrial, usando primera cuenta activa');
          cuenta = await buscarPrimeraCuentaActiva();
        }
      } else {
        console.warn('⚠️ POS no especificado para TARJETA, usando primera cuenta activa');
        cuenta = await buscarPrimeraCuentaActiva();
      }

      if (!(await registrarMovimientoBanco(cuenta, 'POS'))) {
        console.error('❌ No se encontró ninguna cuenta bancaria activa para TARJETA');
      }
    } else if (metodo === 'TARJETA_BAC') {
      let cuenta = await buscarCuentaPorPOS('BAC');

      if (!cuenta) {
        console.warn('⚠️ No se encontró cuenta BAC, usando primera cuenta activa');
        cuenta = await buscarPrimeraCuentaActiva();
      }

      if (!(await registrarMovimientoBanco(cuenta, 'POS'))) {
        console.error('❌ No se encontró ninguna cuenta bancaria activa para TARJETA_BAC');
      }
    } else if (metodo === 'TARJETA_NEONET') {
      let cuenta = await buscarCuentaPorPOS('NEONET');

      if (!cuenta) {
        console.warn('⚠️ No se encontró cuenta Neonet/Industrial, usando primera cuenta activa');
        cuenta = await buscarPrimeraCuentaActiva();
      }

      if (!(await registrarMovimientoBanco(cuenta, 'POS'))) {
        console.error('❌ No se encontró ninguna cuenta bancaria activa para TARJETA_NEONET');
      }
    } else if (metodo === 'TARJETA_OTRA') {
      const cuenta = await buscarPrimeraCuentaActiva();

      if (!(await registrarMovimientoBanco(cuenta, 'POS'))) {
        console.error('❌ No se encontró ninguna cuenta bancaria activa para TARJETA_OTRA');
      }
    } else if (
      metodo === 'TRANSFERENCIA' ||
      metodo === 'DEPOSITO' ||
      metodo === 'DEPÓSITO'
    ) {
      let cuenta = null;

      if (bancoId) {
        const [cuentas] = await dbConn.query(
          'SELECT id, nombre FROM cuentas_bancarias WHERE id = ? AND activa = TRUE LIMIT 1',
          [bancoId]
        );

        cuenta = cuentas.length > 0 ? cuentas[0] : null;
      }

      if (!cuenta) {
        console.warn('⚠️ No se encontró banco seleccionado, usando primera cuenta activa');
        cuenta = await buscarPrimeraCuentaActiva();
      }

      const categoria = metodo === 'TRANSFERENCIA' ? 'Transferencia' : 'Deposito';

      if (!(await registrarMovimientoBanco(cuenta, categoria))) {
        console.error(`❌ No se encontró ninguna cuenta bancaria activa para ${metodo}`);
      }
    } else if (metodo === 'MIXTO') {
      console.warn(
        `⚠️ Venta ${ventaId} registrada como MIXTO. El registro automático de caja/banco debe manejarse desde el detalle de pagos mixtos.`
      );
    } else {
      console.warn(
        `⚠️ Método de pago no reconocido para movimiento automático: ${metodoPago}`
      );
    }

    return { success: true };
  } catch (error) {
    console.error('Error registrando movimiento de venta:', error);
    throw error;
  }
};

// ========== REVERSA AUTOMÁTICA AL ANULAR VENTAS ==========
// Esta función se llama desde ventaController.js cuando una venta se anula.
// No borra movimientos anteriores. Crea un EGRESO para reversar el INGRESO original.
exports.registrarReversaMovimientoVenta = async (
  venta,
  usuarioNombre = 'Sistema',
  connection = null
) => {
  const dbConn = connection || db;

  try {
    if (!venta) {
      console.warn('⚠️ No se recibió información de venta para reversar movimiento financiero.');
      return { success: false, message: 'Venta no proporcionada' };
    }

    const ventaIdOriginal = venta.id ?? venta.venta_id ?? null;
    const ventaIdNumerico = Number.isInteger(Number(ventaIdOriginal)) ? Number(ventaIdOriginal) : null;

    if (ventaIdNumerico === null) {
      console.warn(`⚠️ No se puede crear reversa financiera: venta sin ID numérico resolvible.`);
      return { success: false, message: 'Venta sin ID numérico, no se crea reversa' };
    }

    // Obtener numero_venta para el concepto legible
    let referenciaVenta = String(ventaIdNumerico);
    try {
      const [filas] = await dbConn.query(
        'SELECT numero_venta FROM ventas WHERE id = ? LIMIT 1',
        [ventaIdNumerico]
      );
      if (filas.length > 0 && filas[0].numero_venta) {
        referenciaVenta = filas[0].numero_venta;
      }
    } catch (lookupErr) {
      console.warn(`⚠️ No se pudo obtener numero_venta para venta id=${ventaIdNumerico}:`, lookupErr.message);
    }

    const conceptoReversa = `Anulación venta ${referenciaVenta}`;

    // ── CAJA CHICA ───────────────────────────────────────────────────────────────

    // Anti-duplicado: no crear reversa si ya existe
    const [reversaCajaExistente] = await dbConn.query(
      `SELECT id FROM caja_chica
       WHERE venta_id = ?
         AND tipo_movimiento = 'EGRESO'
         AND categoria = 'Anulacion Venta'
         AND estado IN ('PENDIENTE', 'CONFIRMADO')
       LIMIT 1`,
      [ventaIdNumerico]
    );

    let reversasCajaCreadas = 0;

    if (reversaCajaExistente.length > 0) {
      console.warn(`⚠️ Ya existe reversa de caja para venta_id=${ventaIdNumerico}. Se omite.`);
    } else {
      // A. Anular ingresos PENDIENTES directamente
      await dbConn.query(
        `UPDATE caja_chica
         SET estado = 'ANULADO',
             observaciones = CONCAT(COALESCE(observaciones, ''), ' | ANULADO AUTOMATICAMENTE POR CANCELACION DE VENTA')
         WHERE venta_id = ?
           AND tipo_movimiento = 'INGRESO'
           AND categoria = 'Venta'
           AND estado = 'PENDIENTE'`,
        [ventaIdNumerico]
      );

      // B. Buscar ingresos CONFIRMADOS para reversar
      const [ingresosConfirmadosCaja] = await dbConn.query(
        `SELECT * FROM caja_chica
         WHERE venta_id = ?
           AND tipo_movimiento = 'INGRESO'
           AND categoria = 'Venta'
           AND estado = 'CONFIRMADO'
         ORDER BY id ASC`,
        [ventaIdNumerico]
      );

      // C. Crear una reversa CONFIRMADA por cada ingreso confirmado
      for (const movimiento of ingresosConfirmadosCaja) {
        await dbConn.query(
          `INSERT INTO caja_chica
           (tipo_movimiento, monto, concepto, venta_id, categoria, estado, realizado_por)
           VALUES ('EGRESO', ?, ?, ?, 'Anulacion Venta', 'CONFIRMADO', ?)`,
          [movimiento.monto, conceptoReversa, ventaIdNumerico, usuarioNombre]
        );
        reversasCajaCreadas++;
        console.log(`✅ Reversa de caja registrada: Q${movimiento.monto} - ${conceptoReversa}`);
      }
    }

    // ── BANCO ─────────────────────────────────────────────────────────────────────

    // Anti-duplicado: no crear reversa si ya existe
    const [reversaBancoExistente] = await dbConn.query(
      `SELECT id FROM movimientos_bancarios
       WHERE venta_id = ?
         AND tipo_movimiento = 'EGRESO'
         AND categoria = 'Anulacion Venta'
         AND estado IN ('PENDIENTE', 'CONFIRMADO')
       LIMIT 1`,
      [ventaIdNumerico]
    );

    let reversasBancoCreadas = 0;

    if (reversaBancoExistente.length > 0) {
      console.warn(`⚠️ Ya existe reversa bancaria para venta_id=${ventaIdNumerico}. Se omite.`);
    } else {
      // A. Anular ingresos bancarios PENDIENTES directamente
      await dbConn.query(
        `UPDATE movimientos_bancarios
         SET estado = 'ANULADO',
             observaciones = CONCAT(COALESCE(observaciones, ''), ' | ANULADO AUTOMATICAMENTE POR CANCELACION DE VENTA')
         WHERE venta_id = ?
           AND tipo_movimiento = 'INGRESO'
           AND categoria IN ('POS', 'Transferencia', 'Deposito')
           AND estado = 'PENDIENTE'`,
        [ventaIdNumerico]
      );

      // B. Buscar ingresos bancarios CONFIRMADOS para reversar
      const [ingresosConfirmadosBanco] = await dbConn.query(
        `SELECT * FROM movimientos_bancarios
         WHERE venta_id = ?
           AND tipo_movimiento = 'INGRESO'
           AND categoria IN ('POS', 'Transferencia', 'Deposito')
           AND estado = 'CONFIRMADO'
         ORDER BY id ASC`,
        [ventaIdNumerico]
      );

      // C. Crear una reversa CONFIRMADA por cada ingreso bancario confirmado
      for (const movimiento of ingresosConfirmadosBanco) {
        await dbConn.query(
          `INSERT INTO movimientos_bancarios
           (cuenta_id, tipo_movimiento, monto, concepto, venta_id, categoria, estado, numero_referencia, realizado_por)
           VALUES (?, 'EGRESO', ?, ?, ?, 'Anulacion Venta', 'CONFIRMADO', ?, ?)`,
          [
            movimiento.cuenta_id,
            movimiento.monto,
            conceptoReversa,
            ventaIdNumerico,
            movimiento.numero_referencia || null,
            usuarioNombre,
          ]
        );

        // D. Actualizar saldo_actual restando el monto reversado
        await dbConn.query(
          'UPDATE cuentas_bancarias SET saldo_actual = saldo_actual - ? WHERE id = ?',
          [movimiento.monto, movimiento.cuenta_id]
        );

        reversasBancoCreadas++;
        console.log(`✅ Reversa bancaria registrada: Q${movimiento.monto} - ${conceptoReversa} - Cuenta ${movimiento.cuenta_id}`);
      }
    }

    const reversasCreadas = reversasCajaCreadas + reversasBancoCreadas;

    if (reversasCreadas === 0) {
      console.warn(`⚠️ No había movimientos confirmados para reversar de venta id=${ventaIdNumerico} (${referenciaVenta}). Los pendientes fueron anulados directamente.`);
      return {
        success: true,
        reversasCreadas: 0,
        message: 'Movimientos pendientes anulados. No había confirmados para reversar.',
      };
    }

    return {
      success: true,
      reversasCreadas,
      message: `Reversa financiera creada para venta ${referenciaVenta}`,
    };
  } catch (error) {
    console.error('Error registrando reversa financiera de venta:', error);
    throw error;
  }
};

// ========== RETIRO DE BANCO ==========
// Saca dinero de una cuenta bancaria específica.
// Si se marca a_caja_chica = true, el monto ingresa a caja chica también.
exports.retirarDeBanco = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { cuenta_id, monto, concepto, a_caja_chica, observaciones, realizado_por } = req.body;

    if (!cuenta_id || !monto || Number(monto) <= 0) {
      return res.status(400).json({ success: false, message: 'cuenta_id y monto son requeridos' });
    }
    if (!concepto || !String(concepto).trim()) {
      return res.status(400).json({ success: false, message: 'El concepto es requerido' });
    }

    const montoNum = Number(monto);

    const [cuentas] = await conn.query(
      'SELECT * FROM cuentas_bancarias WHERE id = ? AND activa = TRUE LIMIT 1',
      [cuenta_id]
    );

    if (cuentas.length === 0) {
      return res.status(404).json({ success: false, message: 'Cuenta bancaria no encontrada o inactiva' });
    }

    const cuenta = cuentas[0];

    if (Number(cuenta.saldo_actual) < montoNum) {
      return res.status(409).json({
        success: false,
        message: `Saldo insuficiente. Disponible: Q${Number(cuenta.saldo_actual).toFixed(2)}`
      });
    }

    await conn.beginTransaction();

    const usuario = realizado_por || 'Usuario';

    // Egreso del banco
    await conn.query(
      `INSERT INTO movimientos_bancarios
        (cuenta_id, tipo_movimiento, monto, concepto, categoria, estado, realizado_por, observaciones)
       VALUES (?, 'EGRESO', ?, ?, 'Retiro', 'CONFIRMADO', ?, ?)`,
      [cuenta_id, montoNum, concepto, usuario, observaciones || null]
    );

    await conn.query(
      'UPDATE cuentas_bancarias SET saldo_actual = saldo_actual - ? WHERE id = ?',
      [montoNum, cuenta_id]
    );

    // Ingreso a caja chica (opcional)
    if (a_caja_chica) {
      await conn.query(
        `INSERT INTO caja_chica
          (tipo_movimiento, monto, concepto, categoria, estado, realizado_por, observaciones)
         VALUES ('INGRESO', ?, ?, 'Retiro Banco', 'CONFIRMADO', ?, ?)`,
        [montoNum, `Retiro de ${cuenta.nombre} - ${concepto}`, usuario, observaciones || null]
      );
    }

    await conn.commit();
    conn.release();

    res.status(201).json({
      success: true,
      message: a_caja_chica
        ? `Retiro de Q${montoNum.toFixed(2)} registrado e ingresado a caja chica`
        : `Retiro de Q${montoNum.toFixed(2)} registrado`
    });
  } catch (error) {
    await conn.rollback();
    conn.release();
    console.error('Error en retirarDeBanco:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== DEPÓSITO DE CAJA A BANCO ==========
// Saca dinero de caja chica y lo deposita en una cuenta bancaria.
exports.depositarAlBanco = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { cuenta_id, monto, concepto, observaciones, realizado_por } = req.body;

    if (!cuenta_id || !monto || Number(monto) <= 0) {
      return res.status(400).json({ success: false, message: 'cuenta_id y monto son requeridos' });
    }
    if (!concepto || !String(concepto).trim()) {
      return res.status(400).json({ success: false, message: 'El concepto es requerido' });
    }

    const montoNum = Number(monto);

    // Validar saldo de caja chica (solo CONFIRMADOS)
    const [[saldoRow]] = await conn.query(
      `SELECT COALESCE(SUM(CASE WHEN tipo_movimiento = 'INGRESO' THEN monto ELSE -monto END), 0) AS saldo
       FROM caja_chica WHERE estado = 'CONFIRMADO'`
    );
    const saldoCaja = Number(saldoRow.saldo);

    if (saldoCaja < montoNum) {
      return res.status(409).json({
        success: false,
        message: `Saldo insuficiente en caja chica. Disponible: Q${saldoCaja.toFixed(2)}`
      });
    }

    const [cuentas] = await conn.query(
      'SELECT * FROM cuentas_bancarias WHERE id = ? AND activa = TRUE LIMIT 1',
      [cuenta_id]
    );

    if (cuentas.length === 0) {
      return res.status(404).json({ success: false, message: 'Cuenta bancaria no encontrada o inactiva' });
    }

    const cuenta = cuentas[0];

    await conn.beginTransaction();

    const usuario = realizado_por || 'Usuario';

    // Egreso de caja chica
    await conn.query(
      `INSERT INTO caja_chica
        (tipo_movimiento, monto, concepto, categoria, estado, realizado_por, observaciones)
       VALUES ('EGRESO', ?, ?, 'Deposito Banco', 'CONFIRMADO', ?, ?)`,
      [montoNum, `Depósito a ${cuenta.nombre} - ${concepto}`, usuario, observaciones || null]
    );

    // Ingreso al banco
    await conn.query(
      `INSERT INTO movimientos_bancarios
        (cuenta_id, tipo_movimiento, monto, concepto, categoria, estado, realizado_por, observaciones)
       VALUES (?, 'INGRESO', ?, ?, 'Deposito', 'CONFIRMADO', ?, ?)`,
      [cuenta_id, montoNum, `Depósito desde Caja Chica - ${concepto}`, usuario, observaciones || null]
    );

    // Actualizar saldo banco
    await conn.query(
      'UPDATE cuentas_bancarias SET saldo_actual = saldo_actual + ? WHERE id = ?',
      [montoNum, cuenta_id]
    );

    await conn.commit();
    conn.release();

    res.status(201).json({
      success: true,
      message: `Depósito de Q${montoNum.toFixed(2)} a ${cuenta.nombre} registrado`
    });
  } catch (error) {
    await conn.rollback();
    conn.release();
    console.error('Error en depositarAlBanco:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== TRANSFERENCIA ENTRE BANCOS ==========
// Mueve dinero de una cuenta bancaria a otra dentro del sistema.
exports.transferenciaBancos = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { cuenta_origen_id, cuenta_destino_id, monto, concepto, observaciones, realizado_por } = req.body;

    if (!cuenta_origen_id || !cuenta_destino_id || !monto || Number(monto) <= 0) {
      return res.status(400).json({ success: false, message: 'cuenta_origen_id, cuenta_destino_id y monto son requeridos' });
    }
    if (Number(cuenta_origen_id) === Number(cuenta_destino_id)) {
      return res.status(400).json({ success: false, message: 'La cuenta de origen y destino deben ser diferentes' });
    }
    if (!concepto || !String(concepto).trim()) {
      return res.status(400).json({ success: false, message: 'El concepto es requerido' });
    }

    const montoNum = Number(monto);

    const [cuentasOrigen] = await conn.query(
      'SELECT * FROM cuentas_bancarias WHERE id = ? AND activa = TRUE LIMIT 1',
      [cuenta_origen_id]
    );
    if (cuentasOrigen.length === 0) {
      return res.status(404).json({ success: false, message: 'Cuenta de origen no encontrada o inactiva' });
    }

    const [cuentasDestino] = await conn.query(
      'SELECT * FROM cuentas_bancarias WHERE id = ? AND activa = TRUE LIMIT 1',
      [cuenta_destino_id]
    );
    if (cuentasDestino.length === 0) {
      return res.status(404).json({ success: false, message: 'Cuenta de destino no encontrada o inactiva' });
    }

    const origen = cuentasOrigen[0];
    const destino = cuentasDestino[0];

    if (Number(origen.saldo_actual) < montoNum) {
      return res.status(409).json({
        success: false,
        message: `Saldo insuficiente en ${origen.nombre}. Disponible: Q${Number(origen.saldo_actual).toFixed(2)}`
      });
    }

    await conn.beginTransaction();

    const usuario = realizado_por || 'Usuario';

    // Egreso del origen
    await conn.query(
      `INSERT INTO movimientos_bancarios
        (cuenta_id, tipo_movimiento, monto, concepto, categoria, estado, realizado_por, observaciones)
       VALUES (?, 'EGRESO', ?, ?, 'Transferencia', 'CONFIRMADO', ?, ?)`,
      [cuenta_origen_id, montoNum, `Transferencia a ${destino.nombre} - ${concepto}`, usuario, observaciones || null]
    );

    // Ingreso al destino
    await conn.query(
      `INSERT INTO movimientos_bancarios
        (cuenta_id, tipo_movimiento, monto, concepto, categoria, estado, realizado_por, observaciones)
       VALUES (?, 'INGRESO', ?, ?, 'Transferencia', 'CONFIRMADO', ?, ?)`,
      [cuenta_destino_id, montoNum, `Transferencia desde ${origen.nombre} - ${concepto}`, usuario, observaciones || null]
    );

    // Actualizar saldos
    await conn.query(
      'UPDATE cuentas_bancarias SET saldo_actual = saldo_actual - ? WHERE id = ?',
      [montoNum, cuenta_origen_id]
    );
    await conn.query(
      'UPDATE cuentas_bancarias SET saldo_actual = saldo_actual + ? WHERE id = ?',
      [montoNum, cuenta_destino_id]
    );

    await conn.commit();
    conn.release();

    res.status(201).json({
      success: true,
      message: `Transferencia de Q${montoNum.toFixed(2)} de ${origen.nombre} a ${destino.nombre} registrada`
    });
  } catch (error) {
    await conn.rollback();
    conn.release();
    console.error('Error en transferenciaBancos:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = exports;
