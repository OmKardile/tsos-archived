import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useStore } from '../lib/store';
import { Plus, Gift, Users } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  loyalty_points: number;
  total_orders: number;
  total_spent: number;
  created_at: string;
}

interface Offer {
  id: string;
  title: string;
  type: string;
  value: number;
  min_order_value: number;
  is_active: boolean;
  valid_from: string;
  valid_to: string;
}

export default function CustomersPage() {
  const { activeLocationId } = useStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'customers' | 'offers'>('customers');
  const [showOffer, setShowOffer] = useState(false);
  const [offerForm, setOfferForm] = useState({
    title: '', type: 'flat', value: '', minOrderValue: '', validFrom: '', validTo: '',
  });

  const load = async () => {
    if (!activeLocationId) return;
    try {
      const [custs, offs] = await Promise.all([
        api.get(`/customers?locationId=${activeLocationId}`),
        api.get(`/customers/offers/list?locationId=${activeLocationId}`),
      ]);
      setCustomers(custs);
      setOffers(offs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [activeLocationId]);

  const saveOffer = async () => {
    if (!activeLocationId) return;
    try {
      await api.post('/customers/offers', {
        locationId: activeLocationId,
        title: offerForm.title,
        type: offerForm.type,
        value: parseFloat(offerForm.value) || 0,
        minOrderValue: parseFloat(offerForm.minOrderValue) || 0,
        validFrom: offerForm.validFrom || undefined,
        validTo: offerForm.validTo || undefined,
      });
      setShowOffer(false);
      setOfferForm({ title: '', type: 'flat', value: '', minOrderValue: '', validFrom: '', validTo: '' });
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div className="animate-pulse text-text-muted">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Customers & Offers</h1>
        {tab === 'offers' && (
          <button
            onClick={() => setShowOffer(true)}
            className="flex items-center gap-2 px-4 py-2 bg-action text-white rounded-lg hover:bg-action-hover text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Add Offer
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('customers')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === 'customers' ? 'bg-action text-white' : 'bg-surface border border-divider text-text-secondary hover:bg-cream-50'
          }`}
        >
          <Users className="w-4 h-4 inline mr-1" /> Customers ({customers.length})
        </button>
        <button
          onClick={() => setTab('offers')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === 'offers' ? 'bg-action text-white' : 'bg-surface border border-divider text-text-secondary hover:bg-cream-50'
          }`}
        >
          <Gift className="w-4 h-4 inline mr-1" /> Offers ({offers.length})
        </button>
      </div>

      {tab === 'customers' ? (
        <div className="bg-surface border border-divider rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-cream-50 border-b border-divider">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">Customer</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">Phone</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">Orders</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">Spent</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {customers.map(c => (
                <tr key={c.id}>
                  <td className="px-4 py-3 text-sm font-medium text-text-primary">{c.name || 'Guest'}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">{c.phone}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{c.total_orders}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">₹{Number(c.total_spent).toFixed(0)}</td>
                  <td className="px-4 py-3 text-sm text-action font-medium">{c.loyalty_points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {offers.map(offer => (
            <div key={offer.id} className="bg-surface border border-divider rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-text-primary">{offer.title}</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${offer.is_active ? 'bg-status-completed-soft text-status-completed' : 'bg-cream-200 text-text-muted'}`}>
                  {offer.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-lg font-bold text-text-primary mb-1">
                {offer.type === 'percent' ? `${offer.value}% off` : offer.type === 'flat' ? `₹${offer.value} off` : 'BOGO'}
              </p>
              {offer.min_order_value > 0 && (
                <p className="text-xs text-text-muted">Min order: ₹{offer.min_order_value}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Offer Modal */}
      {showOffer && (
        <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Add Offer</h2>
              <button onClick={() => setShowOffer(false)} className="p-1 hover:bg-cream-200 rounded-lg">✕</button>
            </div>
            <div className="space-y-3">
              <input
                placeholder="Offer title"
                value={offerForm.title}
                onChange={(e) => setOfferForm({ ...offerForm, title: e.target.value })}
                className="w-full px-3 py-2 border border-divider rounded-lg text-sm focus:ring-2 focus:ring-action outline-none"
              />
              <select
                value={offerForm.type}
                onChange={(e) => setOfferForm({ ...offerForm, type: e.target.value })}
                className="w-full px-3 py-2 border border-divider rounded-lg text-sm focus:ring-2 focus:ring-action outline-none"
              >
                <option value="flat">Flat Discount (₹)</option>
                <option value="percent">Percentage Discount (%)</option>
                <option value="bogo">Buy One Get One</option>
              </select>
              <div className="flex gap-3">
                <input
                  type="number"
                  placeholder="Value"
                  value={offerForm.value}
                  onChange={(e) => setOfferForm({ ...offerForm, value: e.target.value })}
                  className="flex-1 px-3 py-2 border border-divider rounded-lg text-sm focus:ring-2 focus:ring-action outline-none"
                />
                <input
                  type="number"
                  placeholder="Min order ₹"
                  value={offerForm.minOrderValue}
                  onChange={(e) => setOfferForm({ ...offerForm, minOrderValue: e.target.value })}
                  className="flex-1 px-3 py-2 border border-divider rounded-lg text-sm focus:ring-2 focus:ring-action outline-none"
                />
              </div>
              <div className="flex gap-3">
                <input
                  type="date"
                  placeholder="Valid from"
                  value={offerForm.validFrom}
                  onChange={(e) => setOfferForm({ ...offerForm, validFrom: e.target.value })}
                  className="flex-1 px-3 py-2 border border-divider rounded-lg text-sm focus:ring-2 focus:ring-action outline-none"
                />
                <input
                  type="date"
                  placeholder="Valid to"
                  value={offerForm.validTo}
                  onChange={(e) => setOfferForm({ ...offerForm, validTo: e.target.value })}
                  className="flex-1 px-3 py-2 border border-divider rounded-lg text-sm focus:ring-2 focus:ring-action outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowOffer(false)} className="flex-1 py-2 border border-divider rounded-lg text-sm font-medium hover:bg-cream-50">Cancel</button>
              <button onClick={saveOffer} className="flex-1 py-2 bg-action text-white rounded-lg text-sm font-medium hover:bg-action-hover">Save Offer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
