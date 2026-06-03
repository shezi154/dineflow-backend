const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(403).json({ message: 'Token required' });
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

const verifyRole = (...roles) => {
    return (req, res, next) => {
        const userRole = req.user.role.trim().toLowerCase();
        const allowed = roles.map(r => r.trim().toLowerCase());
        if (!allowed.includes(userRole)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        next();
    };
};

module.exports = { verifyToken, verifyRole };