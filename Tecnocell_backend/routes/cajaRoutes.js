const express = require('express');
const router = express.Router();
const cajaController = require('../controllers/cajaController');
const { verifyToken } = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// ========== CAJA CHICA ==========
router.get('/caja-chica/saldo', cajaController.getSaldoCajaChica);
router.get('/caja-chica/movimientos', cajaController.getMovimientosCajaChica);
router.post('/caja-chica/movimiento', cajaController.registrarMovimientoCajaChica);
router.put('/caja-chica/confirmar/:id', cajaController.confirmarMovimientoCajaChica);

// ========== BANCOS ==========
router.get('/bancos', cajaController.getCuentasBancarias);
router.get('/bancos/:id/saldo', cajaController.getSaldoCuentaBancaria);
router.get('/bancos/movimientos', cajaController.getMovimientosBancarios);
router.post('/bancos/movimiento', cajaController.registrarMovimientoBancario);
router.put('/bancos/confirmar/:id', cajaController.confirmarMovimientoBancario);

// ========== OPERACIONES ENTRE CAJA Y BANCOS ==========
router.post('/retiro-banco', cajaController.retirarDeBanco);
router.post('/depositar-banco', cajaController.depositarAlBanco);
router.post('/transferencia-bancos', cajaController.transferenciaBancos);

module.exports = router;
