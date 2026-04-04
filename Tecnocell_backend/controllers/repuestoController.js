const db = require('../config/database');

/**
 * Crear un nuevo repuesto
 * POST /api/repuestos
 */
exports.createRepuesto = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const {
      codigo, nombre, tipo, marca, linea, modelo, compatibilidad, condicion,
      color, notas, precio_publico, precio_costo, proveedor,
      stock, stock_minimo, imagenes, tags, activo
    } = req.body;

    // Validaciones básicas
    if (!nombre || !tipo || !marca) {
      await connection.rollback();
      return res.status(400).json({ 
        error: 'Nombre, tipo y marca son requeridos' 
      });
    }

    // Generar SKU automático SIEMPRE (no permitir manual)
    // Formato: TIPO_MARCA_MODELO_TIMESTAMP
    // Ejemplo: PAN_APPL_IP12_123456 (Pantalla Apple iPhone 12)
    
    const tipoAbrev = tipo.substring(0, 3).toUpperCase(); // PAN, BAT, CAM, etc.
    const marcaAbrev = marca.substring(0, 4).toUpperCase(); // APPL, SAMS, XIAO, etc.
    const modeloAbrev = modelo ? modelo.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '') : 'GEN';
    const timestamp = Date.now().toString().slice(-6);
    
    const skuFinal = `${tipoAbrev}_${marcaAbrev}_${modeloAbrev}_${timestamp}`;
    const skuGenerado = true;
    
    console.log('✅ SKU de repuesto generado automáticamente:', skuFinal);

    // Convertir arrays a JSON strings para MySQL
    const compatibilidadJSON = compatibilidad ? JSON.stringify(compatibilidad) : null;
    const imagenesJSON = imagenes ? JSON.stringify(imagenes) : '[]';
    const tagsJSON = tags ? JSON.stringify(tags) : '[]';

    const query = `
      INSERT INTO repuestos (
        sku, codigo, nombre, tipo, marca, linea, modelo, compatibilidad, condicion,
        color, notas, precio_publico, precio_costo, proveedor,
        stock, stock_minimo, imagenes, tags, activo, sku_generado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await connection.query(query, [
      skuFinal, codigo || null, nombre, tipo, marca, linea || null, modelo || null, 
      compatibilidadJSON, condicion, color || null, notas || null, 
      precio_publico || 0, precio_costo || 0, proveedor || null,
      stock || 0, stock_minimo || 1, imagenesJSON, tagsJSON, activo !== false, skuGenerado
    ]);

    // Obtener el repuesto recién creado
    const [newRepuesto] = await connection.query(
      'SELECT * FROM repuestos WHERE id = ?',
      [result.insertId]
    );

    await connection.commit();

    // Parsear JSON fields
    const repuesto = parseRepuestoJSON(newRepuesto[0]);

    res.status(201).json(repuesto);
  } catch (error) {
    await connection.rollback();
    console.error('Error al crear repuesto:', error);
    res.status(500).json({ 
      error: 'Error al crear el repuesto',
      details: error.message 
    });
  } finally {
    connection.release();
  }
};

/**
 * Obtener todos los repuestos con filtros opcionales
 * GET /api/repuestos
 * Query params: tipo, marca, linea, activo, soloConStock, precioMin, precioMax, searchTerm, page, limit
 */
exports.getAllRepuestos = async (req, res) => {
  try {
    const {
      tipo, marca, linea, activo, soloConStock,
      precioMin, precioMax, searchTerm,
      page = 1, limit = 100
    } = req.query;

    let query = 'SELECT * FROM repuestos WHERE 1=1';
    const params = [];

    // Filtros
    if (tipo) {
      query += ' AND tipo = ?';
      params.push(tipo);
    }

    if (marca) {
      query += ' AND marca = ?';
      params.push(marca);
    }

    if (linea) {
      query += ' AND linea = ?';
      params.push(linea);
    }

    if (activo !== undefined) {
      query += ' AND activo = ?';
      params.push(activo === 'true' || activo === true ? 1 : 0);
    }

    if (soloConStock === 'true') {
      query += ' AND stock > 0';
    }

    if (precioMin) {
      query += ' AND precio_publico >= ?';
      params.push(parseInt(precioMin));
    }

    if (precioMax) {
      query += ' AND precio_publico <= ?';
      params.push(parseInt(precioMax));
    }

    if (searchTerm) {
      query += ' AND (nombre LIKE ? OR modelo LIKE ? OR linea LIKE ? OR sku LIKE ? OR codigo LIKE ?)';
      const searchPattern = `%${searchTerm}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // Ordenamiento y paginación
    query += ' ORDER BY created_at DESC';
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [repuestos] = await db.query(query, params);

    // Parsear JSON fields para cada repuesto
    const repuestosParsed = repuestos.map(parseRepuestoJSON);

    res.json(repuestosParsed);
  } catch (error) {
    console.error('Error al obtener repuestos:', error);
    res.status(500).json({ 
      error: 'Error al obtener repuestos',
      details: error.message 
    });
  }
};

