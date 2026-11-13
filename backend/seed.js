require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const MenuItem = require('./models/MenuItem');
const User = require('./models/User');
const { isEmail, passwordProblem } = require('./utils/validate');

const items = [
  { name: 'Espresso', category: 'Coffee', price: 3.0 },
  { name: 'Americano', category: 'Coffee', price: 3.5 },
  { name: 'Cappuccino', category: 'Coffee', price: 4.5 },
  { name: 'Latte', category: 'Coffee', price: 4.75 },
  { name: 'Masala Chai', category: 'Tea', price: 3.5 },
  { name: 'Green Tea', category: 'Tea', price: 3.0 },
  { name: 'Iced Coffee', category: 'Cold Drinks', price: 4.5 },
  { name: 'Fresh Orange Juice', category: 'Cold Drinks', price: 4.0 },
  { name: 'Croissant', category: 'Pastries', price: 3.25 },
  { name: 'Blueberry Muffin', category: 'Pastries', price: 3.5 },
  { name: 'Chicken Sandwich', category: 'Meals', price: 7.5 },
  { name: 'Veggie Wrap', category: 'Meals', price: 6.75 },
];

(async () => {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  const name = process.env.ADMIN_NAME || 'Cafe Admin';

  if (!isEmail(email) || passwordProblem(password)) {
    console.error('Set ADMIN_EMAIL and a strong ADMIN_PASSWORD (8+ chars, letter + number) in server/.env first.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cafe_orders');

  // Admin account (created once; never overwritten)
  if (await User.findOne({ email })) {
    console.log(`Admin ${email} already exists - skipped`);
  } else {
    await User.create({ name, email, password: await bcrypt.hash(password, 12), role: 'admin' });
    console.log(`Created admin account ${email}`);
  }

  // Sample menu (only when the menu is empty, so existing data is never wiped)
  if ((await MenuItem.countDocuments()) === 0) {
    await MenuItem.insertMany(items);
    console.log(`Seeded ${items.length} menu items`);
  } else {
    console.log('Menu already has items - skipped');
  }

  await mongoose.disconnect();
})();
