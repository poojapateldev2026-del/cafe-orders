import { useState } from 'react';
import { useAuth } from '../AuthContext.jsx';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Returns an object of field -> message
function validate(mode, f) {
  const e = {};
  if (mode === 'register' && (f.name.trim().length < 2 || f.name.trim().length > 60)) e.name = 'Name must be 2-60 characters';
  if (!EMAIL_RE.test(f.email.trim())) e.email = 'Enter a valid email address';
  if (mode === 'register') {
    if (f.password.length < 8) e.password = 'Password must be at least 8 characters';
    else if (!/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) e.password = 'Password needs a letter and a number';
  } else if (!f.password) {
    e.password = 'Enter your password';
  }
  return e;
}

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setServerError('');
    const v = validate(mode, form);
    setErrors(v);
    if (Object.keys(v).length) return;

    setBusy(true);
    try {
      if (mode === 'login') await login(form.email.trim(), form.password);
      else await register(form.name.trim(), form.email.trim(), form.password);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setErrors({});
    setServerError('');
  };

  return (
    <div className="auth-wrap">
      <form className="panel auth-card" onSubmit={submit} noValidate>
        <h1>☕ Café Orders</h1>
        <p className="muted">{mode === 'login' ? 'Sign in to place or manage orders' : 'Create a customer account'}</p>

        {mode === 'register' && (
          <label>
            Full name
            <input value={form.name} onChange={set('name')} autoComplete="name" />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </label>
        )}
        <label>
          Email
          <input type="email" value={form.email} onChange={set('email')} autoComplete="email" />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </label>
        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={set('password')}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
          {errors.password && <span className="field-error">{errors.password}</span>}
        </label>

        {serverError && <div className="error">{serverError}</div>}
        <button className="primary" type="submit" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
        <button type="button" className="link" onClick={switchMode}>
          {mode === 'login' ? "New here? Create an account" : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  );
}
