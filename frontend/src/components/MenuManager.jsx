import { useState } from 'react';
import { api, money } from '../api.js';

const CATEGORIES = ['Coffee', 'Tea', 'Cold Drinks', 'Pastries', 'Meals', 'Other'];
const EMPTY = { name: '', category: 'Coffee', price: '' };

export default function MenuManager({ menu, reload, onNotice }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');

  const run = async (fn, successMsg) => {
    setError('');
    try {
      await fn();
      await reload();
      if (successMsg) onNotice?.(successMsg);
    } catch (e) {
      setError(e.message);
    }
  };

  const add = (e) => {
    e.preventDefault();
    const v = {};
    if (form.name.trim().length < 2) v.name = 'Name must be at least 2 characters';
    const price = Number(form.price);
    if (form.price === '' || !Number.isFinite(price) || price < 0 || price > 1000) v.price = 'Enter a price between 0 and 1000';
    setErrors(v);
    if (Object.keys(v).length) return;

    run(async () => {
      await api.createMenuItem({ name: form.name.trim(), category: form.category, price });
      setForm({ ...EMPTY, category: form.category });
    }, `Added “${form.name.trim()}” to the menu`);
  };

  return (
    <section className="panel">
      <form className="row" onSubmit={add} noValidate>
        <label>
          Item name
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </label>
        <label>
          Category
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label>
          Price
          <input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          {errors.price && <span className="field-error">{errors.price}</span>}
        </label>
        <button className="primary" type="submit" style={{ alignSelf: 'flex-end' }}>Add item</button>
      </form>
      {error && <div className="error">{error}</div>}

      {menu.length === 0 ? (
        <div className="empty">
          <p>Your menu is empty.</p>
          <p className="muted">Add your first item above so customers can order.</p>
        </div>
      ) : (
        <table>
          <thead>
            <tr><th>Name</th><th>Category</th><th>Price</th><th>Available</th><th></th></tr>
          </thead>
          <tbody>
            {menu.map((m) => (
              <tr key={m._id} className={m.available ? '' : 'dim'}>
                <td>{m.name}</td>
                <td>{m.category}</td>
                <td>{money(m.price)}</td>
                <td>
                  <input
                    type="checkbox"
                    checked={m.available}
                    aria-label={`${m.name} available`}
                    onChange={() => run(() => api.updateMenuItem(m._id, { available: !m.available }))}
                  />
                </td>
                <td>
                  <button
                    className="danger small"
                    onClick={() => window.confirm(`Delete ${m.name}?`) && run(() => api.deleteMenuItem(m._id), `Deleted “${m.name}”`)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
