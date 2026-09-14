import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Minus, Plus, ShoppingCart, ArrowLeft } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  is_veg: boolean;
  category_name: string;
  image_url: string;
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

export default function StorefrontPage() {
  const { locationSlug, tableId } = useParams();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCart, setShowCart] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [placing, setPlacing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<{ orderId: string; total: number } | null>(null);
  const [locationName, setLocationName] = useState('');

  useEffect(() => {
    if (!locationSlug) return;
    api.get(`/public/${locationSlug}/menu`)
      .then((data) => {
        setMenuItems(data.items);
        setCategories(data.categories);
        setLocationName(data.location.name);
        if (data.categories.length > 0) {
          setSelectedCategory(data.categories[0].name);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [locationSlug]);

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

  const total = cart.reduce((sum, item) => {
    const basePrice = item.menuItem.price + (item.variant?.priceDelta || 0);
    const addonTotal = item.addons.reduce((s, a) => s + a.price, 0);
    return sum + (basePrice + addonTotal) * item.qty;
  }, 0);

  const placeOrder = async () => {
    if (cart.length === 0 || !phone || !locationSlug) return;
    setPlacing(true);

    try {
      const data = await api.post(`/public/${locationSlug}/orders`, {
        tableId: tableId || null,
        orderType: tableId ? 'dine_in' : 'takeaway',
        customerPhone: phone,
        customerName: name || undefined,
        items: cart.map(c => ({
          menuItemId: c.menuItem.id,
          variantId: c.variant?.id || null,
          qty: c.qty,
          notes: c.notes || undefined,
          addonIds: c.addons.map(a => a.id),
        })),
      });

      setOrderPlaced({ orderId: data.orderId, total: data.grandTotal });
      setCart([]);
      setShowCart(false);
    } catch (err: any) {
      alert(err.message || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading menu...</div>
      </div>
    );
  }

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Placed!</h1>
          <p className="text-gray-500 mb-4">Your order has been sent to the kitchen</p>
          <p className="text-lg font-semibold text-gray-900 mb-6">Total: ₹{Number(orderPlaced.total).toFixed(0)}</p>
          <Link
            to={`/order/${locationSlug}/track/${orderPlaced.orderId}`}
            className="inline-block w-full py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition"
          >
            Track Order
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-900">{locationName}</h1>
            {tableId && <p className="text-xs text-gray-500">Table Order</p>}
          </div>
          <button
            onClick={() => setShowCart(true)}
            className="relative p-2 bg-emerald-50 rounded-lg"
          >
            <ShoppingCart className="w-5 h-5 text-emerald-600" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-600 text-white text-xs rounded-full flex items-center justify-center">
                {cart.reduce((s, i) => s + i.qty, 0)}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Category tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                selectedCategory === cat.name
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Menu items */}
        <div className="space-y-3">
          {menuItems
            .filter(item => !selectedCategory || item.category_name === selectedCategory)
            .map(item => (
              <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4 flex gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-4 h-4 rounded-sm flex items-center justify-center text-[10px] font-bold ${
                      item.is_veg ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                      {item.is_veg ? 'V' : 'N'}
                    </span>
                    <h3 className="font-medium text-gray-900">{item.name}</h3>
                  </div>
                  {item.description && (
                    <p className="text-xs text-gray-500 mb-2 line-clamp-2">{item.description}</p>
                  )}
                  <p className="text-lg font-bold text-gray-900">₹{Number(item.price).toFixed(0)}</p>
                </div>
                <button
                  onClick={() => addToCart(item)}
                  className="self-center px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100 transition"
                >
                  Add
                </button>
              </div>
            ))}
        </div>
      </div>

      {/* Cart Drawer */}
      {showCart && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCart(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Your Order</h2>
              <button onClick={() => setShowCart(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <p className="text-center text-gray-400 py-8">Your cart is empty</p>
              ) : (
                cart.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.menuItem.name}</p>
                      <p className="text-xs text-gray-500">₹{Number(item.menuItem.price).toFixed(0)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(i, -1)} className="w-7 h-7 rounded-full bg-white border flex items-center justify-center">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-medium w-6 text-center">{item.qty}</span>
                      <button onClick={() => updateQty(i, 1)} className="w-7 h-7 rounded-full bg-white border flex items-center justify-center">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-gray-200 p-4 space-y-3">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>₹{total.toFixed(0)}</span>
                </div>

                <input
                  type="tel"
                  placeholder="Phone number *"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
                <input
                  type="text"
                  placeholder="Name (optional)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />

                <button
                  onClick={placeOrder}
                  disabled={!phone || placing}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-medium rounded-xl transition"
                >
                  {placing ? 'Placing...' : 'Place Order'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
