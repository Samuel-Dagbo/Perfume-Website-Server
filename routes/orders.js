const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect, admin } = require('../middleware/auth');

router.get('/', protect, orderController.getOrders);
router.get('/all', protect, admin, orderController.getAllOrders);
router.get('/:id', protect, orderController.getOrder);
router.post('/', protect, orderController.createOrder);
router.put('/:id/status', protect, admin, orderController.updateOrderStatus);
router.put('/:id/cancel', protect, orderController.cancelOrder);

module.exports = router;
