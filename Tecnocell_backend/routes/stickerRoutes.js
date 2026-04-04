const express = require('express');
const router = express.Router();
const stickerController = require('../controllers/stickerController');
const { verifyToken } = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Estadísticas
router.get('/estadisticas', stickerController.getEstadisticas);

// Obtener stickers disponibles
router.get('/disponibles', stickerController.getStickersDisponibles);

// Obtener stickers asignados
router.get('/asignados', stickerController.getStickersAsignados);

// Asignar sticker a reparación
router.post('/asignar', stickerController.asignarSticker);

// Liberar sticker
router.put('/:id/liberar', stickerController.liberarSticker);

module.exports = router;