/**
 * Obtener un repuesto por ID
 * GET /api/repuestos/:id
 */
exports.getRepuestoById = async (req, res) => {
  try {
    const { id } = req.params;

    const [repuestos] = await db.query(
      'SELECT * FROM repuestos WHERE id = ?',
      [id]
    );

    if (repuestos.length === 0) {
      return res.status(404).json({ error: 'Repuesto no encontrado' });
    }

    const repuesto = parseRepuestoJSON(repuestos[0]);
    res.json(repuesto);
  } catch (error) {
    console.error('Error al obtener repuesto:', error);
    res.status(500).json({ 
      error: 'Error al obtener el repuesto',
      details: error.message 
    });
  }
};

/**
 * Actualizar un repuesto
 * PUT /api/repuestos/:id
 */
exports.updateRepuesto = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log('=== UPDATE REPUESTO ===');
    console.log('ID:', id);
    console.log('Body recibido:', JSON.stringify(updateData, null, 2));

    // Verificar que existe
    const [existing] = await db.query('SELECT * FROM repuestos WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Repuesto no encontrado' });
    }

    console.log('Repuesto existente encontrado:', existing[0].nombre);

    // Construir query dinámicamente solo con los campos que vienen en el body
    const updates = [];
    const values = [];

    // Solo actualizar campos que están presentes en el body
    if (updateData.nombre !== undefined) {
      updates.push('nombre = ?');
      values.push(updateData.nombre);
    }
    if (updateData.tipo !== undefined) {
      updates.push('tipo = ?');
      values.push(updateData.tipo);
    }
    if (updateData.marca !== undefined) {
      updates.push('marca = ?');
      values.push(updateData.marca);
    }
    if (updateData.linea !== undefined) {
      updates.push('linea = ?');
      values.push(updateData.linea || null);
    }
    if (updateData.modelo !== undefined) {
      updates.push('modelo = ?');
      values.push(updateData.modelo || null);
    }
    if (updateData.compatibilidad !== undefined) {
      updates.push('compatibilidad = ?');
      values.push(JSON.stringify(updateData.compatibilidad));
    }
    if (updateData.condicion !== undefined) {
      updates.push('condicion = ?');
      values.push(updateData.condicion);
    }
    if (updateData.color !== undefined) {
      updates.push('color = ?');
      values.push(updateData.color || null);
    }
    if (updateData.notas !== undefined) {
      updates.push('notas = ?');
      values.push(updateData.notas || null);
    }
    if (updateData.precio_publico !== undefined) {
      updates.push('precio_publico = ?');
      values.push(updateData.precio_publico);
    }
    if (updateData.precio_costo !== undefined) {
      updates.push('precio_costo = ?');
      values.push(updateData.precio_costo);
    }
    if (updateData.proveedor !== undefined) {
      updates.push('proveedor = ?');
      values.push(updateData.proveedor || null);
    }
    if (updateData.stock !== undefined) {
      updates.push('stock = ?');
      values.push(updateData.stock);
    }
    if (updateData.stock_minimo !== undefined) {
      updates.push('stock_minimo = ?');
      values.push(updateData.stock_minimo);
    }
    if (updateData.imagenes !== undefined) {
      updates.push('imagenes = ?');
      values.push(JSON.stringify(updateData.imagenes));
    }
    if (updateData.tags !== undefined) {
      updates.push('tags = ?');
      values.push(JSON.stringify(updateData.tags));
    }
    if (updateData.activo !== undefined) {
      updates.push('activo = ?');
      values.push(updateData.activo ? 1 : 0);
    }

    // Si no hay campos para actualizar, devolver error
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    // Agregar el ID al final
    values.push(id);

    const query = `UPDATE repuestos SET ${updates.join(', ')} WHERE id = ?`;

    console.log('Query a ejecutar:', query);
    console.log('Valores:', values);
    console.log('Número de campos a actualizar:', updates.length);

    await db.query(query, values);

    // Obtener repuesto actualizado
    const [updated] = await db.query('SELECT * FROM repuestos WHERE id = ?', [id]);
    const repuesto = parseRepuestoJSON(updated[0]);

    console.log('Repuesto actualizado exitosamente');
    console.log('======================\n');

    res.json(repuesto);
  } catch (error) {
    console.error('Error al actualizar repuesto:', error);
    res.status(500).json({ 
      error: 'Error al actualizar el repuesto',
      details: error.message 
    });
  }
};

