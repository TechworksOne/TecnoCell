const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Obtener estadísticas del dashboard
router.get('/stats', authMiddleware, dashboardController.getDashboardStats);

module.exports = router;
