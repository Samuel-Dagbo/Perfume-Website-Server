const express = require('express');
const router = express.Router();
const { trackEvent, getOverview, getConversionFunnel, getProductAnalytics, getInventoryInsights } = require('../controllers/analyticsController');
const { protect, admin } = require('../middleware/auth');

router.post('/event', trackEvent);

router.get('/overview', protect, admin, getOverview);

router.get('/funnel', protect, admin, getConversionFunnel);

router.get('/product/:productId', protect, admin, getProductAnalytics);

router.get('/inventory-insights', protect, admin, getInventoryInsights);

module.exports = router;
