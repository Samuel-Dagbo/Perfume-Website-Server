const express = require('express');
const router = express.Router();
const { trackEvent, getOverview, getConversionFunnel, getProductAnalytics, getInventoryInsights } = require('../controllers/analyticsController');
const { auth, adminAuth } = require('../middleware/auth');

router.post('/event', trackEvent);

router.get('/overview', auth, adminAuth, getOverview);

router.get('/funnel', auth, adminAuth, getConversionFunnel);

router.get('/product/:productId', auth, adminAuth, getProductAnalytics);

router.get('/inventory-insights', auth, adminAuth, getInventoryInsights);

module.exports = router;
