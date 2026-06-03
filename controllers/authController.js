const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
        const user = result.rows[0];
        if (user.status !== 'active') return res.status(403).json({ message: 'Account inactive' });
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(401).json({ message: 'Wrong password' });
        const token = jwt.sign(
            { id: user.id, role: user.role, name: user.full_name },
            process.env.JWT_SECRET,
            { expiresIn: '12h' }
        );
        res.json({
            message: 'Login successful',
            token,
            user: { id: user.id, name: user.full_name, email: user.email, role: user.role }
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

module.exports = { login };