import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store';
import {
  ClipboardList, ShoppingBag, Package, MoreHorizontal,
  LogOut, Coffee, LayoutDashboard
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Today', end: true },
  { to: '/dashboard/orders', icon: ClipboardList, label: 'Orders' },
  { to: '/dashboard/pos', icon: ShoppingBag, label: 'New sale' },
  { to: '/dashboard/inventory', icon: Package, label: 'Stock' },
  { to: '/dashboard/settings', icon: MoreHorizontal, label: 'More' },
];

export default function DashboardLayout() {
  const { user, locations, activeLocationId, setActiveLocationId, logout } = useStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Sidebar */}
      <aside className="w-60 bg-surface border-r border-divider flex flex-col">
        <div className="p-5 border-b border-divider">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-action rounded-lg flex items-center justify-center">
              <Coffee className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-text-primary">TSOS</span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-action-soft text-action'
                    : 'text-text-secondary hover:bg-cream-50 hover:text-text-primary'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-divider">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:bg-cream-50 hover:text-text-primary w-full transition"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-surface border-b border-divider flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            {locations.length > 1 && (
              <select
                value={activeLocationId || ''}
                onChange={(e) => setActiveLocationId(e.target.value)}
                className="px-3 py-1.5 border border-divider rounded-lg text-sm focus:ring-2 focus:ring-action outline-none bg-surface text-text-primary"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            )}
            {locations.length === 1 && (
              <span className="text-sm text-text-muted">{locations[0]?.name}</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-text-primary">{user?.name}</p>
              <p className="text-xs text-text-muted capitalize">{user?.role}</p>
            </div>
            <div className="w-9 h-9 bg-action-soft text-action rounded-full flex items-center justify-center font-semibold text-sm">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
