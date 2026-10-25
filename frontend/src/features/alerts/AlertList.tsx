import React, { useEffect, useState } from 'react';
import { Bell, AlertTriangle, CheckCircle } from 'lucide-react';
import api, { AlertItem } from '../../lib/api';
import { EmptyState } from '../../components/shared/EmptyState';

export const AlertListView: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = () => {
    setLoading(true);
    api.get<AlertItem[]>('/alerts')
      .then(res => setAlerts(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const acknowledge = async (id: string) => {
    try {
      await api.put(`/alerts/${id}/acknowledge`);
      fetchAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Regulatory Scrutiny Alerts</h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Automated notifications dispatched for mandatory non-compliances, expiry, and suspected anomalies
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-xs text-text-secondary">Loading alerts...</div>
      ) : alerts.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="You are all caught up"
          description="No active regulatory alerts or unresolved critical flags require your intervention."
        />
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => (
            <div 
              key={a.id} 
              className={`p-4 rounded-2xl border flex items-center justify-between transition-all duration-200 ${
                a.acknowledged ? 'bg-card-subtle border-border/70 opacity-65' : 'glass-card border-danger/40 shadow-danger-glow'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${a.acknowledged ? 'bg-border text-text-muted' : 'bg-danger-soft text-danger'}`}>
                  <AlertTriangle size={16} />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs text-text-primary">{a.trigger}</span>
                    <span className="text-[10px] text-text-muted">App: {a.applicationId}</span>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">{a.message}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <span className="text-[10px] text-text-muted">{a.createdAt}</span>
                {!a.acknowledged ? (
                  <button
                    onClick={() => acknowledge(a.id)}
                    className="px-2.5 py-1 bg-primary text-white text-xs font-semibold rounded hover:bg-blue-700 transition"
                  >
                    Acknowledge
                  </button>
                ) : (
                  <span className="text-[10px] text-success font-bold flex items-center space-x-1">
                    <CheckCircle size={12} />
                    <span>Acknowledged</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
