import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useStore } from '../lib/store';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pinMode, setPinMode] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser, setLocations, setActiveLocationId } = useStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let data;
      if (pinMode) {
        data = await api.post('/auth/pin-login', { email, pinCode: pin });
      } else {
        data = await api.post('/auth/login', { email, password });
      }
      localStorage.setItem('tsos_token', data.token);
      setUser(data.user);

      // Fetch locations after login
      const locs = await api.get('/locations');
      setLocations(locs);
      if (locs.length > 0) {
        setActiveLocationId(locs[0].id);
      }

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">TSOS</h1>
          <p className="text-text-muted mt-1">Cafe Management Platform</p>
        </div>

        <div className="bg-surface rounded-2xl shadow-xl p-8">
          <div className="flex mb-6 bg-cream-200 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setPinMode(false)}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
                !pinMode ? 'bg-surface shadow text-text-primary' : 'text-text-muted'
              }`}
            >
              Email & Password
            </button>
            <button
              type="button"
              onClick={() => setPinMode(true)}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
                pinMode ? 'bg-surface shadow text-text-primary' : 'text-text-muted'
              }`}
            >
              PIN Login
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-divider rounded-xl focus:ring-2 focus:ring-action focus:border-transparent outline-none transition"
                placeholder="you@example.com"
                required
              />
            </div>

            {pinMode ? (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">4-Digit PIN</label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full px-4 py-3 border border-divider rounded-xl focus:ring-2 focus:ring-action focus:border-transparent outline-none transition text-center text-2xl tracking-[0.5em]"
                  placeholder="****"
                  maxLength={4}
                  required
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-divider rounded-xl focus:ring-2 focus:ring-action focus:border-transparent outline-none transition"
                  placeholder="••••••••"
                  required
                />
              </div>
            )}

            {error && (
              <div className="bg-status-destructive-soft text-status-destructive text-sm px-4 py-2 rounded-lg">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-action hover:bg-action-hover disabled:bg-cream-300 text-white font-medium rounded-xl transition"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-text-muted">
            Don't have an account?{' '}
            <Link to="/signup" className="text-action hover:text-action-hover font-medium">
              Sign up
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-text-muted mt-6">
          Demo: admin@tsos.dev / password123
        </p>
      </div>
    </div>
  );
}
