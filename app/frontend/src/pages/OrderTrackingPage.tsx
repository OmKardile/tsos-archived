import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { io } from 'socket.io-client';
import { Clock, CheckCircle, ChefHat, Package } from 'lucide-react';

interface OrderStatus {
  id: string;
  status: string;
  order_type: string;
  grand_total: number;
  payment_status: string;
  created_at: string;
  updated_at: string;
  items: { qty: number; name: string; unit_price: number }[];
}

const statusSteps = [
  { key: 'new', label: 'Order Placed', icon: Clock },
  { key: 'preparing', label: 'Preparing', icon: ChefHat },
  { key: 'ready', label: 'Ready', icon: Package },
  { key: 'served', label: 'Served', icon: CheckCircle },
];

export default function OrderTrackingPage() {
  const { locationSlug, orderId } = useParams();
  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderId) return;
    api.get(`/public/${locationSlug}/orders/${orderId}/status`)
      .then(setOrder)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [locationSlug, orderId]);

  useEffect(() => {
    if (!order) return;
    const socket = io(window.location.origin, { path: '/socket.io' });

    socket.on('order:status_changed', (data: { orderId: string; status: string }) => {
      if (data.orderId === orderId) {
        setOrder(prev => prev ? { ...prev, status: data.status, updated_at: new Date().toISOString() } : prev);
      }
    });

    return () => { socket.disconnect(); };
  }, [orderId]);

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center animate-pulse text-gray-400">Loading...</div>;
  if (error) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-red-500">{error}</div>;
  if (!order) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">Order not found</div>;

  const currentStepIndex = statusSteps.findIndex(s => s.key === order.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Order #{orderId?.slice(0, 8)}</h1>
          <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleString('en-IN')}</p>
        </div>

        {/* Status progress */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <div className="space-y-4">
            {statusSteps.map((step, i) => {
              const isCompleted = i <= currentStepIndex;
              const isCurrent = i === currentStepIndex;
              const StepIcon = step.icon;

              return (
                <div key={step.key} className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isCompleted ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'
                  } ${isCurrent ? 'ring-4 ring-emerald-100' : ''}`}>
                    <StepIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                      {step.label}
                    </p>
                  </div>
                  {isCompleted && i < currentStepIndex && (
                    <span className="text-xs text-emerald-600">✓</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Order items */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="font-semibold text-gray-900 mb-3">Items</h2>
          <div className="space-y-2">
            {order.items?.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.qty}x {item.name}</span>
                <span className="text-gray-900">₹{Number(item.unit_price).toFixed(0)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between font-bold text-lg mt-4 pt-3 border-t">
            <span>Total</span>
            <span>₹{Number(order.grand_total).toFixed(0)}</span>
          </div>
          <p className={`text-sm mt-2 ${order.payment_status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
            Payment: {order.payment_status}
          </p>
        </div>

        <Link
          to={`/order/${locationSlug}`}
          className="block text-center py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition"
        >
          Order Again
        </Link>
      </div>
    </div>
  );
}
