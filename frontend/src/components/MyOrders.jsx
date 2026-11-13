import { useEffect, useState } from 'react';
import { api, money } from '../api.js';

const STEPS = ['pending', 'preparing', 'ready', 'served'];
const LABEL = {
  pending: 'Received',
  preparing: 'Being prepared',
  ready: 'Ready for pickup',
  served: 'Served',
  cancelled: 'Cancelled',
};

export default function MyOrders() {
  const [orders, setOrders] = useState(null); // null = loading
  const [error, setError] = useState('');

  const load = () =>
    api
      .getMyOrders()
      .then(setOrders)
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
    const t = setInterval(load, 5000); // pick up status changes from the barista
    return () => clearInterval(t);
  }, []);

  const cancel = async (id) => {
    if (!window.confirm('Cancel this order?')) return;
    setError('');
    try {
      await api.cancelMyOrder(id);
      await load();
    } catch (e) {
      setError(e.message);
      load();
    }
  };

  if (orders === null) return <p className="muted">{error || 'Loading your orders…'}</p>;

  return (
    <section>
      {error && <div className="error" onClick={() => setError('')}>{error}</div>}
      {orders.length === 0 && (
        <div className="panel empty">
          <p>You haven't placed any orders yet.</p>
          <p className="muted">Head to “Place Order” to get started.</p>
        </div>
      )}
      <div className="board">
        {orders.map((o) => (
          <div key={o._id} className={`order-card ${o.status}`}>
            <div className="order-head">
              <b>Order #{o.orderNumber}</b>
              <span className={`status status-${o.status}`}>{LABEL[o.status]}</span>
            </div>
            <p className="muted">
              {o.type === 'dine-in' ? `Table ${o.tableNumber}` : 'Takeaway'} ·{' '}
              {new Date(o.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
            {o.status !== 'cancelled' && (
              <div className="progress">
                {STEPS.map((s, i) => (
                  <span key={s} className={i <= STEPS.indexOf(o.status) ? 'done' : ''} />
                ))}
              </div>
            )}
            <ul>
              {o.items.map((i) => (
                <li key={i.menuItem}>{i.quantity} × {i.name}</li>
              ))}
            </ul>
            {o.notes && <p className="note">📝 {o.notes}</p>}
            <div className="order-foot">
              <b>{money(o.total)}</b>
              {o.status === 'pending' && (
                <button className="danger small" onClick={() => cancel(o._id)}>Cancel order</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
