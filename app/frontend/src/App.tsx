import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './lib/store';
import { api } from './lib/api';
import Login from './pages/Login';
import Signup from './pages/Signup';
import DashboardLayout from './layouts/DashboardLayout';
import Overview from './pages/Overview';
import POSPage from './pages/POSPage';
import OrdersPage from './pages/OrdersPage';
import KDSPage from './pages/KDSPage';
import MenuPage from './pages/MenuPage';
import InventoryPage from './pages/InventoryPage';
import TablesPage from './pages/TablesPage';
import CustomersPage from './pages/CustomersPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import StorefrontPage from './pages/StorefrontPage';
import OrderTrackingPage from './pages/OrderTrackingPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useStore();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { user, setUser, setLocations, setActiveLocationId, activeLocationId } = useStore();

  useEffect(() => {
    const token = localStorage.getItem('tsos_token');
    if (token && !user) {
      api.get('/auth/me')
        .then((data) => {
          setUser(data.user);
          return api.get('/locations');
        })
        .then((locs) => {
          setLocations(locs);
          if (locs.length > 0 && !activeLocationId) {
            setActiveLocationId(locs[0].id);
          }
        })
        .catch(() => {
          localStorage.removeItem('tsos_token');
        });
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public storefront routes */}
        <Route path="/order/:locationSlug" element={<StorefrontPage />} />
        <Route path="/order/:locationSlug/table/:tableId" element={<StorefrontPage />} />
        <Route path="/order/:locationSlug/track/:orderId" element={<OrderTrackingPage />} />

        {/* Auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Dashboard routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Overview />} />
          <Route path="pos" element={<POSPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="kds" element={<KDSPage />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="tables" element={<TablesPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="offers" element={<CustomersPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
