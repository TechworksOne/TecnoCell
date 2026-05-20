const express = require('express');
const router = express.Router();
const cajaController = require('../controllers/cajaController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// ========== CAJA CHICA ==========
router.get('/caja-chica/saldo', cajaController.getSaldoCajaChica);
router.get('/caja-chica/movimientos', cajaController.getMovimientosCajaChica);
router.post('/caja-chica/movimiento', cajaController.registrarMovimientoCajaChica);
router.put('/caja-chica/confirmar/:id', cajaController.confirmarMovimientoCajaChica);

// ========== BANCOS ==========
router.get('/bancos', cajaController.getCuentasBancarias);
router.get('/bancos/movimientos', cajaController.getMovimientosBancarios);
router.get('/bancos/:id/saldo', cajaController.getSaldoCuentaBancaria);
router.post('/bancos/movimiento', cajaController.registrarMovimientoBancario);
router.put('/bancos/confirmar/:id', cajaController.confirmarMovimientoBancario);
// CRUD bancos (solo admin)
router.post('/bancos', verifyRole('admin', 'ADMINISTRADOR'), cajaController.crearCuentaBancaria);
router.put('/bancos/:id', verifyRole('admin', 'ADMINISTRADOR'), cajaController.editarCuentaBancaria);
router.delete('/bancos/:id', verifyRole('admin', 'ADMINISTRADOR'), cajaController.desactivarCuentaBancaria);

// ========== OPERACIONES ENTRE CAJA Y BANCOS ==========
router.post('/retiro-banco', cajaController.retirarDeBanco);
router.post('/depositar-banco', cajaController.depositarAlBanco);
router.post('/transferencia-bancos', verifyRole('admin', 'ADMINISTRADOR'), cajaController.transferenciaBancos);

module.exports = router;
