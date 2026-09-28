import jwt from 'jsonwebtoken';
import { mockStore } from '../db/mockStore.js';

const JWT_SECRET = process.env.JWT_SECRET || 'coalguard_sih_secret_key_2026_dgms_compliant';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No authentication token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
}

export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    const role = req.user?.role;
    const isAllowed = role && (
      allowedRoles.includes(role) ||
      (role === 'authority' && allowedRoles.some(r => ['supervisor', 'corporate', 'regulator', 'authority'].includes(r)))
    );

    if (!req.user || !isAllowed) {
      return res.status(403).json({
        error: `Forbidden. Role '${req.user?.role || 'unknown'}' is not authorized to access this resource. Allowed: [${allowedRoles.join(', ')}]`
      });
    }
    next();
  };
}
