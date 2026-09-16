import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useStore } from '../lib/store';
import { IndianRupee } from 'lucide-react';

interface FeeConfig {
  monthlyFee: number;
  perOrderFee: number;
  defaultFeePayer: string;
  customerPaidOrderLimit: number | null;
  periodOrderCount: number;
}

export default function SettingsPage() {
  const { activeLocationId } = useStore();
  const [feeConfig, setFeeConfig] = useState<FeeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activeLocationId) return;
    api.get(`/settings?locationId=${activeLocationId}`)
      .then(setFeeConfig)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeLocationId]);

  const saveFeeConfig = async () => {
    if (!activeLocationId || !feeConfig) return;
    setSaving(true);
    try {
      await api.patch(`/settings?locationId=${activeLocationId}`, {
        perOrderFee: feeConfig.perOrderFee,
        defaultFeePayer: feeConfig.defaultFeePayer,
        customerPaidOrderLimit: feeConfig.customerPaidOrderLimit,
      });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="animate-pulse text-text-muted">Loading settings...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-6">Settings</h1>

      {/* Fee Engine Config */}
      <div className="bg-surface border border-divider rounded-xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-action-soft rounded-lg flex items-center justify-center">
            <IndianRupee className="w-5 h-5 text-action" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Fee Configuration</h2>
            <p className="text-sm text-text-muted">TSOS charges ₹0/month + per-order fee</p>
          </div>
        </div>

        {feeConfig && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-cream-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-text-primary">Per-Order Fee</p>
                <p className="text-xs text-text-muted">Charged on each eligible order</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-text-muted">₹</span>
                <input
                  type="number"
                  value={feeConfig.perOrderFee}
                  onChange={(e) => setFeeConfig({ ...feeConfig, perOrderFee: parseFloat(e.target.value) || 0 })}
                  className="w-24 px-3 py-2 border border-divider rounded-lg text-sm text-right focus:ring-2 focus:ring-action outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-cream-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-text-primary">Fee Payer</p>
                <p className="text-xs text-text-muted">Who absorbs the per-order fee?</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFeeConfig({ ...feeConfig, defaultFeePayer: 'customer' })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    feeConfig.defaultFeePayer === 'customer'
                      ? 'bg-action text-white'
                      : 'bg-surface border border-divider text-text-secondary hover:bg-cream-50'
                  }`}
                >
                  Customer
                </button>
                <button
                  onClick={() => setFeeConfig({ ...feeConfig, defaultFeePayer: 'cafe' })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    feeConfig.defaultFeePayer === 'cafe'
                      ? 'bg-action text-white'
                      : 'bg-surface border border-divider text-text-secondary hover:bg-cream-50'
                  }`}
                >
                  Cafe
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-cream-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-text-primary">Auto-Flip Threshold</p>
                <p className="text-xs text-text-muted">After N customer-paid orders, auto-switch to cafe-paying (0 = disabled)</p>
              </div>
              <input
                type="number"
                value={feeConfig.customerPaidOrderLimit || ''}
                onChange={(e) => setFeeConfig({
                  ...feeConfig,
                  customerPaidOrderLimit: parseInt(e.target.value) || null,
                })}
                placeholder="Off"
                className="w-24 px-3 py-2 border border-divider rounded-lg text-sm text-right focus:ring-2 focus:ring-action outline-none"
              />
            </div>

            <div className="p-4 bg-status-info-soft rounded-lg">
              <p className="text-sm text-status-info">
                Current period: {feeConfig.periodOrderCount} customer-paid orders
              </p>
            </div>

            <button
              onClick={saveFeeConfig}
              disabled={saving}
              className="w-full py-3 bg-action hover:bg-action-hover disabled:bg-cream-300 text-white font-medium rounded-xl transition"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
