const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { protect, admin } = require('../middleware/auth');

router.get('/featured', productController.getFeaturedProducts);
router.get('/search', productController.searchProducts);
router.get('/', productController.getProducts);
router.get('/:id', productController.getProduct);
router.get('/:id/related', productController.getRelatedProducts);

router.post('/', protect, admin, productController.createProduct);
router.put('/:id', protect, admin, productController.updateProduct);
router.delete('/:id', protect, admin, productController.deleteProduct);
router.put('/:id/stock', protect, admin, productController.updateStock);
router.post('/:id/reviews', protect, productController.addReview);

module.exports = router;
