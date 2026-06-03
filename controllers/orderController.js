const pool = require('../config/db');

const createOrder = async (req, res) => {
    const { table_id, order_type, items, notes } = req.body;
    try {
        const orderResult = await pool.query(
            `INSERT INTO orders (table_id, waiter_id, order_type, notes, status) VALUES ($1,$2,$3,$4,'pending') RETURNING *`,
            [table_id, req.user.id, order_type || 'dine_in', notes]
        );
        const order = orderResult.rows[0];
        let subtotal = 0;
        for (const item of items) {
            const menuItem = await pool.query('SELECT price FROM menu_items WHERE id=$1', [item.item_id]);
            if (menuItem.rows.length === 0) continue;
            const unit_price = menuItem.rows[0].price;
            const itemSubtotal = unit_price * item.quantity;
            subtotal += itemSubtotal;
            await pool.query(
                `INSERT INTO order_items (order_id, item_id, quantity, unit_price, subtotal, notes) VALUES ($1,$2,$3,$4,$5,$6)`,
                [order.id, item.item_id, item.quantity, unit_price, itemSubtotal, item.notes || null]
            );
        }
        const tax = subtotal * 0.16;
        const total = subtotal + tax;
        await pool.query(
            `UPDATE orders SET subtotal=$1, tax_amount=$2, total_amount=$3, status='confirmed' WHERE id=$4`,
            [subtotal, tax, total, order.id]
        );
        if (table_id) await pool.query(`UPDATE restaurant_tables SET status='occupied' WHERE id=$1`, [table_id]);
        const updated = await pool.query(`SELECT * FROM orders WHERE id=$1`, [order.id]);

        // SSE notify — naya order sab boards ko bhejo
        const notify = req.app.locals.notifyClients;
        if (notify) notify({ type: 'NEW_ORDER', order: updated.rows[0] });

        res.status(201).json({ message: 'Order created', order: updated.rows[0] });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

const getAllOrders = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT o.*, rt.table_no, u.full_name as waiter_name
            FROM orders o
            LEFT JOIN restaurant_tables rt ON o.table_id=rt.id
            LEFT JOIN users u ON o.waiter_id=u.id
            ORDER BY o.created_at DESC
        `);
        res.json({ orders: result.rows });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

const getOrderById = async (req, res) => {
    try {
        const order = await pool.query(`
            SELECT o.*, rt.table_no, u.full_name as waiter_name
            FROM orders o
            LEFT JOIN restaurant_tables rt ON o.table_id=rt.id
            LEFT JOIN users u ON o.waiter_id=u.id
            WHERE o.id=$1
        `, [req.params.id]);
        if (order.rows.length === 0) return res.status(404).json({ message: 'Order not found' });
        const items = await pool.query(`
            SELECT oi.*, mi.name as item_name, mi.prep_time
            FROM order_items oi
            JOIN menu_items mi ON oi.item_id=mi.id
            WHERE oi.order_id=$1
        `, [req.params.id]);
        res.json({ order: order.rows[0], items: items.rows });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

const updateOrderStatus = async (req, res) => {
    const { status } = req.body;
    try {
        await pool.query(`UPDATE orders SET status=$1 WHERE id=$2`, [status, req.params.id]);
        if (status === 'paid') {
            const order = await pool.query(`SELECT table_id FROM orders WHERE id=$1`, [req.params.id]);
            if (order.rows[0].table_id) {
                await pool.query(`UPDATE restaurant_tables SET status='available' WHERE id=$1`, [order.rows[0].table_id]);
            }
        }

        // SSE notify — status update sab boards ko bhejo
        const notify = req.app.locals.notifyClients;
        if (notify) notify({ type: 'ORDER_UPDATED', order: { id: req.params.id, status } });

        res.json({ message: 'Status updated' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

const getTables = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT rt.*, 
            (SELECT o.id FROM orders o WHERE o.table_id=rt.id AND o.status NOT IN ('paid','cancelled') LIMIT 1) as active_order_id,
            (SELECT o.order_no FROM orders o WHERE o.table_id=rt.id AND o.status NOT IN ('paid','cancelled') LIMIT 1) as active_order_no,
            (SELECT o.total_amount FROM orders o WHERE o.table_id=rt.id AND o.status NOT IN ('paid','cancelled') LIMIT 1) as active_order_total
            FROM restaurant_tables rt ORDER BY rt.table_no
        `);
        res.json({ tables: result.rows });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

const processPayment = async (req, res) => {
    const { payment_method } = req.body;
    try {
        const order = await pool.query(`SELECT * FROM orders WHERE id=$1`, [req.params.id]);
        if (order.rows.length === 0) return res.status(404).json({ message: 'Order not found' });
        await pool.query(
            `INSERT INTO payments (order_id, amount, payment_method, payment_status, cashier_id, paid_at) VALUES ($1,$2,$3,'paid',$4,NOW())`,
            [req.params.id, order.rows[0].total_amount, payment_method, req.user.id]
        );
        await pool.query(`UPDATE orders SET status='paid' WHERE id=$1`, [req.params.id]);
        if (order.rows[0].table_id) {
            await pool.query(`UPDATE restaurant_tables SET status='available' WHERE id=$1`, [order.rows[0].table_id]);
        }

        // SSE notify — payment ho gayi sab boards ko bhejo
        const notify = req.app.locals.notifyClients;
        if (notify) notify({ type: 'ORDER_UPDATED', order: { id: req.params.id, status: 'paid' } });

        res.json({ message: 'Payment processed successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

module.exports = { createOrder, getAllOrders, getOrderById, updateOrderStatus, getTables, processPayment };