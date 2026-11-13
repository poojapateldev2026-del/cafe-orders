const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isEmail = (v) => typeof v === 'string' && EMAIL_RE.test(v.trim());

// Returns an error message or null
function passwordProblem(v) {
  if (typeof v !== 'string' || v.length < 8) return 'Password must be at least 8 characters';
  if (v.length > 72) return 'Password must be 72 characters or fewer';
  if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return 'Password must contain a letter and a number';
  return null;
}

module.exports = { isEmail, passwordProblem };
