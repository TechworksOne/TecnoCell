const db = require('../config/database');

// Crear checklist de equipo
exports.createCheckEquipo = async (req, res) => {
  try {
    const {
      reparacionId,
      tipoEquipo,
      checksGenerales,
      checksEspecificos,
      observaciones,
      fotosChecklist,
      realizadoPor,
      dejoAnticipo,
      montoAnticipo,
      metodoAnticipo
    } = req.body;

    // Preparar datos JSON según el tipo de equipo
    let telefonoChecks = null;
    let tabletChecks = null;
    let computadoraChecks = null;

    if (tipoEquipo === 'Telefono') {
      telefonoChecks = JSON.stringify(checksEspecificos);
    } else if (tipoEquipo === 'Tablet') {
      tabletChecks = JSON.stringify(checksEspecificos);
    } else if (tipoEquipo === 'Computadora' || tipoEquipo === 'Laptop') {
      computadoraChecks = JSON.stringify(checksEspecificos);
    }

    const [result] = await db.query(
      `INSERT INTO check_equipo (
        reparacion_id, tipo_equipo,
        enciende, tactil_funciona, pantalla_ok, bateria_ok, carga_ok,
        telefono_checks, tablet_checks, computadora_checks,
        observaciones, fotos_checklist, realizado_por
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reparacionId,
        tipoEquipo,
        checksGenerales.enciende || false,
        checksGenerales.tactilFunciona || false,
        checksGenerales.pantallaOk || false,
        checksGenerales.bateriaOk || false,
        checksGenerales.cargaOk || false,
        telefonoChecks,
        tabletChecks,
        computadoraChecks,
        observaciones || null,
        fotosChecklist ? JSON.stringify(fotosChecklist) : null,
        realizadoPor || 'Sistema'
      ]
    );

    // Si dejó anticipo, actualizar la reparación con el monto y método
    if (dejoAnticipo && montoAnticipo > 0) {
      await db.query(
        `UPDATE reparaciones 
         SET monto_anticipo = ?, 
             saldo_anticipo = ?, 
             metodo_anticipo = ?
         WHERE id = ?`,
        [
          montoAnticipo,
          montoAnticipo, // El saldo inicial es igual al monto del anticipo
          metodoAnticipo,
          reparacionId
        ]
      );

      // Registrar el anticipo en el historial
      await db.query(
        `INSERT INTO reparaciones_historial (
          reparacion_id, estado, nota, user_nombre
        ) VALUES (?, ?, ?, ?)`,
        [
          reparacionId,
          'ANTICIPO_REGISTRADO',
          `Anticipo registrado: Q${(montoAnticipo / 100).toFixed(2)} (${metodoAnticipo})`,
          realizadoPor || 'Sistema'
        ]
      );
    }

    // Crear entrada en historial de reparaciones con estado RECIBIDA
    await db.query(
      `INSERT INTO reparaciones_historial (
        reparacion_id, estado, nota, user_nombre
      ) VALUES (?, ?, ?, ?)`,
      [
        reparacionId,
        'RECIBIDA',
        'Equipo recibido y checklist completado',
        realizadoPor || 'Sistema'
      ]
    );

    // Actualizar estado de la reparación a RECIBIDA si aún no lo está
    await db.query(
      `UPDATE reparaciones SET estado = 'RECIBIDA' WHERE id = ? AND estado != 'RECIBIDA'`,
      [reparacionId]
    );

    res.status(201).json({
      success: true,
      message: 'Checklist creado exitosamente',
      data: {
        id: result.insertId,
        reparacionId,
        anticipoRegistrado: dejoAnticipo && montoAnticipo > 0
      }
    });

  } catch (error) {
    console.error('Error creating check equipo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear checklist',
      error: error.message
    });
  }
};

// Obtener checklist por reparación
exports.getCheckByReparacion = async (req, res) => {
  try {
    const { reparacionId } = req.params;

    const [checks] = await db.query(
      `SELECT ce.*, r.monto_anticipo, r.saldo_anticipo, r.metodo_anticipo
       FROM check_equipo ce
       LEFT JOIN reparaciones r ON ce.reparacion_id = r.id
       WHERE ce.reparacion_id = ? 
       ORDER BY ce.fecha_checklist DESC 
       LIMIT 1`,
      [reparacionId]
    );

    if (checks.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró checklist para esta reparación'
      });
    }

    const check = checks[0];

    // Parsear JSON fields
    if (check.telefono_checks) check.telefono_checks = JSON.parse(check.telefono_checks);
    if (check.tablet_checks) check.tablet_checks = JSON.parse(check.tablet_checks);
    if (check.computadora_checks) check.computadora_checks = JSON.parse(check.computadora_checks);
    if (check.fotos_checklist) check.fotos_checklist = JSON.parse(check.fotos_checklist);

    res.json({
      success: true,
      data: check
    });

  } catch (error) {
    console.error('Error getting check equipo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener checklist',
      error: error.message
    });
  }
};

// Obtener todos los checklists (para listados)
exports.getAllChecks = async (req, res) => {
  try {
    const [checks] = await db.query(
      `SELECT 
        id, 
        reparacion_id, 
        fecha_checklist,
        realizado_por
       FROM check_equipo 
       ORDER BY fecha_checklist DESC`
    );

    res.json({
      success: true,
      data: checks
    });

  } catch (error) {
    console.error('Error getting all checks:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener checklists',
      error: error.message
    });
  }
};

// Actualizar checklist
exports.updateCheckEquipo = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      checksGenerales,
      checksEspecificos,
      observaciones,
      fotosChecklist,
      realizadoPor
    } = req.body;

    // Obtener tipo de equipo del check existente
    const [existing] = await db.query(
      `SELECT tipo_equipo FROM check_equipo WHERE id = ?`,
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Checklist no encontrado'
      });
    }

    const tipoEquipo = existing[0].tipo_equipo;
    let telefonoChecks = null;
    let tabletChecks = null;
    let computadoraChecks = null;

    if (tipoEquipo === 'Telefono') {
      telefonoChecks = JSON.stringify(checksEspecificos);
    } else if (tipoEquipo === 'Tablet') {
      tabletChecks = JSON.stringify(checksEspecificos);
    } else if (tipoEquipo === 'Computadora' || tipoEquipo === 'Laptop') {
      computadoraChecks = JSON.stringify(checksEspecificos);
    }

    await db.query(
      `UPDATE check_equipo SET
        enciende = ?,
        tactil_funciona = ?,
        pantalla_ok = ?,
        bateria_ok = ?,
        carga_ok = ?,
        telefono_checks = ?,
        tablet_checks = ?,
        computadora_checks = ?,
        observaciones = ?,
        fotos_checklist = ?,
        realizado_por = ?
      WHERE id = ?`,
      [
        checksGenerales.enciende || false,
        checksGenerales.tactilFunciona || false,
        checksGenerales.pantallaOk || false,
        checksGenerales.bateriaOk || false,
        checksGenerales.cargaOk || false,
        telefonoChecks,
        tabletChecks,
        computadoraChecks,
        observaciones || null,
        fotosChecklist ? JSON.stringify(fotosChecklist) : null,
        realizadoPor || 'Sistema',
        id
      ]
    );

    res.json({
      success: true,
      message: 'Checklist actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error updating check equipo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar checklist',
      error: error.message
    });
  }
};

module.exports = exports;
