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

    const [[mov]] = await db.query('SELECT * FROM caja_chica WHERE id = ?', [id]);
    if (!mov) {
      return res.status(404).json({ success: false, message: 'Movimiento no encontrado' });
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
  const concepto = `Venta ${ventaId}`;
  const metodo = String(metodoPago || '').toUpperCase();
  const montoQuetzales = Number(monto || 0) / 100;

  const ventaIdNumerico = Number.isInteger(Number(ventaId))
    ? Number(ventaId)
    : null;

  if (ventaIdNumerico === null) {
    console.warn(
      `⚠️ venta_id recibido como correlativo (${ventaId}). Se registrará el movimiento bancario sin venta_id numérico.`
    );
  }
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
        `✅ Movimiento PENDIENTE registrado en BANCO (${cuenta.nombre || 'Cuenta bancaria'} id=${cuenta.id}): Q${montoQuetzales} - Venta ${ventaId}`
      );

      return true;
    };

    if (metodo === 'EFECTIVO') {
      await dbConn.query(
        `INSERT INTO caja_chica 
         (tipo_movimiento, monto, concepto, venta_id, categoria, estado, realizado_por)
         VALUES ('INGRESO', ?, ?, ?, 'Venta', 'PENDIENTE', ?)`,
        [montoQuetzales, concepto, ventaId, usuarioNombre]
      );

      console.log(
        `✅ Movimiento PENDIENTE registrado en CAJA CHICA: Q${montoQuetzales} - Venta ${ventaId}`
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

    const ventaIdNumerico = Number.isInteger(Number(ventaIdOriginal))
      ? Number(ventaIdOriginal)
      : null;

    const posiblesReferencias = [
      venta.numero_venta,
      venta.correlativo,
      venta.codigo,
      venta.codigo_venta,
      venta.no_venta,
      venta.serie,
      ventaIdOriginal,
    ]
      .filter((value) => value !== undefined && value !== null && String(value).trim() !== '')
      .map((value) => String(value).trim());

    const referenciasUnicas = [...new Set(posiblesReferencias)];

    const referenciaPrincipal =
      referenciasUnicas.find((ref) => ref.toUpperCase().startsWith('V-')) ||
      referenciasUnicas[0] ||
      String(ventaIdOriginal || 'SIN_REFERENCIA');

        const buildWhereBanco = () => {
      const conditions = [];
      const params = [];

      if (ventaIdNumerico !== null) {
        conditions.push('venta_id = ?');
        params.push(ventaIdNumerico);
      }

      referenciasUnicas.forEach((ref) => {
        conditions.push('concepto LIKE ?');
        params.push(`%${ref}%`);

        conditions.push('numero_referencia = ?');
        params.push(ref);
      });

      if (conditions.length === 0) {
        conditions.push('concepto LIKE ?');
        params.push(`%${referenciaPrincipal}%`);
      }

      return {
        where: `(${conditions.join(' OR ')})`,
        params,
      };
    };

    const buildWhereCaja = () => {
      const conditions = [];
      const params = [];

      if (ventaIdNumerico !== null) {
        conditions.push('venta_id = ?');
        params.push(ventaIdNumerico);
      }

      referenciasUnicas.forEach((ref) => {
        conditions.push('concepto LIKE ?');
        params.push(`%${ref}%`);
      });

      if (conditions.length === 0) {
        conditions.push('concepto LIKE ?');
        params.push(`%${referenciaPrincipal}%`);
      }

      return {
        where: `(${conditions.join(' OR ')})`,
        params,
      };
    };

    const bancoFiltro = buildWhereBanco();
    const cajaFiltro = buildWhereCaja();

    // Evitar reversas duplicadas en banco
    const [reversasBancoExistentes] = await dbConn.query(
      `SELECT id
       FROM movimientos_bancarios
       WHERE tipo_movimiento = 'EGRESO'
       AND categoria = 'Anulacion Venta'
       AND ${bancoFiltro.where}
       LIMIT 1`,
      bancoFiltro.params
    );

    // Evitar reversas duplicadas en caja
    const [reversasCajaExistentes] = await dbConn.query(
      `SELECT id
       FROM caja_chica
       WHERE tipo_movimiento = 'EGRESO'
       AND categoria = 'Anulacion Venta'
       AND ${cajaFiltro.where}
       LIMIT 1`,
      cajaFiltro.params
    );

    if (reversasBancoExistentes.length > 0 || reversasCajaExistentes.length > 0) {
      console.warn(
        `⚠️ La venta ${referenciaPrincipal} ya tiene reversa financiera registrada. No se duplicará.`
      );

      return {
        success: true,
        duplicated: true,
        message: 'La reversa financiera ya existía',
      };
    }

    // Buscar ingresos bancarios originales de la venta
    const [movimientosBancoOriginales] = await dbConn.query(
      `SELECT *
       FROM movimientos_bancarios
       WHERE tipo_movimiento = 'INGRESO'
       AND ${bancoFiltro.where}
       ORDER BY id ASC`,
      bancoFiltro.params
    );

    // Buscar ingresos de caja chica originales de la venta
    const [movimientosCajaOriginales] = await dbConn.query(
      `SELECT *
       FROM caja_chica
       WHERE tipo_movimiento = 'INGRESO'
       AND ${cajaFiltro.where}
       ORDER BY id ASC`,
      cajaFiltro.params
    );

    let reversasCreadas = 0;

    // Reversar movimientos bancarios
    for (const movimiento of movimientosBancoOriginales) {
      const estadoReversa =
        String(movimiento.estado || '').toUpperCase() === 'CONFIRMADO'
          ? 'CONFIRMADO'
          : 'PENDIENTE';

      const conceptoReversa = `Anulación venta ${referenciaPrincipal}`;

      await dbConn.query(
        `INSERT INTO movimientos_bancarios
         (
           cuenta_id,
           tipo_movimiento,
           monto,
           concepto,
           venta_id,
           categoria,
           estado,
           numero_referencia,
           realizado_por
         )
         VALUES (?, 'EGRESO', ?, ?, ?, 'Anulacion Venta', ?, ?, ?)`,
        [
          movimiento.cuenta_id,
          movimiento.monto,
          conceptoReversa,
          ventaIdNumerico,
          estadoReversa,
          movimiento.numero_referencia || referenciaPrincipal,
          usuarioNombre,
        ]
      );

      // Si el ingreso original ya estaba confirmado, la reversa también afecta saldo inmediatamente.
      if (estadoReversa === 'CONFIRMADO') {
        await dbConn.query(
          'UPDATE cuentas_bancarias SET saldo_actual = saldo_actual - ? WHERE id = ?',
          [movimiento.monto, movimiento.cuenta_id]
        );
      }

      reversasCreadas++;

      console.log(
        `✅ Reversa bancaria registrada: Q${movimiento.monto} - Anulación venta ${referenciaPrincipal} - Cuenta ${movimiento.cuenta_id}`
      );
    }

    // Reversar movimientos de caja chica
    for (const movimiento of movimientosCajaOriginales) {
      const estadoReversa =
        String(movimiento.estado || '').toUpperCase() === 'CONFIRMADO'
          ? 'CONFIRMADO'
          : 'PENDIENTE';

      const conceptoReversa = `Anulación venta ${referenciaPrincipal}`;

      await dbConn.query(
        `INSERT INTO caja_chica
         (
           tipo_movimiento,
           monto,
           concepto,
           venta_id,
           categoria,
           estado,
           realizado_por
         )
         VALUES ('EGRESO', ?, ?, ?, 'Anulacion Venta', ?, ?)`,
        [
          movimiento.monto,
          conceptoReversa,
          ventaIdNumerico,
          estadoReversa,
          usuarioNombre,
        ]
      );

      reversasCreadas++;

      console.log(
        `✅ Reversa de caja registrada: Q${movimiento.monto} - Anulación venta ${referenciaPrincipal}`
      );
    }

    if (reversasCreadas === 0) {
      console.warn(
        `⚠️ No se encontró movimiento financiero original para la venta ${referenciaPrincipal}. No se creó reversa.`
      );

      return {
        success: true,
        reversasCreadas: 0,
        message: 'No había movimientos financieros originales para reversar',
      };
    }

    return {
      success: true,
      reversasCreadas,
      message: `Reversa financiera creada para venta ${referenciaPrincipal}`,
    };
  } catch (error) {
    console.error('Error registrando reversa financiera de venta:', error);
    throw error;
  }
};

module.exports = exports;
