import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useStore } from '../lib/store';

export default function Signup() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    businessName: '',
    locationName: '',
    locationSlug: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser, setLocations, setActiveLocationId } = useStore();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.post('/auth/signup', form);
      localStorage.setItem('tsos_token', data.token);
      setUser(data.user);

      // Fetch locations after signup
      const locs = await api.get('/locations');
      setLocations(locs);
      if (locs.length > 0) {
        setActiveLocationId(locs[0].id);
      }

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">TSOS</h1>
          <p className="text-text-muted mt-1">Create your cafe account</p>
        </div>

        <div className="bg-surface rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Your Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-divider rounded-xl focus:ring-2 focus:ring-action focus:border-transparent outline-none transition"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-divider rounded-xl focus:ring-2 focus:ring-action focus:border-transparent outline-none transition"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-divider rounded-xl focus:ring-2 focus:ring-action focus:border-transparent outline-none transition"
                minLength={6}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Business Name</label>
              <input
                type="text"
                name="businessName"
                value={form.businessName}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-divider rounded-xl focus:ring-2 focus:ring-action focus:border-transparent outline-none transition"
                placeholder="My Cafe"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">First Location Name</label>
              <input
                type="text"
                name="locationName"
                value={form.locationName}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-divider rounded-xl focus:ring-2 focus:ring-action focus:border-transparent outline-none transition"
                placeholder="Main Branch"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Location URL Slug</label>
              <input
                type="text"
                name="locationSlug"
                value={form.locationSlug}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-divider rounded-xl focus:ring-2 focus:ring-action focus:border-transparent outline-none transition"
                placeholder="main-branch"
                pattern="[a-z0-9-]+"
                required
              />
              <p className="text-xs text-text-muted mt-1">Lowercase letters, numbers, and dashes only</p>
            </div>

            {error && (
              <div className="bg-status-destructive-soft text-status-destructive text-sm px-4 py-2 rounded-lg">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-action hover:bg-action-hover disabled:bg-cream-300 text-white font-medium rounded-xl transition"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-text-muted">
            Already have an account?{' '}
            <Link to="/login" className="text-action hover:text-action-hover font-medium">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
