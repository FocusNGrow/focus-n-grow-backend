const jwt = require('jsonwebtoken');
const JWT_SECRET = 'your_super_secret_key_123'; // Must match your auth.js secret

const protect = (req, res, next) => {
    // 1. Get token from the header
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ status: 'error', message: 'No token, authorization denied' });
    }

    try {
        // 2. Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // 3. Attach user info to the request object
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ status: 'error', message: 'Token is not valid' });
    }
};

module.exports = protect;