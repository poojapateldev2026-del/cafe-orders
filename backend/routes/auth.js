const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { isEmail, passwordProblem } = require('../utils/validate');

const router = express.Router();

// Slow down brute-force attempts on login/register
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later' },
});

const sign = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role });

// Public sign-up always creates a customer. Admins are created by the seed script.
router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const { password } = req.body;

    if (name.length < 2 || name.length > 60) return res.status(400).json({ error: 'Name must be 2-60 characters' });
    if (!isEmail(email)) return res.status(400).json({ error: 'Enter a valid email address' });
    const pwError = passwordProblem(password);
    if (pwError) return res.status(400).json({ error: pwError });

    if (await User.findOne({ email })) return res.status(409).json({ error: 'That email is already registered' });

    const user = await User.create({ name, email, password: await bcrypt.hash(password, 12), role: 'customer' });
    res.status(201).json({ token: sign(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!isEmail(email) || !password) return res.status(400).json({ error: 'Enter your email and password' });

    const user = await User.findOne({ email }).select('+password');
    const ok = user && (await bcrypt.compare(password, user.password));
    if (!ok) return res.status(401).json({ error: 'Incorrect email or password' });

    res.json({ token: sign(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, (req, res) => res.json(publicUser(req.user)));

module.exports = router;
