const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const productController = require('../controllers/productController');
const { verifyToken } = require('../middleware/authMiddleware');

// Multer: diskStorage en uploads/productos/{id}/
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/productos', req.params.id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `img_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Solo se aceptan archivos de imagen'), false);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB por archivo
});

// Rutas públicas (sin autenticación) - solo lectura
router.get('/search', productController.searchProducts);
router.get('/alerts/critical-stock', productController.getCriticalStockProducts);
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);
router.get('/:id/kardex', productController.getProductKardex);

// Rutas protegidas (requieren autenticación) - escritura
router.post('/', verifyToken, productController.createProduct);
router.put('/:id', verifyToken, upload.array('imagenes', 3), productController.updateProduct);
router.patch('/:id/stock', verifyToken, productController.adjustStock);
router.delete('/:id', verifyToken, productController.deleteProduct);

module.exports = router;
