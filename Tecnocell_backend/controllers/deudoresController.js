const db = require('../config/database');

// ── Listar todos los créditos ──────────────────────────────────────────────
exports.getDeudores = async (req, res) => {
  try {
    const { estado, cliente_id, search, tipo_origen } = req.query;

    let query = `
      SELECT 
        d.*,
        c.nombre AS cliente_nombre_actual,
        c.telefono AS cliente_telefono_actual
      FROM deudores d
      LEFT JOIN clientes c ON d.cliente_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (estado) {
      query += ' AND d.estado = ?';
      params.push(estado);
    }
    if (cliente_id) {
      query += ' AND d.cliente_id = ?';
      params.push(cliente_id);
    }
    if (tipo_origen) {
      query += ' AND d.tipo_origen = ?';
      params.push(tipo_origen);
    }
    if (search) {
      query += ' AND (d.cliente_nombre LIKE ? OR d.descripcion LIKE ? OR d.numero_credito LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY d.created_at DESC';

    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error al obtener deudores:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Obtener un crédito por ID ──────────────────────────────────────────────
exports.getDeudorById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      `SELECT d.*, c.nombre AS cliente_nombre_actual, c.telefono AS cliente_telefono_actual
       FROM deudores d
       LEFT JOIN clientes c ON d.cliente_id = c.id
       WHERE d.id = ?`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Crédito no encontrado' });

    const deudor = rows[0];
    // Pagos del crédito (incluye cuotas pre-programadas y pagos reales)
    const [pagos] = await db.query(
      `SELECT * FROM deudores_pagos WHERE deudor_id = ?
       ORDER BY numero_cuota ASC, fecha_pago ASC`,
      [id]
    );
    deudor.pagos = pagos;
    res.json({ success: true, data: deudor });
  } catch (error) {
    console.error('Error al obtener crédito:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Crear crédito ──────────────────────────────────────────────────────────
exports.createDeudor = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const {
      cliente_id, cliente_nombre, cliente_telefono,
      descripcion, monto_total, fecha_vencimiento,
      referencia_venta_id, referencia_reparacion_id,
      tipo_origen = 'MANUAL',
      numero_cuotas = 1,
      frecuencia_pago = 'MENSUAL',
      fecha_primer_pago,
      items_detalle,
      notas, created_by
    } = req.body;

    if (!cliente_nombre) {
      await connection.rollback();
      return res.status(400).json({ error: 'El nombre del cliente es requerido' });
    }
    if (!monto_total || Number(monto_total) <= 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
    }

    const cuotas   = Math.max(1, parseInt(numero_cuotas) || 1);
    const total    = parseFloat(monto_total);
    const cuotaBase = parseFloat((total / cuotas).toFixed(2));
    const cuotaUlt  = parseFloat((total - cuotaBase * (cuotas - 1)).toFixed(2));

    const [result] = await connection.query(
      `INSERT INTO deudores
         (cliente_id, cliente_nombre, cliente_telefono, descripcion,
          monto_total, monto_pagado, saldo_pendiente,
          fecha_vencimiento, referencia_venta_id, referencia_reparacion_id,
          tipo_origen, numero_cuotas, monto_cuota, frecuencia_pago, fecha_primer_pago,
          items_detalle, notas, estado, created_by)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDIENTE', ?)`,
      [
        cliente_id || null, cliente_nombre, cliente_telefono || null,
        descripcion || null, total, total,
        fecha_vencimiento || null,
        referencia_venta_id || null,
        referencia_reparacion_id || null,
        tipo_origen,
        cuotas, cuotaBase, frecuencia_pago || 'MENSUAL',
        fecha_primer_pago || null,
        items_detalle ? JSON.stringify(items_detalle) : null,
        notas || null, created_by || null
      ]
    );

    const deudorId = result.insertId;

    // Crear plan de cuotas pre-programadas
    if (cuotas > 1 && fecha_primer_pago) {
      const cuotasRows = [];
      let fecha = new Date(fecha_primer_pago + 'T12:00:00');
      for (let i = 1; i <= cuotas; i++) {
        const montoCuota = i === cuotas ? cuotaUlt : cuotaBase;
        cuotasRows.push([
          deudorId,
          i,
          0,                            // monto pagado = 0
          montoCuota,                   // monto_programado
          fecha.toISOString().split('T')[0], // fecha_vencimiento
          'PENDIENTE',
          'SISTEMA',
        ]);
        if (frecuencia_pago === 'SEMANAL')    fecha.setDate(fecha.getDate() + 7);
        else if (frecuencia_pago === 'QUINCENAL') fecha.setDate(fecha.getDate() + 15);
        else fecha.setMonth(fecha.getMonth() + 1);
      }
      for (const row of cuotasRows) {
        await connection.query(
          `INSERT INTO deudores_pagos
             (deudor_id, numero_cuota, monto, monto_programado, fecha_vencimiento, estado_cuota, realizado_por)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          row
        );
      }
    }

    await connection.commit();
    const [rows] = await db.query('SELECT * FROM deudores WHERE id = ?', [deudorId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    await connection.rollback();
    console.error('Error al crear crédito:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
};

// ── Buscar reparaciones para vincular ─────────────────────────────────────
exports.searchReparaciones = async (req, res) => {
  try {
    const { search = '', limit = 15 } = req.query;
    const like = `%${search}%`;
    const [rows] = await db.query(
      `SELECT id, sticker_serie_interna AS numero_reparacion,
              cliente_nombre, cliente_telefono,
              marca, modelo, total, saldo_anticipo
       FROM reparaciones
       WHERE (cliente_nombre LIKE ? OR marca LIKE ? OR modelo LIKE ?
              OR sticker_serie_interna LIKE ?)
         AND estado NOT IN ('CANCELADA','ENTREGADA')
       ORDER BY created_at DESC
       LIMIT ?`,
      [like, like, like, like, parseInt(limit)]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error búsqueda reparaciones:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Registrar pago parcial o total ────────────────────────────────────────
exports.registrarPago = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { monto, metodo_pago, referencia, notas, realizado_por } = req.body;

    if (!monto || monto <= 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
    }

    const [rows] = await connection.query('SELECT * FROM deudores WHERE id = ? LIMIT 1', [id]);
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Crédito no encontrado' });
    }

    const deudor = rows[0];
    if (deudor.estado === 'PAGADO') {
      await connection.rollback();
      return res.status(400).json({ error: 'Este crédito ya está pagado' });
    }

    if (monto > deudor.saldo_pendiente) {
      await connection.rollback();
      return res.status(400).json({ error: `El monto (Q${monto.toFixed(2)}) supera el saldo pendiente (Q${(deudor.saldo_pendiente).toFixed(2)})` });
    }

    // Insertar pago
    await connection.query(
      `INSERT INTO deudores_pagos
         (deudor_id, monto, metodo_pago, referencia, notas, realizado_por)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, monto, metodo_pago || 'EFECTIVO', referencia || null, notas || null, realizado_por || 'Sistema']
    );

    const nuevoMontoPagado = Number(deudor.monto_pagado) + Number(monto);
    const nuevoSaldo = Number(deudor.monto_total) - nuevoMontoPagado;
    const nuevoEstado = nuevoSaldo <= 0 ? 'PAGADO' : 'PARCIAL';

    await connection.query(
      'UPDATE deudores SET monto_pagado = ?, saldo_pendiente = ?, estado = ? WHERE id = ?',
      [nuevoMontoPagado, Math.max(0, nuevoSaldo), nuevoEstado, id]
    );

    await connection.commit();

    const [updated] = await db.query('SELECT * FROM deudores WHERE id = ?', [id]);
    res.json({ success: true, data: updated[0] });
  } catch (error) {
    await connection.rollback();
    console.error('Error al registrar pago:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
};

// ── Anular crédito ────────────────────────────────────────────────────────
exports.anularDeudor = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo, usuario_id } = req.body;

    const [rows] = await db.query('SELECT * FROM deudores WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Crédito no encontrado' });
    if (rows[0].estado === 'ANULADO') return res.status(400).json({ error: 'Ya está anulado' });

    await db.query(
      "UPDATE deudores SET estado = 'ANULADO', notas = CONCAT(COALESCE(notas,''), ?) WHERE id = ?",
      [`\nANULADO: ${motivo || 'Sin motivo'} - ${new Date().toISOString()}`, id]
    );

    res.json({ success: true, message: 'Crédito anulado' });
  } catch (error) {
    console.error('Error al anular crédito:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Resumen / estadísticas ────────────────────────────────────────────────
exports.getResumen = async (req, res) => {
  try {
    const [[stats]] = await db.query(`
      SELECT
        COUNT(*) AS total_creditos,
        SUM(CASE WHEN estado = 'PENDIENTE' THEN 1 ELSE 0 END) AS pendientes,
        SUM(CASE WHEN estado = 'PARCIAL'   THEN 1 ELSE 0 END) AS parciales,
        SUM(CASE WHEN estado = 'PAGADO'    THEN 1 ELSE 0 END) AS pagados,
        SUM(CASE WHEN estado != 'ANULADO'  THEN monto_total    ELSE 0 END) AS total_prestado,
        SUM(CASE WHEN estado != 'ANULADO'  THEN saldo_pendiente ELSE 0 END) AS total_pendiente,
        SUM(CASE WHEN estado != 'ANULADO'  THEN monto_pagado   ELSE 0 END) AS total_cobrado
      FROM deudores
    `);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
