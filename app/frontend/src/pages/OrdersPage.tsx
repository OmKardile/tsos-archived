import { useEffect, useState, useRef } from 'react';
import { api } from '../lib/api';
import { useStore } from '../lib/store';
import { Socket } from 'socket.io-client';
import { createSocket } from '../lib/socket';
import { Clock, CheckCircle, XCircle, ChefHat } from 'lucide-react';

interface Order {
  id: string;
  order_type: string;
  status: string;
  placed_by: string;
  grand_total: number;
  payment_status: string;
  created_at: string;
  table_label: string;
  items: { id: string; name: string; qty: number; unitPrice: number }[];
}

const statusColors: Record<string, string> = {
  new: 'bg-status-info-soft text-status-info',
  preparing: 'bg-status-attention-soft text-status-attention',
  ready: 'bg-status-completed-soft text-status-completed',
  served: 'bg-status-accent-soft text-status-accent',
  completed: 'bg-cream-200 text-text-muted',
  cancelled: 'bg-status-destructive-soft text-status-destructive',
};

const statusIcons: Record<string, any> = {
  new: Clock,
  preparing: ChefHat,
  ready: CheckCircle,
  cancelled: XCircle,
};

export default function OrdersPage() {
  const { activeLocationId } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const socketRef = useRef<Socket | null>(null);

  const loadOrders = async () => {
    if (!activeLocationId) return;
    try {
      const params = new URLSearchParams({ locationId: activeLocationId });
      if (filter) params.set('status', filter);
      const data = await api.get(`/orders?${params}`);
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [activeLocationId, filter]);

  useEffect(() => {
    if (!activeLocationId) return;
    const socket = createSocket();
    socket.emit('join_location', activeLocationId);
    socketRef.current = socket;

    socket.on('order:created', () => loadOrders());
    socket.on('order:status_changed', () => loadOrders());
    socket.on('order:payment_updated', () => loadOrders());

    return () => { socket.disconnect(); };
  }, [activeLocationId]);

  const advanceStatus = async (order: Order) => {
    const flow = ['new', 'preparing', 'ready', 'served', 'completed'];
    const currentIdx = flow.indexOf(order.status);
    if (currentIdx < 0 || currentIdx >= flow.length - 1) return;

    const nextStatus = flow[currentIdx + 1];
    try {
      await api.patch(`/orders/${order.id}/status`, { status: nextStatus });
      loadOrders();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div className="animate-pulse text-text-muted">Loading orders...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Orders</h1>
        <div className="flex gap-2">
          {['', 'new', 'preparing', 'ready', 'served'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                filter === s
                  ? 'bg-action text-white'
                  : 'bg-surface border border-divider text-text-secondary hover:bg-cream-50'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-surface border border-divider rounded-xl p-8 text-center text-text-muted">
          No orders found
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map(order => {
            const StatusIcon = statusIcons[order.status] || Clock;
            return (
              <div key={order.id} className="bg-surface border border-divider rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-text-muted">#{order.id.slice(0, 8)}</span>
                    {order.table_label && (
                      <span className="text-xs bg-cream-200 px-2 py-0.5 rounded">{order.table_label}</span>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${statusColors[order.status]}`}>
                    <StatusIcon className="w-3 h-3" />
                    {order.status}
                  </span>
                </div>

                <div className="space-y-1 mb-3">
                  {order.items?.slice(0, 3).map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-text-secondary">{item.qty}x {item.name}</span>
                      <span className="text-text-primary">₹{Number(item.unitPrice).toFixed(0)}</span>
                    </div>
                  ))}
                  {order.items?.length > 3 && (
                    <p className="text-xs text-text-muted">+{order.items.length - 3} more items</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-divider">
                  <div>
                    <p className="text-lg font-bold text-text-primary">₹{Number(order.grand_total).toFixed(0)}</p>
                    <p className={`text-xs ${order.payment_status === 'paid' ? 'text-status-completed' : 'text-status-attention'}`}>
                      {order.payment_status}
                    </p>
                  </div>
                  {order.status !== 'completed' && order.status !== 'cancelled' && (
                    <button
                      onClick={() => advanceStatus(order)}
                      className="px-4 py-2 bg-action text-white text-sm font-medium rounded-lg hover:bg-action-hover transition"
                    >
                      {order.status === 'new' ? 'Start Preparing' :
                       order.status === 'preparing' ? 'Mark Ready' :
                       order.status === 'ready' ? 'Mark Served' : 'Complete'}
                    </button>
                  )}
                </div>

                <p className="text-xs text-text-muted mt-2">
                  {new Date(order.created_at).toLocaleTimeString('en-IN')}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
