import { useEffect, useState } from 'react';
import { api, money } from '../api.js';

const COLUMNS = [
  { status: 'pending', title: 'Pending', next: 'preparing', action: 'Start preparing' },
  { status: 'preparing', title: 'Preparing', next: 'ready', action: 'Mark ready' },
  { status: 'ready', title: 'Ready', next: 'served', action: 'Mark served' },
];

export default function OrdersBoard({ onChange }) {
  const [orders, setOrders] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [error, setError] = useState('');

  const load = () =>
    api
      .getOrders('?today=true')
      .then((o) => {
        setOrders(o);
        setLoaded(true);
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
    const t = setInterval(load, 5000); // poll for new orders
    return () => clearInterval(t);
  }, []);

  const setStatus = async (id, status) => {
    setError('');
    try {
      await api.setOrderStatus(id, status);
      await load();
      onChange?.();
    } catch (e) {
      setError(e.message);
      load();
    }
  };

  const card = (o, col) => (
    <div className="order-card" key={o._id}>
      <div className="order-head">
        <b>#{o.orderNumber}</b>
        <span className="muted">
          {o.type === 'dine-in' ? `Table ${o.tableNumber}` : 'Takeaway'}
          {o.customerName && ` · ${o.customerName}`}
        </span>
      </div>
      <ul>
        {o.items.map((i) => (
          <li key={i.menuItem}>{i.quantity} × {i.name}</li>
        ))}
      </ul>
      {o.notes && <p className="note">📝 {o.notes}</p>}
      <div className="order-foot">
        <span>
          {money(o.total)} · {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        <span>
          <button className="primary small" onClick={() => setStatus(o._id, col.next)}>{col.action}</button>
          <button
            className="danger small"
            onClick={() => window.confirm(`Cancel order #${o.orderNumber}?`) && setStatus(o._id, 'cancelled')}
          >
            Cancel
          </button>
        </span>
      </div>
    </div>
  );

  const done = orders.filter((o) => ['served', 'cancelled'].includes(o.status));

  return (
    <>
      {error && <div className="error" onClick={() => setError('')}>{error}</div>}
      {!loaded && !error && <p className="muted">Loading orders…</p>}
      <div className="board">
        {COLUMNS.map((col) => {
          const list = orders.filter((o) => o.status === col.status).reverse(); // oldest first
          return (
            <section key={col.status} className="column">
              <h3>{col.title} <span className="badge">{list.length}</span></h3>
              {loaded && list.length === 0 && <p className="muted">No orders here</p>}
              {list.map((o) => card(o, col))}
            </section>
          );
        })}
      </div>

      <button className="link" onClick={() => setShowDone((s) => !s)}>
        {showDone ? 'Hide' : 'Show'} completed &amp; cancelled today ({done.length})
      </button>
      {showDone && (
        <div className="board">
          {done.length === 0 && <p className="muted">Nothing completed yet today.</p>}
          {done.map((o) => (
            <div key={o._id} className={`order-card ${o.status}`}>
              <div className="order-head">
                <b>#{o.orderNumber}</b>
                <span className={`status status-${o.status}`}>{o.status}</span>
              </div>
              <p className="muted">{o.customerName} · {money(o.total)}</p>
              <ul>{o.items.map((i) => <li key={i.menuItem}>{i.quantity} × {i.name}</li>)}</ul>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
