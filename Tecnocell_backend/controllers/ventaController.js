const db = require('../config/database');
const cajaController = require('./cajaController');

/**
 * Crear una nueva venta
 * POST /api/ventas
 */
exports.createVenta = async (req, res) => {
  try {
    const {
      cliente_id, cliente_nombre, cliente_telefono, cliente_email,
      cliente_nit, cliente_direccion, cotizacion_id, numero_cotizacion,
      tipo_venta, items, subtotal, impuestos, descuento, total,
      metodo_pago, pagos, monto_pagado, observaciones, notas_internas,
      created_by, interes_tarjeta
    } = req.body;

    // Validaciones básicas
    if (!cliente_id || !cliente_nombre) {
      return res.status(400).json({ error: 'Cliente es requerido' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'La venta debe tener al menos un item' });
    }

    if (!total || total <= 0) {
      return res.status(400).json({ error: 'El total debe ser mayor a 0' });
    }

    // Convertir items a JSON
    const itemsJSON = JSON.stringify(items);
    const pagosJSON = pagos ? JSON.stringify(pagos) : null;

    const query = `
      INSERT INTO ventas (
        cliente_id, cliente_nombre, cliente_telefono, cliente_email,
        cliente_nit, cliente_direccion, cotizacion_id, numero_cotizacion,
        tipo_venta, items, subtotal, impuestos, descuento, interes_tarjeta, total,
        metodo_pago, pagos, monto_pagado, observaciones, notas_internas,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.query(query, [
      cliente_id, cliente_nombre, cliente_telefono || null, cliente_email || null,
      cliente_nit || null, cliente_direccion || null, cotizacion_id || null, numero_cotizacion || null,
      tipo_venta || 'PRODUCTOS', itemsJSON, subtotal || 0, impuestos || 0, descuento || 0, 
      interes_tarjeta || 0, total,
      metodo_pago || null, pagosJSON, monto_pagado || 0, observaciones || null, notas_internas || null,
      created_by || null
    ]);

    // Descontar stock del inventario
    await descontarStock(items);

    // Obtener la venta recién creada
    const [newVenta] = await db.query('SELECT * FROM ventas WHERE id = ?', [result.insertId]);
    const venta = parseVentaJSON(newVenta[0]);

    // Registrar movimiento en caja chica o bancos
    if (metodo_pago && total > 0) {
      try {
        // Si hay múltiples pagos, procesarlos todos
        if (pagos && Array.isArray(pagos)) {
          for (const pago of pagos) {
            await cajaController.registrarMovimientoVenta(
              venta.numero_venta || `V-${result.insertId}`,
              pago.metodo,
              pago.monto, // Ya viene en centavos desde el frontend
              created_by || 'Sistema',
              null, // connection
              pago.pos_seleccionado || null,
              pago.banco_id || null,
              pago.referencia || null
            );
          }
        } else {
          // Pago único
          await cajaController.registrarMovimientoVenta(
            venta.numero_venta || `V-${result.insertId}`,
            metodo_pago,
            total,
            created_by || 'Sistema'
          );
        }
      } catch (error) {
        console.error('Error al registrar movimiento en caja/bancos:', error);
        // No fallar la venta si hay error en el registro de caja
      }
    }

    res.status(201).json(venta);
  } catch (error) {
    console.error('Error al crear venta:', error);
    res.status(500).json({ 
      error: 'Error al crear la venta',
      details: error.message 
    });
  }
};

/**
 * Convertir cotización a venta
 * POST /api/ventas/from-quote/:cotizacionId
 */
exports.createVentaFromQuote = async (req, res) => {
  try {
    const { cotizacionId } = req.params;
    const { pagos, metodo_pago, observaciones, created_by } = req.body;

    // Obtener cotización
    const [cotizaciones] = await db.query(
      'SELECT * FROM cotizaciones WHERE id = ?',
      [cotizacionId]
    );

    if (cotizaciones.length === 0) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    const cotizacion = cotizaciones[0];

    // Verificar que no esté ya convertida usando la columna convertida
    if (cotizacion.convertida === 1) {
      return res.status(400).json({ error: 'Esta cotización ya fue convertida a venta' });
    }

    // Determinar tipo de venta según items
    const items = typeof cotizacion.items === 'string' 
      ? JSON.parse(cotizacion.items) 
      : cotizacion.items;
    
    const hasProductos = items.some(item => item.source === 'PRODUCTO');
    const hasRepuestos = items.some(item => item.source === 'REPUESTO');
    
    let tipo_venta = 'PRODUCTOS';
    if (hasProductos && hasRepuestos) {
      tipo_venta = 'MIXTA';
    } else if (hasRepuestos && !hasProductos) {
      tipo_venta = 'REPUESTOS';
    }

    // Convertir montos a centavos
    const subtotalCentavos = Math.round(parseFloat(cotizacion.subtotal) * 100);
    const impuestosCentavos = Math.round(parseFloat(cotizacion.impuestos || 0) * 100);
    const totalCentavos = Math.round(parseFloat(cotizacion.total) * 100);
    
    // Calcular monto pagado desde el array de pagos (ya viene en centavos)
    const montoPagadoCentavos = pagos 
      ? pagos.reduce((sum, pago) => sum + (pago.monto || 0), 0)
      : 0;

    // Crear venta
    const pagosJSON = pagos ? JSON.stringify(pagos) : null;
    const itemsJSON = JSON.stringify(items);

    const query = `
      INSERT INTO ventas (
        cliente_id, cliente_nombre, cliente_telefono, cliente_email,
        cliente_nit, cliente_direccion, cotizacion_id, numero_cotizacion,
        tipo_venta, items, subtotal, impuestos, descuento, total,
        metodo_pago, pagos, monto_pagado, observaciones, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.query(query, [
      cotizacion.cliente_id,
      cotizacion.cliente_nombre,
      cotizacion.cliente_telefono,
      cotizacion.cliente_email,
      cotizacion.cliente_nit,
      cotizacion.cliente_direccion,
      cotizacionId,
      cotizacion.numero_cotizacion,
      tipo_venta,
      itemsJSON,
      subtotalCentavos,
      impuestosCentavos,
      0, // descuento
      totalCentavos,
      metodo_pago || null,
      pagosJSON,
      montoPagadoCentavos,
      observaciones || cotizacion.observaciones,
      created_by || null
    ]);

    // Descontar stock del inventario
    await descontarStock(items);

    // Obtener la venta recién creada
    const [newVenta] = await db.query('SELECT * FROM ventas WHERE id = ?', [result.insertId]);
    const venta = parseVentaJSON(newVenta[0]);

    // Registrar movimiento en caja chica o bancos
    if (metodo_pago && totalCentavos > 0) {
      try {
        // Si hay múltiples pagos, procesarlos todos
        if (pagos && Array.isArray(pagos)) {
          for (const pago of pagos) {
            await cajaController.registrarMovimientoVenta(
              venta.numero_venta || `V-${result.insertId}`,
              pago.metodo,
              pago.monto,
              created_by || 'Sistema',
              null,
              pago.pos_seleccionado || null,
              pago.banco_id || null,
              pago.referencia || null
            );
          }
        } else {
          // Pago único
          await cajaController.registrarMovimientoVenta(
            venta.numero_venta || `V-${result.insertId}`,
            metodo_pago,
            totalCentavos,
            created_by || 'Sistema'
          );
        }
      } catch (error) {
        console.error('Error al registrar movimiento en caja/bancos:', error);
      }
    }

    res.status(201).json(venta);
  } catch (error) {
    console.error('Error al convertir cotización a venta:', error);
    res.status(500).json({ 
      error: 'Error al convertir cotización a venta',
      details: error.message 
    });
  }
};

/**
 * Obtener todas las ventas con filtros
 * GET /api/ventas
 */
exports.getAllVentas = async (req, res) => {
  try {
    const {
      estado, tipo_venta, cliente_id, fecha_desde, fecha_hasta,
      page = 1, limit = 1000 // Aumentar límite por defecto
    } = req.query;

    let query = 'SELECT * FROM ventas WHERE 1=1';
    const params = [];

    // Filtros
    if (estado) {
      query += ' AND estado = ?';
      params.push(estado);
    }

    if (tipo_venta) {
      query += ' AND tipo_venta = ?';
      params.push(tipo_venta);
    }

    if (cliente_id) {
      query += ' AND cliente_id = ?';
      params.push(cliente_id);
    }

    if (fecha_desde) {
      query += ' AND DATE(COALESCE(fecha_venta, created_at)) >= ?';
      params.push(fecha_desde);
    }

    if (fecha_hasta) {
      query += ' AND DATE(COALESCE(fecha_venta, created_at)) <= ?';
      params.push(fecha_hasta);
    }

    // Ordenar por fecha más reciente (usar created_at si fecha_venta es NULL)
    query += ' ORDER BY COALESCE(fecha_venta, created_at) DESC';

    // Paginación
    const offset = (page - 1) * limit;
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [ventas] = await db.query(query, params);
    const ventasParsed = ventas.map(parseVentaJSON);

    res.json(ventasParsed);
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    res.status(500).json({ 
      error: 'Error al obtener ventas',
      details: error.message 
    });
  }
};

/**
 * Obtener una venta por ID
 * GET /api/ventas/:id
 */
exports.getVentaById = async (req, res) => {
  try {
    const { id } = req.params;

    const [ventas] = await db.query('SELECT * FROM ventas WHERE id = ?', [id]);

    if (ventas.length === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    const venta = parseVentaJSON(ventas[0]);
    res.json(venta);
  } catch (error) {
    console.error('Error al obtener venta:', error);
    res.status(500).json({ 
      error: 'Error al obtener venta',
      details: error.message 
    });
  }
};

/**
 * Registrar pago en una venta
 * POST /api/ventas/:id/pagos
 */
exports.registrarPago = async (req, res) => {
  try {
    const { id } = req.params;
    const { monto, metodo, referencia, comprobanteUrl, usuario_id } = req.body;

    if (!monto || monto <= 0) {
      return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
    }

    if (!metodo) {
      return res.status(400).json({ error: 'El método de pago es requerido' });
    }

    // Convertir monto a centavos
    const montoCentavos = Math.round(parseFloat(monto) * 100);

    // Llamar al stored procedure
    await db.query(
      'CALL sp_registrar_pago_venta(?, ?, ?, ?, ?, ?)',
      [id, montoCentavos, metodo, referencia || null, comprobanteUrl || null, usuario_id || null]
    );

    // Obtener venta actualizada
    const [ventas] = await db.query('SELECT * FROM ventas WHERE id = ?', [id]);
    const venta = parseVentaJSON(ventas[0]);

    res.json(venta);
  } catch (error) {
    console.error('Error al registrar pago:', error);
    res.status(500).json({ 
      error: 'Error al registrar pago',
      details: error.message 
    });
  }
};

/**
 * Anular una venta
 * POST /api/ventas/:id/anular
 */
exports.anularVenta = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo, usuario_id } = req.body;

    if (!motivo) {
      return res.status(400).json({ error: 'El motivo de anulación es requerido' });
    }

    // Llamar al stored procedure
    await db.query(
      'CALL sp_anular_venta(?, ?, ?)',
      [id, motivo, usuario_id || null]
    );

    // Obtener venta actualizada
    const [ventas] = await db.query('SELECT * FROM ventas WHERE id = ?', [id]);
    const venta = parseVentaJSON(ventas[0]);

    res.json(venta);
  } catch (error) {
    console.error('Error al anular venta:', error);
    res.status(500).json({ 
      error: 'Error al anular venta',
      details: error.message 
    });
  }
};

