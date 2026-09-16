import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useStore } from '../lib/store';
import { ShoppingBag, IndianRupee, Users, Clock } from 'lucide-react';

interface Summary {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  activeCustomers: number;
  totalCustomers: number;
  ordersChange: number;
  revenueChange: number;
}

interface SalesData {
  date: string;
  orders: number;
  revenue: number;
}

interface TopItem {
  name: string;
  price: number;
  total_qty: number;
  total_revenue: number;
}

export default function ReportsPage() {
  const { activeLocationId } = useStore();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [sales, setSales] = useState<SalesData[]>([]);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('week');

  const load = async () => {
    if (!activeLocationId) return;
    try {
      const [sum, salesData, items] = await Promise.all([
        api.get(`/reports/summary?locationId=${activeLocationId}&range=${range}`),
        api.get(`/reports/sales-overview?locationId=${activeLocationId}&range=${range}`),
        api.get(`/reports/top-items?locationId=${activeLocationId}`),
      ]);
      setSummary(sum);
      setSales(salesData);
      setTopItems(items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [activeLocationId, range]);

  if (loading) return <div className="animate-pulse text-text-muted">Loading reports...</div>;

  const kpis = summary ? [
    { label: 'Total Orders', value: summary.totalOrders, change: summary.ordersChange, icon: ShoppingBag, color: 'bg-status-info-soft text-status-info' },
    { label: 'Revenue', value: `₹${summary.totalRevenue.toLocaleString('en-IN')}`, change: summary.revenueChange, icon: IndianRupee, color: 'bg-status-completed-soft text-status-completed' },
    { label: 'Pending', value: summary.pendingOrders, change: null, icon: Clock, color: 'bg-status-attention-soft text-status-attention' },
    { label: 'Customers', value: summary.totalCustomers, change: null, icon: Users, color: 'bg-status-accent-soft text-status-accent' },
  ] : [];

  const maxRevenue = Math.max(...sales.map(s => Number(s.revenue)), 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Reports</h1>
        <div className="flex gap-2">
          {['week', 'month'].map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                range === r ? 'bg-action text-white' : 'bg-surface border border-divider text-text-secondary hover:bg-cream-50'
              }`}
            >
              {r === 'week' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map(kpi => (
          <div key={kpi.label} className="bg-surface border border-divider rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-text-muted">{kpi.label}</span>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${kpi.color}`}>
                <kpi.icon className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-text-primary">{kpi.value}</span>
              {kpi.change !== null && (
                <span className={`text-xs font-medium mb-1 ${kpi.change >= 0 ? 'text-status-completed' : 'text-status-destructive'}`}>
                  {kpi.change >= 0 ? '+' : ''}{kpi.change}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <div className="bg-surface border border-divider rounded-xl p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Sales Trend</h2>
          <div className="h-48 flex items-end gap-1">
            {sales.map((s, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-action rounded-t"
                  style={{ height: `${(Number(s.revenue) / maxRevenue) * 100}%`, minHeight: '4px' }}
                />
                <span className="text-[10px] text-text-muted mt-1">{s.date?.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Items */}
        <div className="bg-surface border border-divider rounded-xl p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Top Selling Items</h2>
          {topItems.length === 0 ? (
            <p className="text-text-muted text-sm">No data yet</p>
          ) : (
            <div className="space-y-3">
              {topItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-cream-200 rounded-full flex items-center justify-center text-xs font-medium text-text-secondary">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{item.name}</p>
                      <p className="text-xs text-text-muted">{item.total_qty} sold</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-text-primary">₹{Number(item.total_revenue).toFixed(0)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
