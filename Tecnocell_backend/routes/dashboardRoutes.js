const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { verifyToken } = require('../middleware/authMiddleware');

// Estadísticas generales (admin / empleado)
router.get('/stats', verifyToken, dashboardController.getDashboardStats);

// Estadísticas de técnico autenticado
router.get('/tecnico', verifyToken, dashboardController.getTecnicoDashboardStats);

module.exports = router;