/**
 * Obtener estadísticas de ventas
 * GET /api/ventas/estadisticas
 */
exports.getEstadisticas = async (req, res) => {
  try {
    const [stats] = await db.query('SELECT * FROM v_estadisticas_ventas');
    res.json(stats[0] || {});
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ 
      error: 'Error al obtener estadísticas',
      details: error.message 
    });
  }
};

/**
 * Helper: Descontar stock del inventario
 */
async function descontarStock(items) {
  try {
    for (const item of items) {
      if (item.source === 'PRODUCTO') {
        // Descontar de productos
        await db.query(
          'UPDATE productos SET stock = stock - ? WHERE id = ?',
          [item.cantidad, item.refId || item.ref_id]
        );
        console.log(`Stock descontado: Producto ${item.refId}, cantidad: ${item.cantidad}`);
      } else if (item.source === 'REPUESTO') {
        // Descontar de repuestos
        await db.query(
          'UPDATE repuestos SET stock_actual = stock_actual - ? WHERE id = ?',
          [item.cantidad, item.refId || item.ref_id]
        );
        console.log(`Stock descontado: Repuesto ${item.refId}, cantidad: ${item.cantidad}`);
      }
    }
  } catch (error) {
    console.error('Error al descontar stock:', error);
    throw error; // Propagar error para que la transacción falle
  }
}

/**
 * Helper: Parsear campos JSON de una venta
 */
function parseVentaJSON(venta) {
  if (!venta) return null;

  // Parsear items y normalizar estructura
  let items = [];
  if (venta.items) {
    const parsedItems = typeof venta.items === 'string' ? JSON.parse(venta.items) : venta.items;
    items = parsedItems.map(item => {
      // Normalizar nombres de campos (soportar variaciones)
      const precioUnit = item.precioUnit || item.precio || item.precioUnitario || 0;
      const subtotal = item.subtotal || (item.cantidad * precioUnit) || 0;
      
      return {
        id: item.id,
        source: item.source,
        refId: item.refId,
        nombre: item.nombre,
        cantidad: item.cantidad,
        precioUnit: precioUnit,
        subtotal: subtotal,
        notas: item.notas
      };
    });
  }

  // Parsear pagos
  let pagos = [];
  if (venta.pagos) {
    pagos = typeof venta.pagos === 'string' ? JSON.parse(venta.pagos) : venta.pagos;
  }

  return {
    ...venta,
    items: items,
    pagos: pagos
  };
}

module.exports = exports;
