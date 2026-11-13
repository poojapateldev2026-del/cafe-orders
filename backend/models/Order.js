const mongoose = require('mongoose');

const STATUSES = ['pending', 'preparing', 'ready', 'served', 'cancelled'];

// Allowed status changes (admin). Customers may only cancel their own pending order.
const TRANSITIONS = {
  pending: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['served', 'cancelled'],
  served: [],
  cancelled: [],
};

const orderItemSchema = new mongoose.Schema(
  {
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: Number, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    customerName: { type: String, trim: true, default: '' },
    type: { type: String, enum: ['dine-in', 'takeaway'], default: 'dine-in' },
    tableNumber: { type: String, trim: true, default: '' },
    items: { type: [orderItemSchema], validate: (v) => v.length > 0 },
    notes: { type: String, trim: true, default: '', maxlength: 200 },
    total: { type: Number, required: true },
    status: { type: String, enum: STATUSES, default: 'pending' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
module.exports.STATUSES = STATUSES;
module.exports.TRANSITIONS = TRANSITIONS;
