import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useStore } from '../lib/store';
import { Plus, QrCode, Trash2, X } from 'lucide-react';

interface Table {
  id: string;
  label: string;
  qr_token: string;
  seats: number;
  status: string;
}

export default function TablesPage() {
  const { activeLocationId } = useStore();
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newSeats, setNewSeats] = useState('4');
  const [qrTable, setQrTable] = useState<Table | null>(null);
  const [qrUrl, setQrUrl] = useState('');

  const load = async () => {
    if (!activeLocationId) return;
    try {
      const data = await api.get(`/tables?locationId=${activeLocationId}`);
      setTables(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [activeLocationId]);

  const addTable = async () => {
    if (!activeLocationId || !newLabel.trim()) return;
    try {
      await api.post('/tables', {
        locationId: activeLocationId,
        label: newLabel.trim(),
        seats: parseInt(newSeats) || 4,
      });
      setNewLabel('');
      setNewSeats('4');
      setShowAdd(false);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const deleteTable = async (id: string) => {
    if (!confirm('Delete this table?')) return;
    await api.delete(`/tables/${id}`);
    load();
  };

  const showQR = async (table: Table) => {
    try {
      const data = await api.get(`/tables/${table.id}/qr`);
      setQrTable(table);
      setQrUrl(data.url);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const statusColors: Record<string, string> = {
    free: 'bg-status-completed-soft text-status-completed',
    occupied: 'bg-status-attention-soft text-status-attention',
    reserved: 'bg-status-accent-soft text-status-accent',
  };

  if (loading) return <div className="animate-pulse text-text-muted">Loading tables...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Tables</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-action text-white rounded-lg hover:bg-action-hover transition text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Add Table
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {tables.map(table => (
          <div key={table.id} className="bg-surface border border-divider rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-text-primary">{table.label}</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[table.status]}`}>
                {table.status}
              </span>
            </div>
            <p className="text-sm text-text-muted mb-3">{table.seats} seats</p>
            <div className="flex gap-2">
              <button
                onClick={() => showQR(table)}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-cream-200 rounded-lg text-xs font-medium hover:bg-cream-300 transition"
              >
                <QrCode className="w-3 h-3" /> QR
              </button>
              <button
                onClick={() => deleteTable(table.id)}
                className="py-1.5 px-2 bg-status-destructive-soft rounded-lg text-xs hover:bg-status-destructive/20 transition"
              >
                <Trash2 className="w-3 h-3 text-status-destructive" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Table Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Add Table</h2>
              <button onClick={() => setShowAdd(false)} className="p-1 hover:bg-cream-200 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                placeholder="Table label (e.g. Table 1)"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="w-full px-3 py-2 border border-divider rounded-lg text-sm focus:ring-2 focus:ring-action outline-none"
              />
              <input
                type="number"
                placeholder="Seats"
                value={newSeats}
                onChange={(e) => setNewSeats(e.target.value)}
                className="w-full px-3 py-2 border border-divider rounded-lg text-sm focus:ring-2 focus:ring-action outline-none"
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2 border border-divider rounded-lg text-sm font-medium hover:bg-cream-50">
                Cancel
              </button>
              <button onClick={addTable} className="flex-1 py-2 bg-action text-white rounded-lg text-sm font-medium hover:bg-action-hover">
                Add Table
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {qrTable && (
        <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-sm p-6 text-center">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{qrTable.label} - QR Code</h2>
              <button onClick={() => setQrTable(null)} className="p-1 hover:bg-cream-200 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-cream-200 rounded-xl p-8 mb-4">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`}
                alt="QR Code"
                className="mx-auto"
              />
            </div>
            <p className="text-sm text-text-muted mb-4">Scan to order from this table</p>
            <p className="text-xs text-text-muted break-all bg-cream-50 rounded-lg p-2">{qrUrl}</p>
            <button
              onClick={() => navigator.clipboard.writeText(qrUrl)}
              className="mt-4 w-full py-2 bg-action text-white rounded-lg text-sm font-medium hover:bg-action-hover"
            >
              Copy Link
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