/**
 * Eliminar un repuesto
 * DELETE /api/repuestos/:id
 */
exports.deleteRepuesto = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query('DELETE FROM repuestos WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Repuesto no encontrado' });
    }

    res.json({ message: 'Repuesto eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar repuesto:', error);
    res.status(500).json({ 
      error: 'Error al eliminar el repuesto',
      details: error.message 
    });
  }
};

/**
 * Obtener repuestos con stock bajo
 * GET /api/repuestos/stock-bajo
 */
exports.getStockBajo = async (req, res) => {
  try {
    const [repuestos] = await db.query('SELECT * FROM v_repuestos_stock_bajo');
    res.json(repuestos);
  } catch (error) {
    console.error('Error al obtener repuestos con stock bajo:', error);
    res.status(500).json({ 
      error: 'Error al obtener repuestos con stock bajo',
      details: error.message 
    });
  }
};

/**
 * Obtener estadísticas de repuestos
 * GET /api/repuestos/estadisticas
 */
exports.getEstadisticas = async (req, res) => {
  try {
    const [estadisticas] = await db.query('SELECT * FROM v_estadisticas_repuestos');
    
    // Obtener totales generales
    const [totales] = await db.query(`
      SELECT 
        COUNT(*) as total_repuestos,
        SUM(stock) as stock_total,
        SUM(precio_costo * stock) / 100 as valor_total_costo,
        SUM(precio_publico * stock) / 100 as valor_total_publico
      FROM repuestos
      WHERE activo = TRUE
    `);

    res.json({
      por_tipo_marca: estadisticas,
      totales: totales[0]
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ 
      error: 'Error al obtener estadísticas',
      details: error.message 
    });
  }
};

/**
 * Registrar movimiento de stock
 * POST /api/repuestos/:id/movimiento
 */
exports.registrarMovimiento = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      tipo_movimiento, cantidad, precio_unitario,
      referencia_tipo, referencia_id, usuario_id, notas
    } = req.body;

    if (!tipo_movimiento || !cantidad) {
      return res.status(400).json({ 
        error: 'Tipo de movimiento y cantidad son requeridos' 
      });
    }

    const query = `
      CALL sp_registrar_movimiento_repuesto(?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.query(query, [
      id, tipo_movimiento, cantidad, precio_unitario || 0,
      referencia_tipo || 'AJUSTE_MANUAL', referencia_id || null,
      usuario_id || null, notas || null
    ]);

    res.json({ 
      message: 'Movimiento registrado exitosamente',
      resultado: result[0][0]
    });
  } catch (error) {
    console.error('Error al registrar movimiento:', error);
    res.status(500).json({ 
      error: 'Error al registrar movimiento',
      details: error.message 
    });
  }
};

/**
 * Helper: Parsear campos JSON de un repuesto
 */
function parseRepuestoJSON(repuesto) {
  if (!repuesto) return null;
  
  return {
    ...repuesto,
    compatibilidad: repuesto.compatibilidad 
      ? (typeof repuesto.compatibilidad === 'string' 
          ? JSON.parse(repuesto.compatibilidad) 
          : repuesto.compatibilidad)
      : [],
    imagenes: repuesto.imagenes 
      ? (typeof repuesto.imagenes === 'string' 
          ? JSON.parse(repuesto.imagenes) 
          : repuesto.imagenes)
      : [],
    tags: repuesto.tags 
      ? (typeof repuesto.tags === 'string' 
          ? JSON.parse(repuesto.tags) 
          : repuesto.tags)
      : [],
    activo: repuesto.activo === 1 || repuesto.activo === true
  };
}
