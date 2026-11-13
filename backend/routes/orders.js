const express = require('express');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// ---------- Customer ----------

// Place an order. Prices always come from the database, never from the client.
router.post('/', requireRole('customer'), async (req, res, next) => {
  try {
    const { type, notes, items } = req.body;
    const tableNumber = String(req.body.tableNumber || '').trim();
    const orderType = type === 'takeaway' ? 'takeaway' : 'dine-in';

    if (type !== undefined && !['dine-in', 'takeaway'].includes(type)) {
      return res.status(400).json({ error: 'Order type must be dine-in or takeaway' });
    }
    if (orderType === 'dine-in' && (!tableNumber || tableNumber.length > 10)) {
      return res.status(400).json({ error: 'Enter a table number (max 10 characters) for dine-in orders' });
    }
    if (notes !== undefined && String(notes).length > 200) {
      return res.status(400).json({ error: 'Notes must be 200 characters or fewer' });
    }
    if (!Array.isArray(items) || items.length === 0 || items.length > 30) {
      return res.status(400).json({ error: 'Add between 1 and 30 items to your order' });
    }

    const menuItems = await MenuItem.find({ _id: { $in: items.map((i) => i.menuItem) } });
    const byId = new Map(menuItems.map((m) => [String(m._id), m]));

    const orderItems = [];
    for (const line of items) {
      const m = byId.get(String(line.menuItem));
      const quantity = Number(line.quantity);
      if (!m) return res.status(400).json({ error: 'One of the items no longer exists' });
      if (!m.available) return res.status(400).json({ error: `${m.name} is currently unavailable` });
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
        return res.status(400).json({ error: `Quantity for ${m.name} must be between 1 and 20` });
      }
      orderItems.push({ menuItem: m._id, name: m.name, price: m.price, quantity });
    }

    const total = Math.round(orderItems.reduce((s, i) => s + i.price * i.quantity, 0) * 100) / 100;
    const todayCount = await Order.countDocuments({ createdAt: { $gte: startOfToday() } });

    const order = await Order.create({
      orderNumber: todayCount + 1,
      user: req.user._id,
      customerName: req.user.name,
      type: orderType,
      tableNumber: orderType === 'dine-in' ? tableNumber : '',
      notes: notes ? String(notes).trim() : '',
      items: orderItems,
      total,
    });
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
});

// The signed-in customer's own order history
router.get('/mine', requireRole('customer'), async (req, res, next) => {
  try {
    res.json(await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100));
  } catch (err) {
    next(err);
  }
});

// Customers can cancel their own order only while it is still pending
router.patch('/:id/cancel', requireRole('customer'), async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'pending') {
      return res.status(409).json({ error: 'This order is already being prepared and cannot be cancelled' });
    }
    order.status = 'cancelled';
    await order.save();
    res.json(order);
  } catch (err) {
    next(err);
  }
});

// ---------- Admin ----------

// All orders. ?status=pending,preparing  ?today=true
router.get('/', requireRole('admin'), async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) {
      const wanted = String(req.query.status).split(',').filter((s) => Order.STATUSES.includes(s));
      filter.status = { $in: wanted };
    }
    if (req.query.today === 'true') filter.createdAt = { $gte: startOfToday() };
    res.json(await Order.find(filter).sort({ createdAt: -1 }).limit(200));
  } catch (err) {
    next(err);
  }
});

router.get('/stats/today', requireRole('admin'), async (req, res, next) => {
  try {
    const orders = await Order.find({ createdAt: { $gte: startOfToday() } });
    const active = orders.filter((o) => o.status !== 'cancelled');
    res.json({
      orders: active.length,
      revenue: active.filter((o) => o.status === 'served').reduce((s, o) => s + o.total, 0),
      open: orders.filter((o) => ['pending', 'preparing', 'ready'].includes(o.status)).length,
    });
  } catch (err) {
    next(err);
  }
});

// Move an order through the workflow (only valid transitions are allowed)
router.patch('/:id/status', requireRole('admin'), async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!Order.STATUSES.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${Order.STATUSES.join(', ')}` });
    }
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (!Order.TRANSITIONS[order.status].includes(status)) {
      return res.status(409).json({ error: `Cannot change an order from ${order.status} to ${status}` });
    }
    order.status = status;
    await order.save();
    res.json(order);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
