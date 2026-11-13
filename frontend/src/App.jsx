import { useEffect, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { api, money } from './api.js';
import AuthPage from './components/AuthPage.jsx';
import NewOrder from './components/NewOrder.jsx';
import MyOrders from './components/MyOrders.jsx';
import OrdersBoard from './components/OrdersBoard.jsx';
import MenuManager from './components/MenuManager.jsx';

const TABS = {
  customer: [
    { id: 'order', label: 'Place Order' },
    { id: 'mine', label: 'My Orders' },
  ],
  admin: [
    { id: 'board', label: 'Orders Board' },
    { id: 'menu', label: 'Manage Menu' },
  ],
};

export default function App() {
  const { user, loading, logout } = useAuth();
  const [tab, setTab] = useState(null);
  const [menu, setMenu] = useState([]);
  const [stats, setStats] = useState({ orders: 0, revenue: 0, open: 0 });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const isAdmin = user?.role === 'admin';

  const loadMenu = () => api.getMenu().then(setMenu).catch((e) => setError(e.message));
  const loadStats = () => (isAdmin ? api.getStats().then(setStats).catch(() => {}) : null);

  // Reset to the first tab for this role whenever the signed-in user changes
  useEffect(() => {
    if (!user) return;
    setTab(TABS[user.role][0].id);
    setError('');
    setNotice('');
    loadMenu();
    loadStats();
    if (!isAdmin) return;
    const t = setInterval(loadStats, 10000);
    return () => clearInterval(t);
  }, [user?.id]);

  // Auto-dismiss success messages
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  if (loading) return <p className="muted" style={{ padding: 24 }}>Loading…</p>;
  if (!user) return <AuthPage />;

  return (
    <div className="app">
      <header className="topbar">
        <h1>☕ Café Orders</h1>
        <div className="stats">
          {isAdmin && (
            <>
              <span>Open: <b>{stats.open}</b></span>
              <span>Orders today: <b>{stats.orders}</b></span>
              <span>Revenue: <b>{money(stats.revenue)}</b></span>
            </>
          )}
          <span className="who">
            {user.name} <span className="role-tag">{user.role}</span>
          </span>
          <button className="link" onClick={logout}>Log out</button>
        </div>
      </header>

      <nav className="tabs">
        {TABS[user.role].map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      {notice && <div className="success">{notice}</div>}
      {error && <div className="error" onClick={() => setError('')}>{error} (click to dismiss)</div>}

      <main>
        {tab === 'order' && (
          <NewOrder
            menu={menu}
            onCreated={(order) => {
              setNotice(`Order #${order.orderNumber} placed! We'll start on it shortly.`);
              setTab('mine');
            }}
          />
        )}
        {tab === 'mine' && <MyOrders />}
        {tab === 'board' && <OrdersBoard onChange={loadStats} />}
        {tab === 'menu' && <MenuManager menu={menu} reload={loadMenu} onNotice={setNotice} />}
      </main>
    </div>
  );
}
