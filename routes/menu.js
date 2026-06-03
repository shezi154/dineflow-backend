const express = require('express');
const router = express.Router();
const { getCategories, getMenuItems, addMenuItem, updateMenuItem } = require('../controllers/menuController');
const { verifyToken, verifyRole } = require('../middleware/auth');

router.get('/categories', getCategories);
router.get('/items',      getMenuItems);
router.post('/items',     verifyToken, verifyRole('admin'), addMenuItem);
router.put('/items/:id',  verifyToken, verifyRole('admin'), updateMenuItem);

module.exports = router;