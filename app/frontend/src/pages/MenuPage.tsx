import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useStore } from '../lib/store';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  is_veg: boolean;
  is_available: boolean;
  category_id: string;
  category_name: string;
  tax_rate_pct: number;
  variants: { id: string; name: string; priceDelta: number }[];
  addons: { id: string; name: string; price: number }[];
}

export default function MenuPage() {
  const { activeLocationId } = useStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemForm, setItemForm] = useState({
    name: '', description: '', price: '', categoryId: '', isVeg: true, taxRatePct: '5',
  });

  const load = async () => {
    if (!activeLocationId) return;
    setLoading(true);
    try {
      const [cats, its] = await Promise.all([
        api.get(`/menu/categories?locationId=${activeLocationId}`),
        api.get(`/menu/items?locationId=${activeLocationId}`),
      ]);
      setCategories(cats);
      setItems(its);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [activeLocationId]);

  const handleSaveItem = async () => {
    if (!activeLocationId) return;
    const body = {
      ...itemForm,
      price: parseFloat(itemForm.price),
      taxRatePct: parseFloat(itemForm.taxRatePct),
      locationId: activeLocationId,
    };

    try {
      if (editingItem) {
        await api.patch(`/menu/items/${editingItem.id}`, body);
      } else {
        await api.post('/menu/items', body);
      }
      setShowItemModal(false);
      setEditingItem(null);
      setItemForm({ name: '', description: '', price: '', categoryId: '', isVeg: true, taxRatePct: '5' });
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    await api.delete(`/menu/items/${id}`);
    load();
  };

  const toggleAvailability = async (item: MenuItem) => {
    await api.patch(`/menu/items/${item.id}/availability`, { isAvailable: !item.is_available });
    load();
  };

  const openEdit = (item: MenuItem) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      description: item.description || '',
      price: String(item.price),
      categoryId: item.category_id || '',
      isVeg: item.is_veg,
      taxRatePct: String(item.tax_rate_pct),
    });
    setShowItemModal(true);
  };

  if (loading) return <div className="animate-pulse text-gray-400">Loading menu...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Menu</h1>
        <button
          onClick={() => { setEditingItem(null); setItemForm({ name: '', description: '', price: '', categoryId: categories[0]?.id || '', isVeg: true, taxRatePct: '5' }); setShowItemModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* Categories */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Categories</h2>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <span key={cat.id} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700">
              {cat.name}
            </span>
          ))}
        </div>
      </div>

      {/* Menu Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4 relative">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-sm flex items-center justify-center text-xs font-bold ${item.is_veg ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                  {item.is_veg ? 'V' : 'N'}
                </span>
                <h3 className="font-semibold text-gray-900">{item.name}</h3>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                  <Pencil className="w-4 h-4 text-gray-500" />
                </button>
                <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>
            {item.description && <p className="text-sm text-gray-500 mb-2">{item.description}</p>}
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-gray-900">₹{Number(item.price).toFixed(0)}</span>
              <button
                onClick={() => toggleAvailability(item)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  item.is_available
                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {item.is_available ? 'Available' : 'Unavailable'}
              </button>
            </div>
            {item.category_name && (
              <span className="inline-block mt-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md">
                {item.category_name}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editingItem ? 'Edit Item' : 'Add Item'}</h2>
              <button onClick={() => setShowItemModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                placeholder="Item name"
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <input
                placeholder="Description (optional)"
                value={itemForm.description}
                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <div className="flex gap-3">
                <input
                  type="number"
                  placeholder="Price (₹)"
                  value={itemForm.price}
                  onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <input
                  type="number"
                  placeholder="Tax %"
                  value={itemForm.taxRatePct}
                  onChange={(e) => setItemForm({ ...itemForm, taxRatePct: e.target.value })}
                  className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <select
                value={itemForm.categoryId}
                onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="">No category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={itemForm.isVeg}
                  onChange={(e) => setItemForm({ ...itemForm, isVeg: e.target.checked })}
                  className="rounded border-gray-300"
                />
                Vegetarian
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowItemModal(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={handleSaveItem} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition">
                {editingItem ? 'Update' : 'Add'} Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
