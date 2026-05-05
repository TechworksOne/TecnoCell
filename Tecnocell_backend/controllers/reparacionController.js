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
      // Fecha de ingreso seleccionada por el usuario
      fechaIngreso,
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
        fechaIngreso || new Date().toISOString().split('T')[0], observaciones, 'Sistema'
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
        reparacion_id, estado, nota, user_nombre, tipo_evento, estado_anterior, descripcion
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [repairId, estado, notaInicial, 'Sistema', 'REPARACION_CREADA', null, 'Reparación registrada en el sistema']
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
    
    query += ' ORDER BY r.updated_at DESC LIMIT ?';
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
      monto_pagado_adicional: centavosAQuetzales(rep.monto_pagado_adicional || 0),
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
    const estadoAnterior = reparacion.estado;
    const [historialResult] = await connection.query(
      `INSERT INTO reparaciones_historial (
        reparacion_id, estado, sub_etapa, nota,
        pieza_necesaria, proveedor, costo_repuesto,
        sticker_numero, sticker_ubicacion,
        diferencia_reparacion, user_nombre,
        tipo_evento, estado_anterior, descripcion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, estado, subEtapa || null, nota,
        piezaNecesaria || null, proveedor || null,
        costoRepuesto ? quetzalesACentavos(parseFloat(costoRepuesto)) : null,
        stickerNumero || null, stickerUbicacion || null,
        diferenciaReparacion ? quetzalesACentavos(parseFloat(diferenciaReparacion)) : null,
        'Usuario',
        'CAMBIO_ESTADO', estadoAnterior, nota || null
      ]
    );
    
    const historialId = historialResult.insertId;
    
    // 2. Guardar imágenes en BD
    const tipoImagen = (estado === 'COMPLETADA' || estado === 'ENTREGADA') ? 'final' : 'historial';
    for (const file of uploadedFiles) {
      const urlPath = `/uploads/reparaciones/${id}/${tipoImagen}/${file.filename}`;
      
      await connection.query(
        `INSERT INTO reparaciones_imagenes (
          reparacion_id, historial_id, tipo, filename, url_path, file_size, mime_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, historialId, tipoImagen, file.filename, urlPath, file.size, file.mimetype]
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

    // Obtener estado anterior antes de actualizar
    const [[repActual]] = await db.query(
      'SELECT estado FROM reparaciones WHERE id = ?', [id]
    );
    const estadoAnteriorSimple = repActual ? repActual.estado : null;

    // Actualizar estado en la reparación
    await db.query(
      `UPDATE reparaciones SET estado = ? WHERE id = ?`,
      [estado, id]
    );

    // Crear entrada en historial
    await db.query(
      `INSERT INTO reparaciones_historial (
        reparacion_id, estado, nota, user_nombre,
        tipo_evento, estado_anterior, descripcion
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        estado,
        `Estado actualizado a ${estado}`,
        'Usuario',
        'CAMBIO_ESTADO', estadoAnteriorSimple,
        `Estado actualizado a ${estado}`
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

// ========== HISTORIAL COMPLETO (línea de tiempo unificada) ==========
exports.getHistorialCompleto = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la reparación exista
    const [[reparacion]] = await db.query(
      `SELECT * FROM reparaciones WHERE id = ?`,
      [id]
    );

    if (!reparacion) {
      return res.status(404).json({ success: false, message: 'Reparación no encontrada' });
    }

    const eventos = [];

    // 1. Entradas de reparaciones_historial
    const [historial] = await db.query(
      `SELECT h.*,
         GROUP_CONCAT(i.url_path ORDER BY i.id SEPARATOR ',') AS fotos_urls
       FROM reparaciones_historial h
       LEFT JOIN reparaciones_imagenes i ON i.historial_id = h.id
       WHERE h.reparacion_id = ?
       GROUP BY h.id
       ORDER BY h.created_at ASC`,
      [id]
    );

    for (const h of historial) {
      const tipoEvento = h.tipo_evento || (h.estado === 'ANTICIPO_REGISTRADO' ? 'ANTICIPO_REGISTRADO' : 'CAMBIO_ESTADO');
      const titulo = {
        REPARACION_CREADA: 'Reparación creada',
        CAMBIO_ESTADO: `Cambio de estado${h.estado ? ': ' + h.estado : ''}`,
        CHECKLIST_COMPLETADO: 'Checklist de recepción completado',
        ANTICIPO_REGISTRADO: 'Anticipo registrado',
      }[tipoEvento] || h.estado || 'Actualización';

      eventos.push({
        id: h.id,
        tipo_evento: tipoEvento,
        titulo,
        descripcion: h.descripcion || h.nota || null,
        estado_anterior: h.estado_anterior || null,
        estado_nuevo: (tipoEvento !== 'ANTICIPO_REGISTRADO') ? (h.estado || null) : null,
        nota: h.nota || null,
        usuario: h.user_nombre || 'Sistema',
        fecha: h.created_at,
        pieza_necesaria: h.pieza_necesaria || null,
        proveedor: h.proveedor || null,
        costo_repuesto: h.costo_repuesto ? centavosAQuetzales(h.costo_repuesto) : null,
        sticker_numero: h.sticker_numero || null,
        sticker_ubicacion: h.sticker_ubicacion || null,
        imagenes: h.fotos_urls ? h.fotos_urls.split(',').filter(Boolean) : []
      });
    }

    // 2. Checklist (check_equipo)
    const [[checklist]] = await db.query(
      'SELECT * FROM check_equipo WHERE reparacion_id = ? ORDER BY created_at ASC LIMIT 1',
      [id]
    );
    if (checklist) {
      // Solo añadir si no hay ya un evento CHECKLIST_COMPLETADO en historial
      const yaExiste = eventos.some(e => e.tipo_evento === 'CHECKLIST_COMPLETADO');
      if (!yaExiste) {
        eventos.push({
          id: `checklist-${checklist.id}`,
          tipo_evento: 'CHECKLIST_COMPLETADO',
          titulo: 'Checklist de recepción completado',
          descripcion: checklist.observaciones || 'Se completó el checklist de recepción del equipo',
          estado_anterior: null,
          estado_nuevo: 'RECIBIDA',
          nota: checklist.observaciones || null,
          usuario: checklist.realizado_por || 'Sistema',
          fecha: checklist.created_at,
          imagenes: []
        });
      }
    }

    // 3. Movimientos de caja relacionados
    const [movCaja] = await db.query(
      `SELECT cc.*, 'caja_chica' as origen
       FROM caja_chica cc
       WHERE cc.referencia_tipo = 'REPARACION' AND cc.referencia_id = ?
       ORDER BY cc.fecha_movimiento ASC`,
      [id]
    );
    for (const mov of movCaja) {
      eventos.push({
        id: `caja-${mov.id}`,
        tipo_evento: mov.estado === 'CONFIRMADO' ? 'ANTICIPO_CONFIRMADO' : 'ANTICIPO_PENDIENTE',
        titulo: mov.estado === 'CONFIRMADO' ? 'Anticipo confirmado (Caja)' : 'Anticipo registrado como pendiente (Caja)',
        descripcion: mov.concepto || null,
        estado_anterior: null,
        estado_nuevo: null,
        nota: mov.observaciones || null,
        usuario: mov.realizado_por || 'Sistema',
        fecha: mov.fecha_movimiento,
        monto: parseFloat(mov.monto),
        metodo_pago: 'EFECTIVO',
        banco: null,
        imagenes: []
      });
    }

    // 4. Movimientos bancarios relacionados
    const [movBanco] = await db.query(
      `SELECT mb.*, cb.nombre as banco_nombre, 'banco' as origen
       FROM movimientos_bancarios mb
       LEFT JOIN cuentas_bancarias cb ON cb.id = mb.cuenta_id
       WHERE mb.referencia_tipo = 'REPARACION' AND mb.referencia_id = ?
       ORDER BY mb.fecha_movimiento ASC`,
      [id]
    );
    for (const mov of movBanco) {
      eventos.push({
        id: `banco-${mov.id}`,
        tipo_evento: mov.estado === 'CONFIRMADO' ? 'ANTICIPO_CONFIRMADO' : 'ANTICIPO_PENDIENTE',
        titulo: mov.estado === 'CONFIRMADO' ? 'Anticipo confirmado (Transferencia)' : 'Anticipo registrado como pendiente (Transferencia)',
        descripcion: mov.concepto || null,
        estado_anterior: null,
        estado_nuevo: null,
        nota: mov.observaciones || null,
        usuario: mov.realizado_por || 'Sistema',
        fecha: mov.fecha_movimiento,
        monto: parseFloat(mov.monto),
        metodo_pago: 'TRANSFERENCIA',
        banco: mov.banco_nombre || null,
        imagenes: []
      });
    }

    // Ordenar todos los eventos por fecha ascendente
    eventos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    // Deduplicar: si hay un evento ANTICIPO_REGISTRADO del historial y también un movimiento pendiente de caja/banco,
    // conservar solo el del historial (más informativo) para evitar duplicar
    const eventosFinales = [];
    const anticipoHistorialFecha = eventos
      .filter(e => e.tipo_evento === 'ANTICIPO_REGISTRADO')
      .map(e => new Date(e.fecha).toISOString().substring(0, 10));

    for (const ev of eventos) {
      if ((ev.tipo_evento === 'ANTICIPO_PENDIENTE') &&
          anticipoHistorialFecha.includes(new Date(ev.fecha).toISOString().substring(0, 10))) {
        // Hay un registro en historial para la misma fecha → skip movimiento duplicado
        continue;
      }
      eventosFinales.push(ev);
    }

    res.json({
      success: true,
      data: {
        reparacion: {
          id: reparacion.id,
          cliente_nombre: reparacion.cliente_nombre,
          cliente_telefono: reparacion.cliente_telefono,
          equipo: `${reparacion.marca} ${reparacion.modelo}`,
          estado_actual: reparacion.estado,
          prioridad: reparacion.prioridad,
          fecha_ingreso: reparacion.fecha_ingreso,
          tecnico_asignado: reparacion.tecnico_asignado || null,
          diagnostico_inicial: reparacion.diagnostico_inicial
        },
        eventos: eventosFinales
      }
    });

  } catch (error) {
    console.error('Error al obtener historial completo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el historial',
      error: error.message
    });
  }
};

// ========== ACTUALIZAR PRIORIDAD ==========
exports.updatePrioridad = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;
    const { prioridad } = req.body;
    const usuario = req.user?.username || req.user?.name || req.user?.nombre || 'Usuario';

    const PRIORIDADES_VALIDAS = ['BAJA', 'MEDIA', 'ALTA'];
    if (!prioridad || !PRIORIDADES_VALIDAS.includes(prioridad)) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Prioridad inválida. Debe ser BAJA, MEDIA o ALTA' });
    }

    const [[rep]] = await connection.query(
      'SELECT id, estado, prioridad FROM reparaciones WHERE id = ?', [id]
    );
    if (!rep) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Reparación no encontrada' });
    }
    if (rep.estado === 'CANCELADA') {
      await connection.rollback();
      return res.status(409).json({ success: false, message: 'No se puede modificar una reparación cancelada' });
    }

    const prioridadAnterior = rep.prioridad;
    await connection.query(
      'UPDATE reparaciones SET prioridad = ?, updated_by = ? WHERE id = ?',
      [prioridad, usuario, id]
    );

    await connection.query(
      `INSERT INTO reparaciones_historial
        (reparacion_id, estado, nota, user_nombre, tipo_evento, estado_anterior, descripcion)
       VALUES (?, ?, ?, ?, 'CAMBIO_PRIORIDAD', ?, ?)`,
      [
        id, rep.estado,
        `Prioridad cambiada de ${prioridadAnterior} a ${prioridad}`,
        usuario, prioridadAnterior,
        `Prioridad actualizada: ${prioridadAnterior} → ${prioridad}`
      ]
    );

    await connection.commit();
    res.json({ success: true, message: 'Prioridad actualizada exitosamente', data: { prioridad } });
  } catch (error) {
    await connection.rollback();
    console.error('Error al actualizar prioridad:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar la prioridad', error: error.message });
  } finally {
    connection.release();
  }
};

// ========== REGISTRAR PAGO DE SALDO PENDIENTE ==========
exports.registrarPagoSaldo = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;
    const { monto, metodoPago } = req.body;
    const usuario = req.user?.username || req.user?.name || req.user?.nombre || 'Usuario';

    const montoNum = parseFloat(monto);
    if (!monto || isNaN(montoNum) || montoNum <= 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'El monto debe ser un número mayor a cero' });
    }

    const METODOS_VALIDOS = ['efectivo', 'tarjeta'];
    if (!metodoPago || !METODOS_VALIDOS.includes(metodoPago)) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Método de pago inválido. Use efectivo o tarjeta' });
    }

    const [[rep]] = await connection.query(
      'SELECT id, estado, total, monto_anticipo, monto_pagado_adicional FROM reparaciones WHERE id = ?', [id]
    );
    if (!rep) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Reparación no encontrada' });
    }
    if (rep.estado === 'CANCELADA') {
      await connection.rollback();
      return res.status(409).json({ success: false, message: 'No se puede registrar pago en una reparación cancelada' });
    }

    const totalCentavos = rep.total || 0;
    const yaPageadoCentavos = (rep.monto_anticipo || 0) + (rep.monto_pagado_adicional || 0);
    const saldoPendienteCentavos = totalCentavos - yaPageadoCentavos;

    if (saldoPendienteCentavos <= 0) {
      await connection.rollback();
      return res.status(409).json({ success: false, message: 'Esta reparación ya está totalmente pagada' });
    }

    const montoCentavos = quetzalesACentavos(montoNum);
    if (montoCentavos > saldoPendienteCentavos) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `El monto excede el saldo pendiente de Q${centavosAQuetzales(saldoPendienteCentavos).toFixed(2)}`
      });
    }

    const nuevoMontoPagadoAdicional = (rep.monto_pagado_adicional || 0) + montoCentavos;
    await connection.query(
      'UPDATE reparaciones SET monto_pagado_adicional = ?, metodo_pago_adicional = ?, updated_by = ? WHERE id = ?',
      [nuevoMontoPagadoAdicional, metodoPago, usuario, id]
    );

    await connection.query(
      `INSERT INTO reparaciones_historial
        (reparacion_id, estado, nota, user_nombre, tipo_evento, estado_anterior, descripcion)
       VALUES (?, ?, ?, ?, 'PAGO_SALDO', NULL, ?)`,
      [
        id, rep.estado,
        `Pago de saldo registrado: Q${montoNum.toFixed(2)} (${metodoPago})`,
        usuario,
        `Pago de saldo Q${montoNum.toFixed(2)} en ${metodoPago}`
      ]
    );

    await connection.commit();

    const totalPagado = centavosAQuetzales((rep.monto_anticipo || 0) + nuevoMontoPagadoAdicional);
    const saldoRestante = centavosAQuetzales(totalCentavos - (rep.monto_anticipo || 0) - nuevoMontoPagadoAdicional);

    res.json({
      success: true,
      message: 'Pago registrado exitosamente',
      data: {
        totalPagado,
        saldoRestante,
        montoPagadoAdicional: centavosAQuetzales(nuevoMontoPagadoAdicional)
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error al registrar pago de saldo:', error);
    res.status(500).json({ success: false, message: 'Error al registrar el pago', error: error.message });
  } finally {
    connection.release();
  }
};

// ========== CANCELAR REPARACIÓN ==========
exports.cancelarReparacion = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;
    const { motivo } = req.body;
    const usuario = req.user?.username || req.user?.name || req.user?.nombre || 'Usuario';

    const motivoLimpio = String(motivo || '').trim();
    if (!motivoLimpio) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'El motivo de cancelación es requerido' });
    }

    const [[rep]] = await connection.query(
      'SELECT id, estado FROM reparaciones WHERE id = ?', [id]
    );
    if (!rep) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Reparación no encontrada' });
    }
    if (rep.estado === 'CANCELADA') {
      await connection.rollback();
      return res.status(409).json({ success: false, message: 'La reparación ya está cancelada' });
    }
    if (rep.estado === 'ENTREGADA') {
      await connection.rollback();
      return res.status(409).json({ success: false, message: 'No se puede cancelar una reparación ya entregada' });
    }

    const estadoAnterior = rep.estado;
    const fechaHoy = new Date().toISOString().split('T')[0];

    await connection.query(
      `UPDATE reparaciones
         SET estado = 'CANCELADA', fecha_cancelacion = ?, motivo_cancelacion = ?, updated_by = ?
       WHERE id = ?`,
      [fechaHoy, motivoLimpio, usuario, id]
    );

    await connection.query(
      `INSERT INTO reparaciones_historial
        (reparacion_id, estado, nota, user_nombre, tipo_evento, estado_anterior, descripcion)
       VALUES (?, 'CANCELADA', ?, ?, 'CANCELACION', ?, ?)`,
      [
        id,
        `Reparación cancelada. Motivo: ${motivoLimpio}`,
        usuario,
        estadoAnterior,
        `Cancelada desde estado ${estadoAnterior}. Motivo: ${motivoLimpio}`
      ]
    );

    await connection.commit();
    res.json({ success: true, message: 'Reparación cancelada exitosamente' });
  } catch (error) {
    await connection.rollback();
    console.error('Error al cancelar reparación:', error);
    res.status(500).json({ success: false, message: 'Error al cancelar la reparación', error: error.message });
  } finally {
    connection.release();
  }
};
