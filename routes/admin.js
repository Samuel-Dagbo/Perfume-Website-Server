const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, admin } = require('../middleware/auth');

router.get('/dashboard', protect, admin, adminController.getDashboardStats);

router.get('/users', protect, admin, adminController.getUsers);
router.get('/users/:id', protect, admin, adminController.getUser);
router.put('/users/:id', protect, admin, adminController.updateUser);
router.delete('/users/:id', protect, admin, adminController.deleteUser);

router.get('/inventory', protect, admin, adminController.getInventory);
router.put('/inventory/bulk', protect, admin, adminController.bulkUpdateStock);
router.get('/inventory/logs', protect, admin, adminController.getInventoryLogs);
router.get('/inventory/logs/:productId', protect, admin, adminController.getInventoryLogs);

router.get('/products', protect, admin, adminController.getAllProductsAdmin);

module.exports = router;
