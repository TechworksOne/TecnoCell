const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { verifyToken } = require('../middleware/authMiddleware');

// Rutas públicas (sin autenticación) - solo lectura
router.get('/search', productController.searchProducts);
router.get('/alerts/critical-stock', productController.getCriticalStockProducts);
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);
router.get('/:id/kardex', productController.getProductKardex);

// Rutas protegidas (requieren autenticación) - escritura
router.post('/', verifyToken, productController.createProduct);
router.put('/:id', verifyToken, productController.updateProduct);
router.patch('/:id/stock', verifyToken, productController.adjustStock);
router.delete('/:id', verifyToken, productController.deleteProduct);

module.exports = router;
