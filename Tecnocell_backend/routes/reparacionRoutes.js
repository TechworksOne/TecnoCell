// Routes para gestionar reparaciones
const express = require('express');
const router = express.Router();
const reparacionController = require('../controllers/reparacionController');

// Rutas CRUD
router.get('/', reparacionController.getAllReparaciones);
router.get('/:id/historial-completo', reparacionController.getHistorialCompleto);
router.get('/:id', reparacionController.getReparacionById);
router.post('/', reparacionController.createReparacion);

// Actualizar solo el estado (simple)
router.put('/:id/estado', reparacionController.updateEstadoReparacion);

// Actualizar prioridad
router.patch('/:id/prioridad', reparacionController.updatePrioridad);

// Registrar pago de saldo pendiente
router.post('/:id/pago', reparacionController.registrarPagoSaldo);

// Cancelar reparación
router.patch('/:id/cancelar', reparacionController.cancelarReparacion);

// Cambiar estado con imágenes
router.post(
  '/:id/estado',
  reparacionController.uploadMiddleware,
  reparacionController.changeRepairState
);

// Subir imagen individual (opcional)
router.post(
  '/upload',
  reparacionController.uploadMiddleware,
  (req, res) => {
    const files = req.files;
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se subieron archivos'
      });
    }
    
    const urls = files.map(file => ({
      filename: file.filename,
      url_path: `/uploads/reparaciones/${req.body.repairId || 'temp'}/${file.filename}`,
      size: file.size,
      mimetype: file.mimetype
    }));
    
    res.json({
      success: true,
      data: urls
    });
  }
);

module.exports = router;
