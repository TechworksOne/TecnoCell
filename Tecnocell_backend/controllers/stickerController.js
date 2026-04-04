const db = require('../config/database');

// Obtener todos los stickers disponibles
exports.getStickersDisponibles = async (req, res) => {
  try {
    const [stickers] = await db.query(
      `SELECT * FROM stickers_garantia 
       WHERE estado = 'DISPONIBLE' 
       ORDER BY numero_sticker ASC`
    );

    res.json({
      success: true,
      data: stickers,
      total: stickers.length
    });
  } catch (error) {
    console.error('Error getting stickers disponibles:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener stickers disponibles',
      error: error.message
    });
  }
};

// Obtener todos los stickers asignados
exports.getStickersAsignados = async (req, res) => {
  try {
    const [stickers] = await db.query(
      `SELECT s.*, r.cliente_nombre as clienteNombre, r.estado as estado_reparacion
       FROM stickers_garantia s
       LEFT JOIN reparaciones r ON s.reparacion_id = r.id
       WHERE s.estado IN ('ASIGNADO', 'USADO')
       ORDER BY s.fecha_asignacion DESC`
    );

    res.json({
      success: true,
      data: stickers,
      total: stickers.length
    });
  } catch (error) {
    console.error('Error getting stickers asignados:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener stickers asignados',
      error: error.message
    });
  }
};

// Asignar sticker a reparación
exports.asignarSticker = async (req, res) => {
  try {
    const { stickerId, reparacionId, ubicacion } = req.body;

    if (!stickerId || !reparacionId) {
      return res.status(400).json({
        success: false,
        message: 'Sticker ID y Reparación ID son requeridos'
      });
    }

    // Verificar que el sticker esté disponible
    const [sticker] = await db.query(
      'SELECT * FROM stickers_garantia WHERE id = ? AND estado = "DISPONIBLE"',
      [stickerId]
    );

    if (sticker.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Sticker no disponible'
      });
    }

    // Asignar sticker
    await db.query(
      `UPDATE stickers_garantia 
       SET estado = 'ASIGNADO', 
           reparacion_id = ?, 
           ubicacion_sticker = ?,
           fecha_asignacion = NOW()
       WHERE id = ?`,
      [reparacionId, ubicacion, stickerId]
    );

    // Actualizar reparación
    await db.query(
      `UPDATE reparaciones 
       SET sticker_serie_interna = ?, 
           sticker_ubicacion = ?
       WHERE id = ?`,
      [sticker[0].numero_sticker, ubicacion, reparacionId]
    );

    res.json({
      success: true,
      message: 'Sticker asignado exitosamente',
      data: {
        stickerId,
        reparacionId,
        numeroSticker: sticker[0].numero_sticker
      }
    });
  } catch (error) {
    console.error('Error asignando sticker:', error);
    res.status(500).json({
      success: false,
      message: 'Error al asignar sticker',
      error: error.message
    });
  }
};

// Obtener estadísticas de stickers
exports.getEstadisticas = async (req, res) => {
  try {
    const [stats] = await db.query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN estado = 'DISPONIBLE' THEN 1 ELSE 0 END) as disponibles,
        SUM(CASE WHEN estado = 'ASIGNADO' THEN 1 ELSE 0 END) as asignados,
        SUM(CASE WHEN estado = 'USADO' THEN 1 ELSE 0 END) as usados
       FROM stickers_garantia`
    );

    res.json({
      success: true,
      data: stats[0]
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
};

// Liberar sticker (volver a disponible)
exports.liberarSticker = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      `UPDATE stickers_garantia 
       SET estado = 'DISPONIBLE', 
           reparacion_id = NULL, 
           ubicacion_sticker = NULL,
           fecha_asignacion = NULL
       WHERE id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: 'Sticker liberado exitosamente'
    });
  } catch (error) {
    console.error('Error liberando sticker:', error);
    res.status(500).json({
      success: false,
      message: 'Error al liberar sticker',
      error: error.message
    });
  }
};

module.exports = exports;
