// Controller para gestionar reparaciones con imágenes
const db = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ruta base de uploads — siempre absoluta para ser compatible con Docker bind mount
// Dentro del contenedor es /app/uploads (mapeado a /var/www/Tecnocell_storage/uploads en el host)
const UPLOADS_BASE = path.join(__dirname, '..', 'uploads');

// Configuración de Multer para almacenamiento de imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const repairId = req.params.id || req.body.repairId || `REP${Date.now()}`;
    const tipo = req.body.imageTipo || 'historial';

    // Estructura: /app/uploads/reparaciones/REP123456/historial/
    const uploadPath = path.join(UPLOADS_BASE, 'reparaciones', repairId, tipo);

    // Crear directorios recursivamente
    fs.mkdirSync(uploadPath, { recursive: true });

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    
    // Sanitizar nombre
    const sanitized = basename.replace(/[^a-zA-Z0-9_-]/g, '_');
    
    // hist_123456789.jpg
    cb(null, `${sanitized}_${timestamp}${ext}`);
  }
});

// Filtros de archivo
const fileFilter = (req, file, cb) => {
  // Solo permitir imágenes
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen'), false);
  }
};

// Configuración de multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB por imagen
  }
});

// Middleware de upload
exports.uploadMiddleware = upload.array('fotos', 10);

// Helper: Convertir centavos a quetzales
const centavosAQuetzales = (centavos) => centavos / 100;
const quetzalesACentavos = (quetzales) => Math.round(quetzales * 100);

