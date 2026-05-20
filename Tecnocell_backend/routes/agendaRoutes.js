const express = require('express');
const router = express.Router();
const agendaController = require('../controllers/agendaController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

// GET /api/agenda/entregas  — listado de reparaciones con fecha de entrega programada
router.get('/entregas', agendaController.getEntregas);

module.exports = router;
