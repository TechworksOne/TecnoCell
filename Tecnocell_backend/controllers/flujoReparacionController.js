// Controller para gestionar el flujo de reparaciones (estados, checklist, historial)
const db = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de Multer para imágenes de ingreso de equipo
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const repairId = req.params.id || req.body.reparacion_id;
    const uploadPath = path.join('uploads', 'reparaciones', repairId, 'ingreso');
    
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    const sanitized = basename.replace(/[^a-zA-Z0-9_-]/g, '_');
    
    cb(null, `ingreso_${sanitized}_${timestamp}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

exports.uploadMiddleware = upload.array('fotos', 10);

// ========== GUARDAR/ACTUALIZAR CHECKLIST DE INGRESO DE EQUIPO ==========
exports.saveIngresoEquipo = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id: reparacionId } = req.params;
    const { checks, observaciones } = req.body;
    
    // Validaciones
    if (!checks) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar los checks del equipo'
      });
    }
    
    // Verificar que la reparación existe
    const [reparaciones] = await connection.query(
      'SELECT id, tipo_equipo FROM reparaciones WHERE id = ?',
      [reparacionId]
    );
    
    if (reparaciones.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Reparación no encontrada'
      });
    }
    
    const tipoEquipo = reparaciones[0].tipo_equipo;
    
    // Procesar fotos si fueron subidas
    const fotos = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        fotos.push({
          filename: file.filename,
          url_path: `/uploads/reparaciones/${reparacionId}/ingreso/${file.filename}`,
          size: file.size,
          mimetype: file.mimetype
        });
      }
    }
    
    // Verificar si ya existe un checklist para esta reparación
    const [existing] = await connection.query(
      'SELECT id FROM ingreso_equipo_checklist WHERE reparacion_id = ?',
      [reparacionId]
    );
    
    if (existing.length > 0) {
      // Actualizar existente
      await connection.query(
        `UPDATE ingreso_equipo_checklist 
         SET checks = ?, fotos = ?, observaciones = ?, updated_at = NOW()
         WHERE reparacion_id = ?`,
        [
          JSON.stringify(checks),
          fotos.length > 0 ? JSON.stringify(fotos) : null,
          observaciones,
          reparacionId
        ]
      );
    } else {
      // Crear nuevo
      await connection.query(
        `INSERT INTO ingreso_equipo_checklist 
         (reparacion_id, tipo_equipo, checks, fotos, observaciones)
         VALUES (?, ?, ?, ?, ?)`,
        [
          reparacionId,
          tipoEquipo,
          JSON.stringify(checks),
          fotos.length > 0 ? JSON.stringify(fotos) : null,
          observaciones
        ]
      );
    }
    
    await connection.commit();
    
    res.status(200).json({
      success: true,
      message: 'Checklist de ingreso guardado exitosamente',
      data: {
        reparacion_id: reparacionId,
        checks: checks,
        fotos: fotos,
        observaciones: observaciones
      }
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('❌ Error al guardar checklist de ingreso:', error);
    res.status(500).json({
      success: false,
      message: 'Error al guardar checklist de ingreso',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// ========== OBTENER CHECKLIST DE INGRESO DE EQUIPO ==========
exports.getIngresoEquipo = async (req, res) => {
  try {
    const { id: reparacionId } = req.params;
    
    const [checklist] = await db.query(
      `SELECT 
        ic.*,
        r.tipo_equipo,
        r.marca,
        r.modelo
       FROM ingreso_equipo_checklist ic
       INNER JOIN reparaciones r ON ic.reparacion_id = r.id
       WHERE ic.reparacion_id = ?`,
      [reparacionId]
    );
    
    if (checklist.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró checklist de ingreso para esta reparación'
      });
    }
    
    // Parsear JSON
    const data = checklist[0];
    data.checks = JSON.parse(data.checks);
    data.fotos = data.fotos ? JSON.parse(data.fotos) : [];
    
    res.json({
      success: true,
      data: data
    });
    
  } catch (error) {
    console.error('❌ Error al obtener checklist de ingreso:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener checklist de ingreso',
      error: error.message
    });
  }
};

// ========== CAMBIAR ESTADO DE REPARACIÓN ==========
exports.cambiarEstado = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id: reparacionId } = req.params;
    const { nuevoEstado, nota, userId, userName } = req.body;
    
    // Validaciones
    const estadosPermitidos = [
      'RECIBIDA', 'EN_DIAGNOSTICO', 'ESPERANDO_AUTORIZACION', 'AUTORIZADA',
      'EN_REPARACION', 'ESPERANDO_PIEZA', 'COMPLETADA', 'ENTREGADA',
      'CANCELADA', 'STAND_BY'
    ];
    
    if (!estadosPermitidos.includes(nuevoEstado)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Estado no válido'
      });
    }
    
    // Actualizar estado en reparaciones
    await connection.query(
      'UPDATE reparaciones SET estado = ?, updated_at = NOW() WHERE id = ?',
      [nuevoEstado, reparacionId]
    );
    
    // Registrar en historial
    await connection.query(
      `INSERT INTO reparaciones_historial 
       (reparacion_id, estado, nota, user_nombre, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [reparacionId, nuevoEstado, nota || `Estado cambiado a ${nuevoEstado}`, userName || 'Sistema', userId || null]
    );
    
    await connection.commit();
    
    res.json({
      success: true,
      message: 'Estado actualizado exitosamente',
      data: {
        reparacion_id: reparacionId,
        nuevo_estado: nuevoEstado
      }
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('❌ Error al cambiar estado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar estado',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// ========== OBTENER HISTORIAL DE REPARACIÓN ==========
exports.getHistorial = async (req, res) => {
  try {
    const { id: reparacionId } = req.params;
    
    const [historial] = await db.query(
      `SELECT 
        h.*,
        (SELECT JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', i.id,
            'filename', i.filename,
            'url_path', i.url_path,
            'tipo', i.tipo
          )
        )
        FROM reparaciones_imagenes i
        WHERE i.historial_id = h.id) as imagenes
       FROM reparaciones_historial h
       WHERE h.reparacion_id = ?
       ORDER BY h.created_at DESC`,
      [reparacionId]
    );
    
    res.json({
      success: true,
      data: historial.map(h => ({
        ...h,
        imagenes: h.imagenes ? JSON.parse(h.imagenes) : []
      }))
    });
    
  } catch (error) {
    console.error('❌ Error al obtener historial:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener historial',
      error: error.message
    });
  }
};

// ========== ASIGNAR TÉCNICO ==========
exports.asignarTecnico = async (req, res) => {
  try {
    const { id: reparacionId } = req.params;
    const { tecnicoId, tecnicoNombre } = req.body;
    
    await db.query(
      'UPDATE reparaciones SET tecnico_asignado = ?, updated_at = NOW() WHERE id = ?',
      [tecnicoNombre, reparacionId]
    );
    
    res.json({
      success: true,
      message: 'Técnico asignado exitosamente'
    });
    
  } catch (error) {
    console.error('❌ Error al asignar técnico:', error);
    res.status(500).json({
      success: false,
      message: 'Error al asignar técnico',
      error: error.message
    });
  }
};

// ========== CAMBIAR PRIORIDAD ==========
exports.cambiarPrioridad = async (req, res) => {
  try {
    const { id: reparacionId } = req.params;
    const { prioridad } = req.body;
    
    const prioridadesPermitidas = ['BAJA', 'MEDIA', 'ALTA'];
    
    if (!prioridadesPermitidas.includes(prioridad)) {
      return res.status(400).json({
        success: false,
        message: 'Prioridad no válida'
      });
    }
    
    await db.query(
      'UPDATE reparaciones SET prioridad = ?, updated_at = NOW() WHERE id = ?',
      [prioridad, reparacionId]
    );
    
    res.json({
      success: true,
      message: 'Prioridad actualizada exitosamente'
    });
    
  } catch (error) {
    console.error('❌ Error al cambiar prioridad:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar prioridad',
      error: error.message
    });
  }
};

module.exports = exports;
