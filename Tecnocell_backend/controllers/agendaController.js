// Controller: Agenda de entregas de reparaciones
// Devuelve reparaciones con fecha_entrega_programada para el calendario de entregas.

const db = require('../config/database');

// ─── GET /api/agenda/entregas ─────────────────────────────────────────────
// Retorna reparaciones que tienen fecha_entrega_programada asignada.
// Filtros opcionales: fecha_inicio, fecha_fin, estado (query params)
exports.getEntregas = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, estado } = req.query;

    let query = `
      SELECT
        r.id,
        r.cliente_nombre,
        r.cliente_telefono,
        r.cliente_email,
        r.tipo_equipo,
        r.marca,
        r.modelo,
        r.color,
        r.estado,
        r.prioridad,
        r.fecha_ingreso,
        r.fecha_entrega_programada,
        r.nota_entrega_programada,
        r.fecha_entrega
      FROM reparaciones r
      WHERE r.fecha_entrega_programada IS NOT NULL
    `;

    const params = [];

    if (fecha_inicio) {
      query += ' AND r.fecha_entrega_programada >= ?';
      params.push(fecha_inicio);
    }

    if (fecha_fin) {
      query += ' AND r.fecha_entrega_programada <= ?';
      params.push(fecha_fin + ' 23:59:59');
    }

    if (estado) {
      const estados = estado.split(',').map(s => s.trim()).filter(Boolean);
      if (estados.length > 0) {
        query += ` AND r.estado IN (${estados.map(() => '?').join(',')})`;
        params.push(...estados);
      }
    }

    query += ' ORDER BY r.fecha_entrega_programada ASC';

    const [rows] = await db.query(query, params);

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[agendaController] getEntregas error:', error);
    res.status(500).json({ success: false, message: 'Error al obtener entregas' });
  }
};

// ─── PATCH /api/reparaciones/:id/fecha-entrega ────────────────────────────
// Actualiza fecha_entrega_programada y nota_entrega_programada
exports.patchFechaEntrega = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha_entrega_programada, nota_entrega_programada } = req.body;

    if (!fecha_entrega_programada) {
      return res.status(400).json({
        success: false,
        message: 'fecha_entrega_programada es obligatoria',
      });
    }

    // Verificar que la reparación exista
    const [rows] = await db.query('SELECT id FROM reparaciones WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Reparación no encontrada' });
    }

    await db.query(
      `UPDATE reparaciones
         SET fecha_entrega_programada = ?,
             nota_entrega_programada  = ?,
             updated_at               = NOW()
       WHERE id = ?`,
      [fecha_entrega_programada, nota_entrega_programada ?? null, id]
    );

    // Devolver la reparación actualizada (campos de entrega)
    const [[updated]] = await db.query(
      `SELECT id, fecha_entrega_programada, nota_entrega_programada, estado
         FROM reparaciones WHERE id = ?`,
      [id]
    );

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[agendaController] patchFechaEntrega error:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar fecha de entrega' });
  }
};

// ─── DELETE /api/reparaciones/:id/fecha-entrega ───────────────────────────
// Limpia la fecha programada de entrega (sin borrar la reparación)
exports.deleteFechaEntrega = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query('SELECT id FROM reparaciones WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Reparación no encontrada' });
    }

    await db.query(
      `UPDATE reparaciones
         SET fecha_entrega_programada = NULL,
             nota_entrega_programada  = NULL,
             updated_at               = NOW()
       WHERE id = ?`,
      [id]
    );

    res.json({ success: true, message: 'Fecha de entrega eliminada' });
  } catch (error) {
    console.error('[agendaController] deleteFechaEntrega error:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar fecha de entrega' });
  }
};
