// Routes: Órdenes de Trabajo
const express = require('express');
const router = express.Router();
const otController = require('../controllers/otController');
const { verifyToken } = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// GET /api/ot — listado de órdenes de trabajo
router.get('/', otController.getOrdenesTrabajo);

// GET /api/ot/tecnicos — lista de usuarios disponibles para asignar OT
router.get('/tecnicos', otController.getTecnicos);

module.exports = router;
