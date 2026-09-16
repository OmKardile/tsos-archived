import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useStore } from '../lib/store';
import { ShoppingBag, IndianRupee, Users, Clock } from 'lucide-react';

interface DashboardSummary {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  activeCustomers: number;
  ordersChange: number;
  revenueChange: number;
}

export default function Overview() {
  const { activeLocationId } = useStore();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeLocationId) return;
    setLoading(true);
    api.get(`/locations/${activeLocationId}/dashboard-summary?range=today`)
      .then(setSummary)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeLocationId]);

  if (loading) {
    return <div className="animate-pulse text-text-muted">Loading dashboard...</div>;
  }

  if (!summary) {
    return <div className="text-text-muted">No data available</div>;
  }

  const cards = [
    {
      label: 'Total Orders',
      value: summary.totalOrders,
      change: summary.ordersChange,
      icon: ShoppingBag,
      color: 'bg-status-info-soft text-status-info',
    },
    {
      label: 'Revenue',
      value: `₹${summary.totalRevenue.toLocaleString('en-IN')}`,
      change: summary.revenueChange,
      icon: IndianRupee,
      color: 'bg-status-completed-soft text-status-completed',
    },
    {
      label: 'Pending Orders',
      value: summary.pendingOrders,
      change: null,
      icon: Clock,
      color: 'bg-status-attention-soft text-status-attention',
    },
    {
      label: 'Active Customers',
      value: summary.activeCustomers,
      change: null,
      icon: Users,
      color: 'bg-status-accent-soft text-status-accent',
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-surface rounded-xl border border-divider p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-text-muted">{card.label}</span>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.color}`}>
                <card.icon className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-text-primary">{card.value}</span>
              {card.change !== null && (
                <span className={`text-xs font-medium mb-1 ${card.change >= 0 ? 'text-status-completed' : 'text-status-destructive'}`}>
                  {card.change >= 0 ? '+' : ''}{card.change}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-surface rounded-xl border border-divider p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Recent Orders</h2>
        <p className="text-text-muted text-sm">Live order feed will appear here (Phase 2).</p>
      </div>
    </div>
  );
}
