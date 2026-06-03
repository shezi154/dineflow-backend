const express = require('express');
const router = express.Router();
const { createOrder, getAllOrders, getOrderById, updateOrderStatus, getTables, processPayment } = require('../controllers/orderController');
const { verifyToken } = require('../middleware/auth');

router.get('/tables',           verifyToken, getTables);
router.post('/',                verifyToken, createOrder);
router.get('/',                 verifyToken, getAllOrders);
router.get('/:id',              verifyToken, getOrderById);
router.patch('/:id/status',     verifyToken, updateOrderStatus);
router.post('/:id/payment',     verifyToken, processPayment);

module.exports = router;