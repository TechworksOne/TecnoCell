// Controller: Órdenes de Trabajo (OT)
// Gestiona la asignación de reparaciones a técnicos
const db = require('../config/database');

// ── Helper: verificar si el usuario es admin ───────────────────────────────
function isAdmin(user) {
  const roles = Array.isArray(user.roles) ? user.roles : [];
  return roles.includes('ADMINISTRADOR') || user.role === 'admin';
}

// ── GET /api/ot ────────────────────────────────────────────────────────────
// Admin: devuelve todas las OT
// Técnico: devuelve solo las reparaciones asignadas a él
exports.getOrdenesTrabajo = async (req, res) => {
  try {
    const { estado, tecnico_id, fecha_inicio, fecha_fin, busqueda, limit = 200 } = req.query;
    const userIsAdmin = isAdmin(req.user);

    const params = [];
    let where = 'WHERE 1=1';

    // Restricción por rol
    if (!userIsAdmin) {
      where += ' AND r.tecnico_asignado_id = ?';
      params.push(req.user.id);
    }

    // Filtros opcionales
    if (estado) {
      where += ' AND r.estado = ?';
      params.push(estado);
    }
    if (tecnico_id && userIsAdmin) {
      where += ' AND r.tecnico_asignado_id = ?';
      params.push(parseInt(tecnico_id, 10));
    }
    if (fecha_inicio) {
      where += ' AND r.asignado_en >= ?';
      params.push(fecha_inicio);
    }
    if (fecha_fin) {
      where += ' AND r.asignado_en <= ?';
      params.push(fecha_fin + ' 23:59:59');
    }
    if (busqueda) {
      where += ` AND (
        r.cliente_nombre LIKE ? OR
        r.cliente_telefono LIKE ? OR
        r.marca LIKE ? OR
        r.modelo LIKE ? OR
        r.id LIKE ?
      )`;
      const like = `%${busqueda}%`;
      params.push(like, like, like, like, like);
    }

    params.push(parseInt(limit, 10));

    const [rows] = await db.query(
      `SELECT
         r.id,
         r.cliente_nombre,
         r.cliente_telefono,
         r.tipo_equipo,
         r.marca,
         r.modelo,
         r.estado,
         r.prioridad,
         r.fecha_ingreso,
         r.tecnico_asignado_id,
         r.asignado_por,
         r.asignado_en,
         CONCAT(COALESCE(pt.nombres,''), ' ', COALESCE(pt.apellidos,'')) AS tecnico_nombre,
         ut.username AS tecnico_username,
         CONCAT(COALESCE(pa.nombres,''), ' ', COALESCE(pa.apellidos,'')) AS asignado_por_nombre,
         ua.username AS asignado_por_username
       FROM reparaciones r
       LEFT JOIN users ut ON ut.id = r.tecnico_asignado_id
       LEFT JOIN user_profiles pt ON pt.user_id = r.tecnico_asignado_id
       LEFT JOIN users ua ON ua.id = r.asignado_por
       LEFT JOIN user_profiles pa ON pa.user_id = r.asignado_por
       ${where}
       ORDER BY r.updated_at DESC
       LIMIT ?`,
      params
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('getOrdenesTrabajo error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── PATCH /api/reparaciones/:id/asignar-tecnico ────────────────────────────
// Asigna o cambia el técnico de una reparación
exports.asignarTecnico = async (req, res) => {
  try {
    const { id } = req.params;
    const { tecnico_id } = req.body;

    if (!isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Solo administradores pueden asignar técnicos' });
    }
    if (!tecnico_id) {
      return res.status(400).json({ success: false, message: 'tecnico_id es requerido' });
    }

    // Verificar que la reparación existe
    const [[rep]] = await db.query('SELECT id FROM reparaciones WHERE id = ?', [id]);
    if (!rep) {
      return res.status(404).json({ success: false, message: 'Reparación no encontrada' });
    }

    // Verificar que el técnico es un usuario válido y activo
    const [[tecnico]] = await db.query(
      `SELECT u.id, u.username,
              CONCAT(COALESCE(p.nombres,''), ' ', COALESCE(p.apellidos,'')) AS nombre_completo
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE u.id = ? AND u.active = 1`,
      [parseInt(tecnico_id, 10)]
    );
    if (!tecnico) {
      return res.status(404).json({ success: false, message: 'Técnico no encontrado o inactivo' });
    }

    // Actualizar asignación
    await db.query(
      `UPDATE reparaciones
         SET tecnico_asignado_id = ?,
             asignado_por = ?,
             asignado_en = NOW()
       WHERE id = ?`,
      [parseInt(tecnico_id, 10), req.user.id, id]
    );

    // Devolver datos actualizados
    const [[updated]] = await db.query(
      `SELECT
         r.tecnico_asignado_id,
         r.asignado_por,
         r.asignado_en,
         CONCAT(COALESCE(pt.nombres,''), ' ', COALESCE(pt.apellidos,'')) AS tecnico_nombre,
         ut.username AS tecnico_username,
         CONCAT(COALESCE(pa.nombres,''), ' ', COALESCE(pa.apellidos,'')) AS asignado_por_nombre
       FROM reparaciones r
       LEFT JOIN users ut ON ut.id = r.tecnico_asignado_id
       LEFT JOIN user_profiles pt ON pt.user_id = r.tecnico_asignado_id
       LEFT JOIN users ua ON ua.id = r.asignado_por
       LEFT JOIN user_profiles pa ON pa.user_id = r.asignado_por
       WHERE r.id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: 'Técnico asignado correctamente',
      data: updated,
    });
  } catch (error) {
    console.error('asignarTecnico error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── DELETE /api/reparaciones/:id/asignar-tecnico ───────────────────────────
// Quita la asignación técnica de una reparación
exports.quitarAsignacion = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Solo administradores pueden quitar asignaciones' });
    }

    const [[rep]] = await db.query('SELECT id FROM reparaciones WHERE id = ?', [id]);
    if (!rep) {
      return res.status(404).json({ success: false, message: 'Reparación no encontrada' });
    }

    await db.query(
      `UPDATE reparaciones
         SET tecnico_asignado_id = NULL,
             asignado_por = NULL,
             asignado_en = NULL
       WHERE id = ?`,
      [id]
    );

    res.json({ success: true, message: 'Asignación eliminada correctamente' });
  } catch (error) {
    console.error('quitarAsignacion error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/usuarios/tecnicos ─────────────────────────────────────────────
// Devuelve usuarios que pueden recibir OT (rol ADMINISTRADOR o TECNICO, activos)
exports.getTecnicos = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
         u.id,
         u.username,
         u.email,
         CONCAT(COALESCE(p.nombres,''), ' ', COALESCE(p.apellidos,'')) AS nombre_completo,
         GROUP_CONCAT(r.nombre ORDER BY r.nombre SEPARATOR ',') AS roles
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.active = 1
       GROUP BY u.id
       HAVING roles LIKE '%ADMINISTRADOR%' OR roles LIKE '%TECNICO%'
       ORDER BY nombre_completo`,
      []
    );

    const result = rows.map(u => ({
      ...u,
      roles: u.roles ? u.roles.split(',') : [],
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('getTecnicos error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