// ========== CREAR REPARACIÓN ==========
exports.createReparacion = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const {
      clienteNombre,
      clienteTelefono,
      clienteEmail,
      clienteId,
      // Equipo
      tipoEquipo,
      marca,
      modelo,
      color,
      imeiSerie,
      patronContrasena,
      estadoFisico,
      diagnosticoInicial,
      // Estado
      estado = 'RECIBIDA',
      prioridad = 'MEDIA',
      // Anticipo
      montoAnticipo = 0,
      metodoAnticipo,
      // Items
      items = [],
      manoDeObra = 0,
      // Accesorios
      accesorios,
      // Observaciones
      observaciones,
      // Fotos de recepción (URLs temporales o IDs si ya se subieron)
      fotosRecepcion = []
    } = req.body;
    
    // Generar ID único
    const repairId = `REP${Date.now()}`;
    
    // Calcular totales (convertir a centavos)
    const subtotalCentavos = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const manoObraCentavos = quetzalesACentavos(manoDeObra);
    const totalSinImpuestos = subtotalCentavos + manoObraCentavos;
    const impuestosCentavos = Math.round(totalSinImpuestos * 0.12);
    const totalCentavos = totalSinImpuestos + impuestosCentavos;
    const anticipoCentavos = quetzalesACentavos(montoAnticipo);
    
    // 1. Insertar reparación
    await connection.query(
      `INSERT INTO reparaciones (
        id, cliente_id, cliente_nombre, cliente_telefono, cliente_email,
        tipo_equipo, marca, modelo, color, imei_serie, patron_contrasena,
        estado_fisico, diagnostico_inicial,
        estado, prioridad,
        mano_obra, subtotal, impuestos, total,
        monto_anticipo, saldo_anticipo, metodo_anticipo,
        fecha_ingreso, observaciones, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        repairId, clienteId || null, clienteNombre, clienteTelefono, clienteEmail,
        tipoEquipo, marca, modelo, color, imeiSerie, patronContrasena,
        estadoFisico, diagnosticoInicial,
        estado, prioridad,
        manoObraCentavos, subtotalCentavos, impuestosCentavos, totalCentavos,
        anticipoCentavos, anticipoCentavos, metodoAnticipo,
        new Date().toISOString().split('T')[0], observaciones, 'Sistema'
      ]
    );
    
    // 2. Insertar accesorios
    if (accesorios) {
      await connection.query(
        `INSERT INTO reparaciones_accesorios (
          reparacion_id, chip, estuche, memoria_sd, cargador, otros
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          repairId,
          accesorios.chip || false,
          accesorios.estuche || false,
          accesorios.memoriaSD || false,
          accesorios.cargador || false,
          accesorios.otros || null
        ]
      );
    }
    
    // 3. Insertar items/repuestos
    for (const item of items) {
      await connection.query(
        `INSERT INTO reparaciones_items (
          reparacion_id, item_id, item_tipo, nombre, cantidad, precio_unit, subtotal
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          repairId,
          item.productId || item.id,
          item.tipo || 'manual',
          item.nombre,
          item.cantidad,
          quetzalesACentavos(item.precioUnit),
          quetzalesACentavos(item.subtotal)
        ]
      );
    }
    
    // 4. Crear entrada inicial en historial
    const notaInicial = anticipoCentavos > 0
      ? `Reparación creada. Anticipo recibido: Q${centavosAQuetzales(anticipoCentavos).toFixed(2)} (${metodoAnticipo})`
      : 'Reparación creada';
    
    const [historialResult] = await connection.query(
      `INSERT INTO reparaciones_historial (
        reparacion_id, estado, nota, user_nombre
      ) VALUES (?, ?, ?, ?)`,
      [repairId, estado, notaInicial, 'Sistema']
    );
    
    const historialId = historialResult.insertId;
    
    // 5. Si hay fotos de recepción, asociarlas
    if (fotosRecepcion && fotosRecepcion.length > 0) {
      for (const foto of fotosRecepcion) {
        await connection.query(
          `INSERT INTO reparaciones_imagenes (
            reparacion_id, historial_id, tipo, filename, url_path
          ) VALUES (?, ?, ?, ?, ?)`,
          [
            repairId,
            historialId,
            'recepcion',
            foto.filename || 'uploaded.jpg',
            foto.url_path || `/uploads/reparaciones/${repairId}/recepcion/${foto.filename}`
          ]
        );
      }
    }
    
    await connection.commit();
    
    res.status(201).json({
      success: true,
      message: 'Reparación creada exitosamente',
      data: {
        id: repairId,
        total: centavosAQuetzales(totalCentavos)
      }
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Error al crear reparación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear la reparación',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// ========== OBTENER TODAS LAS REPARACIONES ==========
exports.getAllReparaciones = async (req, res) => {
  try {
    const { estado, prioridad, search, limit = 100 } = req.query;
    
    let query = `
      SELECT 
        r.*,
        (SELECT COUNT(*) FROM reparaciones_imagenes WHERE reparacion_id = r.id) as total_imagenes,
        (SELECT COUNT(*) FROM reparaciones_historial WHERE reparacion_id = r.id) as total_cambios
      FROM reparaciones r
      WHERE 1=1
    `;
    const params = [];
    
    if (estado) {
      query += ' AND r.estado = ?';
      params.push(estado);
    }
    
    if (prioridad) {
      query += ' AND r.prioridad = ?';
      params.push(prioridad);
    }
    
    if (search) {
      query += ` AND (
        r.cliente_nombre LIKE ? OR
        r.cliente_telefono LIKE ? OR
        r.marca LIKE ? OR
        r.modelo LIKE ? OR
        r.imei_serie LIKE ? OR
        r.sticker_serie_interna LIKE ?
      )`;
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam, searchParam, searchParam);
    }
    
    query += ' ORDER BY r.created_at DESC LIMIT ?';
    params.push(parseInt(limit));
    
    const [reparaciones] = await db.query(query, params);
    
    // Convertir centavos a quetzales
    const reparacionesFormateadas = reparaciones.map(rep => ({
      ...rep,
      mano_obra: centavosAQuetzales(rep.mano_obra),
      subtotal: centavosAQuetzales(rep.subtotal),
      impuestos: centavosAQuetzales(rep.impuestos),
      total: centavosAQuetzales(rep.total),
      monto_anticipo: centavosAQuetzales(rep.monto_anticipo),
      saldo_anticipo: centavosAQuetzales(rep.saldo_anticipo),
      total_invertido: centavosAQuetzales(rep.total_invertido || 0),
      diferencia_reparacion: centavosAQuetzales(rep.diferencia_reparacion || 0),
      total_ganancia: centavosAQuetzales(rep.total_ganancia || 0)
    }));
    
    res.json({
      success: true,
      data: reparacionesFormateadas
    });
    
  } catch (error) {
    console.error('Error al obtener reparaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las reparaciones',
      error: error.message
    });
  }
};

// ========== OBTENER UNA REPARACIÓN POR ID ==========
exports.getReparacionById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Obtener reparación principal
    const [reparaciones] = await db.query(
      'SELECT * FROM reparaciones WHERE id = ?',
      [id]
    );
    
    if (reparaciones.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Reparación no encontrada'
      });
    }
    
    const reparacion = reparaciones[0];
    
    // Obtener accesorios
    const [accesorios] = await db.query(
      'SELECT * FROM reparaciones_accesorios WHERE reparacion_id = ?',
      [id]
    );
    
    // Obtener items
    const [items] = await db.query(
      'SELECT * FROM reparaciones_items WHERE reparacion_id = ?',
      [id]
    );
    
    // Obtener historial con imágenes
    const [historial] = await db.query(
      `SELECT 
        h.*,
        h.created_at as fecha_cambio,
        GROUP_CONCAT(i.url_path) as fotos
      FROM reparaciones_historial h
      LEFT JOIN reparaciones_imagenes i ON i.historial_id = h.id
      WHERE h.reparacion_id = ?
      GROUP BY h.id
      ORDER BY h.created_at ASC`,
      [id]
    );
    
    // Formatear historial
    const historialFormateado = historial.map(h => ({
      ...h,
      fotos: h.fotos ? h.fotos.split(',') : [],
      costo_repuesto: centavosAQuetzales(h.costo_repuesto || 0),
      diferencia_reparacion: centavosAQuetzales(h.diferencia_reparacion || 0)
    }));
    
    // Obtener imágenes de recepción
    const [imagenesRecepcion] = await db.query(
      'SELECT * FROM reparaciones_imagenes WHERE reparacion_id = ? AND tipo = ?',
      [id, 'recepcion']
    );
    
    // Formatear respuesta
    const reparacionCompleta = {
      ...reparacion,
      mano_obra: centavosAQuetzales(reparacion.mano_obra),
      subtotal: centavosAQuetzales(reparacion.subtotal),
      impuestos: centavosAQuetzales(reparacion.impuestos),
      total: centavosAQuetzales(reparacion.total),
      monto_anticipo: centavosAQuetzales(reparacion.monto_anticipo),
      saldo_anticipo: centavosAQuetzales(reparacion.saldo_anticipo),
      total_invertido: centavosAQuetzales(reparacion.total_invertido || 0),
      diferencia_reparacion: centavosAQuetzales(reparacion.diferencia_reparacion || 0),
      total_ganancia: centavosAQuetzales(reparacion.total_ganancia || 0),
      accesorios: accesorios[0] || null,
      items: items.map(item => ({
        ...item,
        precio_unit: centavosAQuetzales(item.precio_unit),
        subtotal: centavosAQuetzales(item.subtotal)
      })),
      historial: historialFormateado,
      fotosRecepcion: imagenesRecepcion.map(img => img.url_path)
    };
    
    res.json({
      success: true,
      data: reparacionCompleta
    });
    
  } catch (error) {
    console.error('Error al obtener reparación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la reparación',
      error: error.message
    });
  }
};

// ========== CAMBIAR ESTADO CON IMÁGENES ==========
exports.changeRepairState = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const {
      estado,
      subEtapa,
      nota,
      piezaNecesaria,
      proveedor,
      costoRepuesto,
      stickerNumero,
      stickerUbicacion,
      stickerId,
      diferenciaReparacion
    } = req.body;
    
    const uploadedFiles = req.files || [];
    
    // Obtener reparación actual
    const [reparaciones] = await connection.query(
      'SELECT * FROM reparaciones WHERE id = ?',
      [id]
    );
    
    if (reparaciones.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Reparación no encontrada'
      });
    }
    
    const reparacion = reparaciones[0];
    
    // 1. Crear entrada en historial
    const [historialResult] = await connection.query(
      `INSERT INTO reparaciones_historial (
        reparacion_id, estado, sub_etapa, nota,
        pieza_necesaria, proveedor, costo_repuesto,
        sticker_numero, sticker_ubicacion,
        diferencia_reparacion, user_nombre
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, estado, subEtapa || null, nota,
        piezaNecesaria || null, proveedor || null,
        costoRepuesto ? quetzalesACentavos(parseFloat(costoRepuesto)) : null,
        stickerNumero || null, stickerUbicacion || null,
        diferenciaReparacion ? quetzalesACentavos(parseFloat(diferenciaReparacion)) : null,
        'Usuario' // TODO: obtener de auth
      ]
    );
    
    const historialId = historialResult.insertId;
    
    // 2. Guardar imágenes en BD
    for (const file of uploadedFiles) {
      const urlPath = `/uploads/reparaciones/${id}/historial/${file.filename}`;
      
      await connection.query(
        `INSERT INTO reparaciones_imagenes (
          reparacion_id, historial_id, tipo, filename, url_path, file_size, mime_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, historialId, 'historial', file.filename, urlPath, file.size, file.mimetype]
      );
    }
    
    // 3. Actualizar estado de la reparación
    const updates = { estado };
    if (subEtapa) updates.sub_etapa = subEtapa;
    
    // Manejar costo de repuesto
    if (costoRepuesto && parseFloat(costoRepuesto) > 0) {
      const costoCentavos = quetzalesACentavos(parseFloat(costoRepuesto));
      const nuevoSaldo = reparacion.saldo_anticipo - costoCentavos;
      const nuevoInvertido = (reparacion.total_invertido || 0) + costoCentavos;
      
      updates.saldo_anticipo = nuevoSaldo;
      updates.total_invertido = nuevoInvertido;
    }
    
    // Manejar completada
    if (estado === 'COMPLETADA' && stickerNumero) {
      updates.sticker_serie_interna = stickerNumero;
      updates.sticker_ubicacion = stickerUbicacion;
      
      // Si se proporcionó un stickerId, asignar el sticker a la reparación
      if (stickerId) {
        await connection.query(
          `UPDATE stickers_garantia 
           SET estado = 'ASIGNADO', 
               reparacion_id = ?, 
               ubicacion_sticker = ?,
               fecha_asignacion = NOW()
           WHERE id = ? AND estado = 'DISPONIBLE'`,
          [id, stickerUbicacion, stickerId]
        );
      }
    }
    
    // Manejar entrega
    if (estado === 'ENTREGADA') {
      updates.fecha_cierre = new Date().toISOString().split('T')[0];
      
      if (diferenciaReparacion !== undefined) {
        const diferenciaCentavos = quetzalesACentavos(parseFloat(diferenciaReparacion));
        const saldoFinal = reparacion.saldo_anticipo + diferenciaCentavos;
        const gananciaTotal = (reparacion.monto_anticipo + diferenciaCentavos) - (reparacion.total_invertido || 0);
        
        updates.diferencia_reparacion = diferenciaCentavos;
        updates.saldo_anticipo = saldoFinal;
        updates.total_ganancia = gananciaTotal;
      }
    }
    
    // Construir query de actualización
    const updateFields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const updateValues = Object.values(updates);
    
    await connection.query(
      `UPDATE reparaciones SET ${updateFields} WHERE id = ?`,
      [...updateValues, id]
    );
    
    await connection.commit();
    
    res.json({
      success: true,
      message: 'Estado actualizado exitosamente',
      data: {
        historialId,
        imagenesSubidas: uploadedFiles.length
      }
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Error al cambiar estado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar el estado',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Actualizar solo el estado (simple)
exports.updateEstadoReparacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!estado) {
      return res.status(400).json({
        success: false,
        message: 'El estado es requerido'
      });
    }

    // Actualizar estado en la reparación
    await db.query(
      `UPDATE reparaciones SET estado = ? WHERE id = ?`,
      [estado, id]
    );

    // Crear entrada en historial
    await db.query(
      `INSERT INTO reparaciones_historial (
        reparacion_id, estado, nota, user_nombre
      ) VALUES (?, ?, ?, ?)`,
      [
        id,
        estado,
        `Estado actualizado a ${estado}`,
        'Usuario' // TODO: obtener de auth
      ]
    );

    res.json({
      success: true,
      message: 'Estado actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error al actualizar estado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el estado',
      error: error.message
    });
  }
};
