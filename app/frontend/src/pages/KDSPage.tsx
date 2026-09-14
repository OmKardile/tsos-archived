import { useEffect, useState, useRef } from 'react';
import { api } from '../lib/api';
import { useStore } from '../lib/store';
import { io, Socket } from 'socket.io-client';
import { ArrowRight, Check } from 'lucide-react';

interface Order {
  id: string;
  order_type: string;
  status: string;
  placed_by: string;
  grand_total: number;
  created_at: string;
  table_label: string;
  items: { id: string; name: string; qty: number; unitPrice: number; notes: string }[];
}

const columns = [
  { key: 'new', label: 'New', color: 'bg-blue-50 border-blue-200' },
  { key: 'preparing', label: 'Preparing', color: 'bg-amber-50 border-amber-200' },
  { key: 'ready', label: 'Ready', color: 'bg-emerald-50 border-emerald-200' },
];

export default function KDSPage() {
  const { activeLocationId } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);

  const loadOrders = async () => {
    if (!activeLocationId) return;
    try {
      const data = await api.get(`/orders?locationId=${activeLocationId}`);
      setOrders(data.filter((o: Order) => ['new', 'preparing', 'ready'].includes(o.status)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [activeLocationId]);

  useEffect(() => {
    if (!activeLocationId) return;
    const socket = io(window.location.origin, { path: '/socket.io' });
    socket.emit('join_location', activeLocationId);
    socketRef.current = socket;

    socket.on('order:created', () => loadOrders());
    socket.on('order:status_changed', () => loadOrders());

    return () => { socket.disconnect(); };
  }, [activeLocationId]);

  const advanceStatus = async (order: Order) => {
    const flow = ['new', 'preparing', 'ready', 'served'];
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

  if (loading) return <div className="animate-pulse text-gray-400">Loading KDS...</div>;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Kitchen Display</h1>
        <div className="flex gap-4 text-sm text-gray-500">
          {columns.map(col => (
            <span key={col.key}>
              {col.label}: {orders.filter(o => o.status === col.key).length}
            </span>
          ))}
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {columns.map(col => (
          <div key={col.key} className={`flex-1 flex flex-col rounded-xl border-2 ${col.color}`}>
            <div className="p-3 border-b border-current/10">
              <h2 className="font-semibold text-gray-900 text-center">{col.label}</h2>
            </div>
            <div className="flex-1 overflow-auto p-3 space-y-3">
              {orders
                .filter(o => o.status === col.key)
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                .map(order => {
                  const elapsed = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
                  return (
                    <div key={order.id} className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-sm text-gray-500">#{order.id.slice(0, 6)}</span>
                        {order.table_label && (
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded font-medium">
                            {order.table_label}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 mb-3">
                        {order.items?.map((item, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="text-sm font-bold text-gray-900">{item.qty}x</span>
                            <div className="flex-1">
                              <span className="text-sm text-gray-700">{item.name}</span>
                              {item.notes && (
                                <p className="text-xs text-amber-600 italic">{item.notes}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${elapsed > 10 ? 'text-red-500' : 'text-gray-400'}`}>
                          {elapsed}m ago
                        </span>
                        <button
                          onClick={() => advanceStatus(order)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition"
                        >
                          {col.key === 'ready' ? (
                            <><Check className="w-3 h-3" /> Served</>
                          ) : (
                            <><ArrowRight className="w-3 h-3" /> Next</>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
