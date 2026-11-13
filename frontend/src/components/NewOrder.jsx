import { useMemo, useState } from 'react';
import { api, money } from '../api.js';

export default function NewOrder({ menu, onCreated }) {
  const [cart, setCart] = useState({}); // { menuItemId: quantity }
  const [type, setType] = useState('dine-in');
  const [tableNumber, setTableNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const available = menu.filter((m) => m.available);
  const categories = useMemo(() => [...new Set(available.map((m) => m.category))], [available]);
  const byId = useMemo(() => new Map(menu.map((m) => [m._id, m])), [menu]);

  // Ignore cart entries for items that were removed from the menu meanwhile
  const lines = Object.entries(cart)
    .filter(([id]) => byId.has(id))
    .map(([id, quantity]) => ({ item: byId.get(id), quantity }));
  const total = lines.reduce((s, l) => s + l.item.price * l.quantity, 0);

  const change = (id, delta) =>
    setCart((c) => {
      const q = Math.min(20, (c[id] || 0) + delta);
      const next = { ...c };
      if (q <= 0) delete next[id];
      else next[id] = q;
      return next;
    });

  const submit = async () => {
    setError('');
    if (type === 'dine-in' && !tableNumber.trim()) {
      setError('Enter your table number for dine-in orders');
      return;
    }
    setSaving(true);
    try {
      const order = await api.createOrder({
        type,
        tableNumber: type === 'dine-in' ? tableNumber.trim() : '',
        notes: notes.trim(),
        items: lines.map((l) => ({ menuItem: l.item._id, quantity: l.quantity })),
      });
      setCart({});
      setTableNumber('');
      setNotes('');
      onCreated(order);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="two-col">
      <section className="panel">
        {categories.length === 0 && <p className="muted">The menu is empty right now. Please check back soon.</p>}
        {categories.map((cat) => (
          <div key={cat}>
            <h3>{cat}</h3>
            <div className="menu-grid">
              {available.filter((m) => m.category === cat).map((m) => (
                <button key={m._id} className="menu-card" onClick={() => change(m._id, 1)}>
                  <span>{m.name}</span>
                  <b>{money(m.price)}</b>
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      <aside className="panel cart">
        <h3>Your order</h3>
        <div className="row">
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="dine-in">Dine-in</option>
            <option value="takeaway">Takeaway</option>
          </select>
          {type === 'dine-in' && (
            <input placeholder="Table #" maxLength={10} value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} />
          )}
        </div>

        {lines.length === 0 && <p className="muted">Tap menu items to add them.</p>}
        {lines.map(({ item, quantity }) => (
          <div className="cart-line" key={item._id}>
            <span>{item.name}</span>
            <span className="qty">
              <button onClick={() => change(item._id, -1)} aria-label={`Remove one ${item.name}`}>−</button>
              {quantity}
              <button onClick={() => change(item._id, 1)} aria-label={`Add one ${item.name}`}>+</button>
            </span>
            <b>{money(item.price * quantity)}</b>
          </div>
        ))}

        <textarea maxLength={200} placeholder="Notes (e.g. oat milk, no sugar)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="total">Total <b>{money(total)}</b></div>
        {error && <div className="error">{error}</div>}
        <button className="primary" disabled={!lines.length || saving} onClick={submit}>
          {saving ? 'Placing…' : 'Place order'}
        </button>
      </aside>
    </div>
  );
}
