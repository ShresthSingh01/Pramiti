import React, { useEffect, useState } from 'react';
import { BadgeCheck, Clock, ExternalLink, ShieldCheck } from 'lucide-react';
import api, { VerificationItem } from '../../lib/api';
import { EmptyState } from '../../components/shared/EmptyState';

export const VerificationHubView: React.FC = () => {
  const [items, setItems] = useState<VerificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<VerificationItem[]>('/verification')
      .then(res => setItems(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Issuing Authority Verification Hub</h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Real & Simulated Cross-Authority Source Authentication Logs (All 6 PS Statuses Supported)
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-xs text-text-secondary">Loading verification events...</div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={BadgeCheck}
          title="No verification events recorded"
          description="Verification runs automatically whenever new documents are uploaded to the scrutiny ledger."
        />
      ) : (
        <div className="space-y-4">
          {items.map((v) => (
            <div key={v.id} className="glass-card rounded-2xl border border-border p-5 space-y-3.5 hover:border-primary/40 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <span className="font-black text-sm text-text-primary tracking-tight">{v.source}</span>
                  {v.simulated ? (
                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 font-mono font-bold text-[9px] rounded-md">
                      SIMULATED [SIM]
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-success-soft text-success border border-success/30 font-mono font-bold text-[9px] rounded-md">
                      LIVE REAL
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
                    v.status === 'verified'
                      ? 'bg-success-soft text-success border-success/30 shadow-success-glow'
                      : v.status === 'expired' || v.status === 'mismatch_detected'
                      ? 'bg-danger-soft text-danger border-danger/30 shadow-danger-glow'
                      : 'bg-warning-soft text-warning border-warning/30'
                  }`}>
                    {v.status.replace('_', ' ')}
                  </span>
                  <span className="text-[11px] font-mono text-text-muted">{v.timestamp}</span>
                </div>
              </div>

              {v.fields && v.fields.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-card-subtle p-3.5 rounded-xl border border-border text-xs">
                  {v.fields.map((f, i) => (
                    <div key={i}>
                      <span className="text-text-muted text-[10px] font-medium block">{f.name}</span>
                      <span className="font-semibold text-text-primary mt-0.5 block">{f.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {v.log && v.log.length > 0 && (
                <div className="text-[11px] text-text-secondary space-y-1">
                  {v.log.map((l, i) => (
                    <div key={i} className="flex items-center space-x-2">
                      <span className="text-text-muted">{l.time}</span>
                      <span>—</span>
                      <span>{l.event}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
