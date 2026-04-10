const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const { protect, admin } = require('../middleware/auth');

router.post('/in-person', protect, admin, salesController.createInPersonSale);
router.get('/', protect, admin, salesController.getSales);
router.get('/stats', protect, admin, salesController.getSalesStats);
router.get('/recent', protect, admin, salesController.getRecentSales);

module.exports = router;
