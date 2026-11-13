const express = require('express');
const MenuItem = require('../models/MenuItem');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
const CATEGORIES = MenuItem.schema.path('category').enumValues;

router.use(authenticate);

// Validates the fields present in body. Returns { error } or { data }.
function parseMenuBody(body, { partial }) {
  const data = {};

  if (!partial || body.name !== undefined) {
    const name = String(body.name || '').trim();
    if (name.length < 2 || name.length > 60) return { error: 'Item name must be 2-60 characters' };
    data.name = name;
  }
  if (!partial || body.category !== undefined) {
    if (!CATEGORIES.includes(body.category)) return { error: `Category must be one of: ${CATEGORIES.join(', ')}` };
    data.category = body.category;
  }
  if (!partial || body.price !== undefined) {
    const price = Number(body.price);
    if (body.price === '' || !Number.isFinite(price) || price < 0 || price > 1000) {
      return { error: 'Price must be a number between 0 and 1000' };
    }
    data.price = Math.round(price * 100) / 100;
  }
  if (body.available !== undefined) {
    if (typeof body.available !== 'boolean') return { error: 'available must be true or false' };
    data.available = body.available;
  }
  return { data };
}

// Everyone signed in can read the menu; customers only see items that are available.
router.get('/', async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { available: true };
    res.json(await MenuItem.find(filter).sort({ category: 1, name: 1 }));
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    const { error, data } = parseMenuBody(req.body, { partial: false });
    if (error) return res.status(400).json({ error });
    res.status(201).json(await MenuItem.create(data));
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const { error, data } = parseMenuBody(req.body, { partial: true });
    if (error) return res.status(400).json({ error });
    const item = await MenuItem.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ error: 'Menu item not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const item = await MenuItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Menu item not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
