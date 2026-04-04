const pool = require('../config/database');

exports.getDashboardStats = async (req, res) => {
  try {
    const connection = await pool.getConnection();

    // Obtener ventas del día
    const [ventasHoy] = await connection.query(`
      SELECT 
        COUNT(*) as cantidad,
        COALESCE(SUM(total), 0) as total
      FROM ventas
      WHERE DATE(created_at) = CURDATE()
      AND estado IN ('PAGADA', 'PARCIAL')
    `);

    // Obtener ventas del mes
    const [ventasMes] = await connection.query(`
      SELECT 
        COALESCE(SUM(total), 0) as total
      FROM ventas
      WHERE MONTH(created_at) = MONTH(CURDATE())
      AND YEAR(created_at) = YEAR(CURDATE())
      AND estado IN ('PAGADA', 'PARCIAL')
    `);

    // Obtener total de ventas
    const [ventasTotal] = await connection.query(`
      SELECT 
        COALESCE(SUM(total), 0) as total
      FROM ventas
      WHERE estado IN ('PAGADA', 'PARCIAL')
    `);

    // Obtener productos
    const [productos] = await connection.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN cantidad > 0 AND cantidad <= stock_minimo THEN 1 ELSE 0 END) as bajo_stock,
        SUM(CASE WHEN cantidad = 0 THEN 1 ELSE 0 END) as sin_stock
      FROM productos
    `);

    // Obtener reparaciones
    const [reparaciones] = await connection.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN tiene_checklist = 1 THEN 1 ELSE 0 END) as con_checklist,
        SUM(CASE WHEN tiene_checklist = 0 OR tiene_checklist IS NULL THEN 1 ELSE 0 END) as sin_checklist,
        SUM(CASE WHEN estado = 'COMPLETADA' THEN 1 ELSE 0 END) as completadas
      FROM reparaciones
      WHERE estado NOT IN ('ENTREGADA', 'CANCELADA')
    `);

    // Obtener cotizaciones
    const [cotizaciones] = await connection.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN estado = 'PENDIENTE' THEN 1 ELSE 0 END) as abiertas
      FROM cotizaciones
    `);

    // Obtener gastos del mes (desde compras)
    const [gastosMes] = await connection.query(`
      SELECT 
        COALESCE(SUM(total), 0) as total
      FROM compras
      WHERE MONTH(fecha) = MONTH(CURDATE())
      AND YEAR(fecha) = YEAR(CURDATE())
      AND estado = 'COMPLETADA'
    `);

    // Calcular ganancias (ventas - gastos) del día
    const [ventasDiaDetalle] = await connection.query(`
      SELECT 
        COALESCE(SUM(total), 0) as total
      FROM ventas
      WHERE DATE(created_at) = CURDATE()
      AND estado IN ('PAGADA', 'PARCIAL')
    `);

    const [gastosDia] = await connection.query(`
      SELECT 
        COALESCE(SUM(total), 0) as total
      FROM compras
      WHERE DATE(fecha) = CURDATE()
      AND estado = 'COMPLETADA'
    `);

    connection.release();

    // Convertir de centavos a quetzales
    const stats = {
      ventas: {
        hoy: Math.round(ventasHoy[0].total /100),
        mes: Math.round(ventasMes[0].total / 100),
        total: Math.round(ventasTotal[0].total / 100),
        cantidad: ventasHoy[0].cantidad
      },
      productos: {
        total: productos[0].total || 0,
        bajo_stock: productos[0].bajo_stock || 0,
        sin_stock: productos[0].sin_stock || 0
      },
      reparaciones: {
        total: reparaciones[0].total || 0,
        con_checklist: reparaciones[0].con_checklist || 0,
        sin_checklist: reparaciones[0].sin_checklist || 0,
        completadas: reparaciones[0].completadas || 0
      },
      cotizaciones: {
        total: cotizaciones[0].total || 0,
        abiertas: cotizaciones[0].abiertas || 0
      },
      gastos: {
        mes: Math.round(gastosMes[0].total / 100)
      },
      ganancias: {
        hoy: Math.round((ventasDiaDetalle[0].total - gastosDia[0].total) / 100),
        mes: Math.round((ventasMes[0].total - gastosMes[0].total) / 100)
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Error loading dashboard stats:', error);
    res.status(500).json({ 
      error: 'Error al cargar estadísticas del dashboard',
      details: error.message 
    });
  }
};
