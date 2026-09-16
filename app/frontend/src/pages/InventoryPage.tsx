import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useStore } from '../lib/store';
import { Plus, Pencil, Trash2, X, AlertTriangle } from 'lucide-react';

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  stock_qty: number;
  low_stock_threshold: number;
}

export default function InventoryPage() {
  const { activeLocationId } = useStore();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [lowStock, setLowStock] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<Ingredient | null>(null);
  const [form, setForm] = useState({ name: '', unit: 'g', stockQty: '', lowStockThreshold: '' });

  const load = async () => {
    if (!activeLocationId) return;
    try {
      const [ings, low] = await Promise.all([
        api.get(`/inventory/ingredients?locationId=${activeLocationId}`),
        api.get(`/inventory/low-stock?locationId=${activeLocationId}`),
      ]);
      setIngredients(ings);
      setLowStock(low);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [activeLocationId]);

  const save = async () => {
    if (!activeLocationId) return;
    const body = {
      locationId: activeLocationId,
      name: form.name,
      unit: form.unit,
      stockQty: parseFloat(form.stockQty) || 0,
      lowStockThreshold: parseFloat(form.lowStockThreshold) || 0,
    };

    try {
      if (editItem) {
        await api.patch(`/inventory/ingredients/${editItem.id}`, body);
      } else {
        await api.post('/inventory/ingredients', body);
      }
      setShowAdd(false);
      setEditItem(null);
      setForm({ name: '', unit: 'g', stockQty: '', lowStockThreshold: '' });
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openEdit = (item: Ingredient) => {
    setEditItem(item);
    setForm({
      name: item.name,
      unit: item.unit,
      stockQty: String(item.stock_qty),
      lowStockThreshold: String(item.low_stock_threshold),
    });
    setShowAdd(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this ingredient?')) return;
    await api.delete(`/inventory/ingredients/${id}`);
    load();
  };

  if (loading) return <div className="animate-pulse text-text-muted">Loading inventory...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Inventory</h1>
        <button
          onClick={() => { setEditItem(null); setForm({ name: '', unit: 'g', stockQty: '', lowStockThreshold: '' }); setShowAdd(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-action text-white rounded-lg hover:bg-action-hover text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Add Ingredient
        </button>
      </div>

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <div className="bg-status-attention-soft border border-status-attention/30 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-status-attention" />
            <h2 className="font-semibold text-status-attention">Low Stock Alert</h2>
          </div>
          <div className="space-y-1">
            {lowStock.map(item => (
              <p key={item.id} className="text-sm text-status-attention">
                {item.name}: {item.stock_qty} {item.unit} remaining (threshold: {item.low_stock_threshold})
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Ingredients Table */}
      <div className="bg-surface border border-divider rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-cream-50 border-b border-divider">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">Name</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">Stock</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">Unit</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">Threshold</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-text-muted">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {ingredients.map(item => (
              <tr key={item.id} className={item.stock_qty <= item.low_stock_threshold && item.low_stock_threshold > 0 ? 'bg-status-attention-soft' : ''}>
                <td className="px-4 py-3 text-sm font-medium text-text-primary">{item.name}</td>
                <td className="px-4 py-3 text-sm text-text-secondary">{item.stock_qty}</td>
                <td className="px-4 py-3 text-sm text-text-muted">{item.unit}</td>
                <td className="px-4 py-3 text-sm text-text-muted">{item.low_stock_threshold}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(item)} className="p-1 hover:bg-cream-200 rounded mr-1">
                    <Pencil className="w-4 h-4 text-text-muted" />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-1 hover:bg-status-destructive-soft rounded">
                    <Trash2 className="w-4 h-4 text-status-destructive" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editItem ? 'Edit Ingredient' : 'Add Ingredient'}</h2>
              <button onClick={() => setShowAdd(false)} className="p-1 hover:bg-cream-200 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-divider rounded-lg text-sm focus:ring-2 focus:ring-action outline-none"
              />
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full px-3 py-2 border border-divider rounded-lg text-sm focus:ring-2 focus:ring-action outline-none"
              >
                <option value="g">Grams (g)</option>
                <option value="kg">Kilograms (kg)</option>
                <option value="ml">Milliliters (ml)</option>
                <option value="l">Liters (l)</option>
                <option value="pcs">Pieces (pcs)</option>
              </select>
              <div className="flex gap-3">
                <input
                  type="number"
                  placeholder="Current stock"
                  value={form.stockQty}
                  onChange={(e) => setForm({ ...form, stockQty: e.target.value })}
                  className="flex-1 px-3 py-2 border border-divider rounded-lg text-sm focus:ring-2 focus:ring-action outline-none"
                />
                <input
                  type="number"
                  placeholder="Low stock threshold"
                  value={form.lowStockThreshold}
                  onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })}
                  className="flex-1 px-3 py-2 border border-divider rounded-lg text-sm focus:ring-2 focus:ring-action outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2 border border-divider rounded-lg text-sm font-medium hover:bg-cream-50">Cancel</button>
              <button onClick={save} className="flex-1 py-2 bg-action text-white rounded-lg text-sm font-medium hover:bg-action-hover">
                {editItem ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
