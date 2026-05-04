const express = require('express');
const router = express.Router();
const deudoresController = require('../controllers/deudoresController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/',            deudoresController.getDeudores);
router.get('/resumen',     deudoresController.getResumen);
router.get('/:id',         deudoresController.getDeudorById);
router.post('/',           deudoresController.createDeudor);
router.post('/:id/pago',   deudoresController.registrarPago);
router.post('/:id/anular', deudoresController.anularDeudor);

module.exports = router;
