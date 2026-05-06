const express = require('express');
const router = express.Router();
const repuestoController = require('../controllers/repuestoController');
const { verifyToken } = require('../middleware/authMiddleware');

// Autenticación deshabilitada temporalmente para desarrollo
// router.use(verifyToken);

// GET /api/repuestos/stock-bajo - Debe ir antes de /:id
router.get('/stock-bajo', repuestoController.getStockBajo);

// GET /api/repuestos/estadisticas - Debe ir antes de /:id
router.get('/estadisticas', repuestoController.getEstadisticas);

// GET /api/repuestos - Obtener todos los repuestos (con filtros)
router.get('/', repuestoController.getAllRepuestos);

// POST /api/repuestos - Crear nuevo repuesto
router.post('/', repuestoController.uploadRepuestos, repuestoController.createRepuesto);

// GET /api/repuestos/:id - Obtener repuesto por ID
router.get('/:id', repuestoController.getRepuestoById);

// PUT /api/repuestos/:id - Actualizar repuesto
router.put('/:id', repuestoController.uploadRepuestos, repuestoController.updateRepuesto);

// DELETE /api/repuestos/:id - Eliminar repuesto
router.delete('/:id', repuestoController.deleteRepuesto);

// POST /api/repuestos/:id/movimiento - Registrar movimiento de stock
router.post('/:id/movimiento', repuestoController.registrarMovimiento);

module.exports = router;
