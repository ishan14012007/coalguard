import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { mockStore } from '../db/mockStore.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'coalguard_sih_secret_key_2026_dgms_compliant';

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      subsidiary_id: user.subsidiary_id,
      mine_id: user.mine_id,
      designation: user.designation,
      employee_id: user.employee_id
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = mockStore.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials. User not found.' });
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid credentials. Password mismatch.' });
  }

  const token = generateToken(user);
  const { password_hash, ...userProfile } = user;

  res.json({
    message: 'Authentication successful',
    token,
    user: userProfile
  });
});

// GET /api/auth/quick-login/:role (Convenience for SIH Judges & evaluation)
router.get('/quick-login/:role', (req, res) => {
  const { role } = req.params;
  
  let user = mockStore.users.find(u => u.role === role);
  if (!user && (role === 'supervisor' || role === 'corporate' || role === 'regulator' || role === 'authority')) {
    user = mockStore.users.find(u => u.role === 'authority') || mockStore.users.find(u => u.id === 'usr-auth-01');
  }

  if (!user) {
    return res.status(404).json({ error: `Demo account for role '${role}' not found.` });
  }

  const token = generateToken(user);
  const { password_hash, ...userProfile } = user;

  res.json({
    message: `Logged in as demo ${userProfile.role}`,
    token,
    user: userProfile
  });
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  const user = mockStore.users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  const { password_hash, ...userProfile } = user;
  res.json({ user: userProfile });
});

// GET /api/auth/demo-users
router.get('/demo-users', (req, res) => {
  const demoAccounts = [
    mockStore.users.find(u => u.role === 'miner'),
    mockStore.users.find(u => u.role === 'supervisor'),
    mockStore.users.find(u => u.id === 'usr-auth-01' || u.role === 'authority')
  ].filter(Boolean).map(u => ({
    id: u.id,
    role: u.role,
    name: u.full_name,
    email: u.email,
    designation: u.designation,
    mineName: mockStore.mines.find(m => m.id === u.mine_id)?.name || 'All Mines (National Scope)'
  }));
  res.json(demoAccounts);
});

export default router;
