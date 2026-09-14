import { useEffect, useState, useRef } from 'react';
import { api } from '../lib/api';
import { useStore } from '../lib/store';
import { Socket } from 'socket.io-client';
import { createSocket } from '../lib/socket';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  is_veg: boolean;
  is_available: boolean;
  category_name: string;
  tax_rate_pct: number;
  variants: { id: string; name: string; priceDelta: number }[];
  addons: { id: string; name: string; price: number }[];
}

interface CartItem {
  menuItem: MenuItem;
  qty: number;
  variant?: { id: string; name: string; priceDelta: number };
  addons: { id: string; name: string; price: number }[];
  notes: string;
}

export default function POSPage() {
  const { activeLocationId } = useStore();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway' | 'delivery'>('dine_in');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('cash');
  const [discount, setDiscount] = useState(0);
  const [placing, setPlacing] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!activeLocationId) return;
    setLoading(true);

    Promise.all([
      api.get(`/menu/items?locationId=${activeLocationId}`),
      api.get(`/menu/categories?locationId=${activeLocationId}`),
    ]).then(([items, cats]) => {
      setMenuItems(items.filter((i: MenuItem) => i.is_available));
      setCategories(['All', ...cats.map((c: any) => c.name)]);
    }).catch(console.error)
      .finally(() => setLoading(false));

    // Socket.io
    const socket = createSocket();
    socket.emit('join_location', activeLocationId);
    socketRef.current = socket;

    socket.on('order:created', () => {
      // Could show a toast
    });

    return () => { socket.disconnect(); };
  }, [activeLocationId]);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItem.id === item.id);
      if (existing) {
        return prev.map(c =>
          c.menuItem.id === item.id ? { ...c, qty: c.qty + 1 } : c
        );
      }
      return [...prev, { menuItem: item, qty: 1, addons: [], notes: '' }];
    });
  };

  const updateQty = (index: number, delta: number) => {
    setCart(prev => {
      const newCart = [...prev];
      newCart[index].qty += delta;
      if (newCart[index].qty <= 0) newCart.splice(index, 1);
      return newCart;
    });
  };

  const removeItem = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const subtotal = cart.reduce((sum, item) => {
    const basePrice = item.menuItem.price + (item.variant?.priceDelta || 0);
    const addonTotal = item.addons.reduce((s, a) => s + a.price, 0);
    return sum + (basePrice + addonTotal) * item.qty;
  }, 0);

  const taxTotal = cart.reduce((sum, item) => {
    const basePrice = item.menuItem.price + (item.variant?.priceDelta || 0);
    const addonTotal = item.addons.reduce((s, a) => s + a.price, 0);
    const taxRate = (item.menuItem.tax_rate_pct || 5) / 100;
    return sum + ((basePrice + addonTotal) * item.qty * taxRate);
  }, 0);

  const grandTotal = subtotal + taxTotal - discount;

  const placeOrder = async () => {
    if (cart.length === 0 || !activeLocationId) return;
    setPlacing(true);

    try {
      await api.post('/orders', {
        locationId: activeLocationId,
        orderType,
        placedBy: 'staff',
        items: cart.map(c => ({
          menuItemId: c.menuItem.id,
          variantId: c.variant?.id || null,
          qty: c.qty,
          notes: c.notes || null,
          addonIds: c.addons.map(a => a.id),
        })),
        discountTotal: discount,
        paymentMethod,
      });

      setCart([]);
      setDiscount(0);
    } catch (err: any) {
      alert(err.message || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  if (loading) return <div className="animate-pulse text-gray-400">Loading POS...</div>;

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4">
      {/* Menu Grid */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Category tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Items grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 overflow-auto">
          {menuItems
            .filter(item => selectedCategory === 'All' || item.category_name === selectedCategory)
            .map(item => (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                className="bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-emerald-300 hover:shadow-md transition"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-4 h-4 rounded-sm flex items-center justify-center text-[10px] font-bold ${
                    item.is_veg ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                  }`}>
                    {item.is_veg ? 'V' : 'N'}
                  </span>
                  <span className="text-sm font-medium text-gray-900 truncate">{item.name}</span>
                </div>
                <p className="text-lg font-bold text-gray-900">₹{Number(item.price).toFixed(0)}</p>
              </button>
            ))}
        </div>
      </div>

      {/* Cart */}
      <div className="w-96 bg-white border border-gray-200 rounded-xl flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Current Order</h2>
            <span className="text-sm text-gray-500">{cart.length} items</span>
          </div>
          <div className="flex gap-2">
            {(['dine_in', 'takeaway', 'delivery'] as const).map(type => (
              <button
                key={type}
                onClick={() => setOrderType(type)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition ${
                  orderType === type
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {type === 'dine_in' ? 'Dine In' : type === 'takeaway' ? 'Takeaway' : 'Delivery'}
              </button>
            ))}
          </div>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Tap items to add to order</p>
            </div>
          ) : (
            cart.map((item, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.menuItem.name}</p>
                    <p className="text-xs text-gray-500">₹{Number(item.menuItem.price).toFixed(0)} each</p>
                  </div>
                  <button onClick={() => removeItem(i)} className="p-1 hover:bg-red-100 rounded">
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQty(i, -1)}
                      className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-medium w-6 text-center">{item.qty}</span>
                    <button
                      onClick={() => updateQty(i, 1)}
                      className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-sm font-semibold">₹{((Number(item.menuItem.price) + (item.variant?.priceDelta || 0) + item.addons.reduce((s, a) => s + a.price, 0)) * item.qty).toFixed(0)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals */}
        <div className="border-t border-gray-200 p-4 space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span>₹{subtotal.toFixed(0)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Tax (5%)</span>
            <span>₹{taxTotal.toFixed(0)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-emerald-600">
              <span>Discount</span>
              <span>-₹{discount.toFixed(0)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t">
            <span>Total</span>
            <span>₹{grandTotal.toFixed(0)}</span>
          </div>

          {/* Discount input */}
          <div className="flex gap-2 mt-2">
            <input
              type="number"
              placeholder="Discount ₹"
              value={discount || ''}
              onChange={(e) => setDiscount(Number(e.target.value) || 0)}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>

          {/* Payment method */}
          <div className="flex gap-2 mt-2">
            {(['cash', 'upi', 'card'] as const).map(method => (
              <button
                key={method}
                onClick={() => setPaymentMethod(method)}
                className={`flex-1 py-2 text-xs font-medium rounded-lg transition ${
                  paymentMethod === method
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {method.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={placeOrder}
            disabled={cart.length === 0 || placing}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-medium rounded-xl transition mt-2"
          >
            {placing ? 'Placing...' : `Place Order • ₹${grandTotal.toFixed(0)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
