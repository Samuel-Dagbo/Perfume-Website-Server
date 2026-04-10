const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.get('/wishlist', protect, userController.getWishlist);
router.post('/wishlist/:productId', protect, userController.addToWishlist);
router.delete('/wishlist/:productId', protect, userController.removeFromWishlist);
router.put('/address', protect, userController.updateAddress);

module.exports = router;
