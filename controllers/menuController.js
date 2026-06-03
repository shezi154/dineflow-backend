const pool = require('../config/db');

const getCategories = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM menu_categories WHERE is_active=true ORDER BY sort_order');
        res.json({ categories: result.rows });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

const getMenuItems = async (req, res) => {
    try {
        const { category_id } = req.query;
        let query = `SELECT m.*, mc.name as category_name FROM menu_items m JOIN menu_categories mc ON m.category_id=mc.id WHERE m.is_available=true`;
        const params = [];
        if (category_id) {
            query += ` AND m.category_id=$1`;
            params.push(category_id);
        }
        query += ` ORDER BY mc.sort_order, m.name`;
        const result = await pool.query(query, params);
        res.json({ items: result.rows });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

const addMenuItem = async (req, res) => {
    const { category_id, name, description, price, prep_time } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO menu_items (category_id, name, description, price, prep_time) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
            [category_id, name, description, price, prep_time || 10]
        );
        res.status(201).json({ message: 'Item added', item: result.rows[0] });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

const updateMenuItem = async (req, res) => {
    const { name, description, price, is_available } = req.body;
    try {
        await pool.query(
            `UPDATE menu_items SET name=$1, description=$2, price=$3, is_available=$4 WHERE id=$5`,
            [name, description, price, is_available, req.params.id]
        );
        res.json({ message: 'Item updated' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

module.exports = { getCategories, getMenuItems, addMenuItem, updateMenuItem };