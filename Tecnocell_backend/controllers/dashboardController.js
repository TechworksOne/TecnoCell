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
        SUM(CASE WHEN stock > 0 AND stock <= stock_minimo THEN 1 ELSE 0 END) as bajo_stock,
        SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as sin_stock
      FROM productos
    `);

    // Obtener reparaciones
    const [reparaciones] = await connection.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN r.id IN (SELECT DISTINCT reparacion_id FROM check_equipo) THEN 1 ELSE 0 END) as con_checklist,
        SUM(CASE WHEN r.id NOT IN (SELECT DISTINCT reparacion_id FROM check_equipo) THEN 1 ELSE 0 END) as sin_checklist,
        SUM(CASE WHEN estado = 'COMPLETADA' THEN 1 ELSE 0 END) as completadas
      FROM reparaciones r
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
      WHERE MONTH(fecha_compra) = MONTH(CURDATE())
      AND YEAR(fecha_compra) = YEAR(CURDATE())
      AND estado IN ('CONFIRMADA', 'RECIBIDA')
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
      WHERE DATE(fecha_compra) = CURDATE()
      AND estado IN ('CONFIRMADA', 'RECIBIDA')
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

// ═══════════════════════════════════════════════════════════════════════════
// Dashboard técnico — estadísticas filtradas por técnico autenticado
// ═══════════════════════════════════════════════════════════════════════════
exports.getTecnicoDashboardStats = async (req, res) => {
  try {
    const connection = await pool.getConnection();

    // Obtener el nombre del técnico desde la tabla users usando su id del JWT
    const [userRows] = await connection.query(
      'SELECT name FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!userRows.length) {
      connection.release();
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const tecnicoNombre = userRows[0].name;

    // 1. Total asignadas (activas)
    const [[totalAsignadas]] = await connection.query(`
      SELECT COUNT(*) AS total FROM reparaciones
      WHERE tecnico_asignado = ?
        AND estado NOT IN ('ENTREGADA', 'CANCELADA')
    `, [tecnicoNombre]);

    // 2. En proceso
    const [[enProceso]] = await connection.query(`
      SELECT COUNT(*) AS total FROM reparaciones
      WHERE tecnico_asignado = ?
        AND estado IN ('EN_DIAGNOSTICO','EN_REPARACION','EN_PROCESO',
                       'AUTORIZADA','ESPERANDO_AUTORIZACION','STAND_BY','ESPERANDO_PIEZA')
    `, [tecnicoNombre]);

    // 3. Pendientes (recibidas pero sin iniciar trabajo)
    const [[pendientes]] = await connection.query(`
      SELECT COUNT(*) AS total FROM reparaciones
      WHERE tecnico_asignado = ?
        AND estado IN ('RECIBIDA','ANTICIPO_REGISTRADO')
    `, [tecnicoNombre]);

    // 4. Listas para entregar
    const [[listas]] = await connection.query(`
      SELECT COUNT(*) AS total FROM reparaciones
      WHERE tecnico_asignado = ? AND estado = 'COMPLETADA'
    `, [tecnicoNombre]);

    // 5. Atrasadas (fecha_estimada_entrega pasó y aún no cerrada)
    const [[atrasadas]] = await connection.query(`
      SELECT COUNT(*) AS total FROM reparaciones
      WHERE tecnico_asignado = ?
        AND estado NOT IN ('COMPLETADA','ENTREGADA','CANCELADA')
        AND fecha_estimada_entrega IS NOT NULL
        AND fecha_estimada_entrega < CURDATE()
    `, [tecnicoNombre]);

    // 6. Sin checklist (activas sin entrada en check_equipo)
    const [[sinChecklist]] = await connection.query(`
      SELECT COUNT(*) AS total FROM reparaciones r
      WHERE r.tecnico_asignado = ?
        AND r.estado NOT IN ('ENTREGADA','CANCELADA')
        AND r.id NOT IN (SELECT DISTINCT reparacion_id FROM check_equipo)
    `, [tecnicoNombre]);

    // 7. Finalizadas hoy
    const [[finalizadasHoy]] = await connection.query(`
      SELECT COUNT(*) AS total FROM reparaciones
      WHERE tecnico_asignado = ?
        AND estado IN ('COMPLETADA','ENTREGADA')
        AND DATE(COALESCE(fecha_cierre, updated_at)) = CURDATE()
    `, [tecnicoNombre]);

    // 8. Finalizadas este mes
    const [[finalizadasMes]] = await connection.query(`
      SELECT COUNT(*) AS total FROM reparaciones
      WHERE tecnico_asignado = ?
        AND estado IN ('COMPLETADA','ENTREGADA')
        AND MONTH(COALESCE(fecha_cierre, updated_at)) = MONTH(CURDATE())
        AND YEAR(COALESCE(fecha_cierre, updated_at))  = YEAR(CURDATE())
    `, [tecnicoNombre]);

    // 9. Repuestos/ítems usados este mes
    const [[repuestosUsados]] = await connection.query(`
      SELECT COALESCE(SUM(ri.cantidad), 0) AS total
      FROM reparaciones_items ri
      JOIN reparaciones r ON r.id = ri.reparacion_id
      WHERE r.tecnico_asignado = ?
        AND MONTH(r.fecha_ingreso) = MONTH(CURDATE())
        AND YEAR(r.fecha_ingreso)  = YEAR(CURDATE())
    `, [tecnicoNombre]);

    // 10. Conteo por estado
    const [estadosBD] = await connection.query(`
      SELECT estado, COUNT(*) AS total
      FROM reparaciones
      WHERE tecnico_asignado = ? AND estado NOT IN ('ENTREGADA','CANCELADA')
      GROUP BY estado
    `, [tecnicoNombre]);

    // 11. Lista de reparaciones activas (hasta 10, priorizando ALTA)
    const [reparacionesActivas] = await connection.query(`
      SELECT id, cliente_nombre, tipo_equipo, marca, modelo,
             estado, prioridad, fecha_ingreso, fecha_estimada_entrega, observaciones
      FROM reparaciones
      WHERE tecnico_asignado = ? AND estado NOT IN ('ENTREGADA','CANCELADA')
      ORDER BY
        CASE prioridad WHEN 'ALTA' THEN 1 WHEN 'MEDIA' THEN 2 ELSE 3 END,
        created_at DESC
      LIMIT 10
    `, [tecnicoNombre]);

    // 12. Actividad reciente (últimos 8 eventos del historial de sus reparaciones)
    const [actividadReciente] = await connection.query(`
      SELECT h.reparacion_id, h.estado, h.nota, h.user_nombre, h.created_at,
             r.cliente_nombre, r.tipo_equipo, r.marca, r.modelo
      FROM reparaciones_historial h
      JOIN reparaciones r ON r.id = h.reparacion_id
      WHERE r.tecnico_asignado = ?
      ORDER BY h.created_at DESC
      LIMIT 8
    `, [tecnicoNombre]);

    connection.release();

    // Convertir listado de estados a objeto
    const estados = {};
    estadosBD.forEach(row => { estados[row.estado] = row.total; });

    res.json({
      tecnico: tecnicoNombre,
      stats: {
        asignadas:            totalAsignadas.total  || 0,
        en_proceso:           enProceso.total        || 0,
        pendientes:           pendientes.total        || 0,
        listas_para_entregar: listas.total            || 0,
        atrasadas:            atrasadas.total         || 0,
        sin_checklist:        sinChecklist.total      || 0,
        finalizadas_hoy:      finalizadasHoy.total    || 0,
        finalizadas_mes:      finalizadasMes.total    || 0,
        repuestos_usados_mes: repuestosUsados.total   || 0,
      },
      estados,
      reparaciones: reparacionesActivas,
      actividad:    actividadReciente,
    });
  } catch (error) {
    console.error('Error loading tecnico dashboard stats:', error);
    res.status(500).json({
      error: 'Error al cargar estadísticas del técnico',
      details: error.message
    });
  }
};
