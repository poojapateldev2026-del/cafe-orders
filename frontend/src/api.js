const TOKEN_KEY = 'cafe_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

async function request(path, { method = 'GET', body, skipAuthRedirect } = {}) {
  const token = tokenStore.get();
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !skipAuthRedirect) onUnauthorized();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  // auth
  register: (body) => request('/auth/register', { method: 'POST', body, skipAuthRedirect: true }),
  login: (body) => request('/auth/login', { method: 'POST', body, skipAuthRedirect: true }),
  me: () => request('/auth/me'),
  // menu
  getMenu: () => request('/menu'),
  createMenuItem: (body) => request('/menu', { method: 'POST', body }),
  updateMenuItem: (id, body) => request(`/menu/${id}`, { method: 'PUT', body }),
  deleteMenuItem: (id) => request(`/menu/${id}`, { method: 'DELETE' }),
  // orders (customer)
  createOrder: (body) => request('/orders', { method: 'POST', body }),
  getMyOrders: () => request('/orders/mine'),
  cancelMyOrder: (id) => request(`/orders/${id}/cancel`, { method: 'PATCH' }),
  // orders (admin)
  getOrders: (query = '') => request(`/orders${query}`),
  getStats: () => request('/orders/stats/today'),
  setOrderStatus: (id, status) => request(`/orders/${id}/status`, { method: 'PATCH', body: { status } }),
};

export const money = (n) => `$${Number(n).toFixed(2)}`;
