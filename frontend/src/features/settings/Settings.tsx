import React, { useState } from 'react';
import { ShieldCheck, Database, RefreshCw, Key } from 'lucide-react';
import api from '../../lib/api';

export const SettingsView: React.FC = () => {
  const [auditResult, setAuditResult] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);

  const verifyAudit = async () => {
    try {
      setVerifying(true);
      const res = await api.get('/audit/verify');
      setAuditResult(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-text-primary">System Configuration & Cryptographic Trust</h2>
        <p className="text-xs text-text-secondary mt-0.5">
          Approval Process Handbook settings, regional anchors, and tamper-evident audit ledger
        </p>
      </div>

      {/* Audit Chain Cryptographic Verification Card */}
      <div className="glass-card rounded-2xl border border-border p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 rounded-xl bg-primary-soft text-primary border border-primary/20 shadow-glow">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 className="text-sm font-black text-text-primary tracking-tight">Tamper-Evident SHA-256 Audit Chain</h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Cryptographically linked hash ledger guaranteeing non-repudiation of all regulatory decisions
              </p>
            </div>
          </div>

          <button
            onClick={verifyAudit}
            disabled={verifying}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/20 active:scale-95 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={verifying ? 'animate-spin' : ''} />
            <span>Verify Chain Integrity</span>
          </button>
        </div>

        {auditResult && (
          <div className={`p-4 rounded-xl border text-xs ${
            auditResult.valid
              ? 'bg-success-soft border-success/30 text-success'
              : 'bg-danger-soft border-danger/30 text-danger'
          }`}>
            <p className="font-bold text-sm mb-1 flex items-center space-x-1.5">
              <span>{auditResult.valid ? '✓ Cryptographic Chain Verification Passed' : '✗ Tampering Detected!'}</span>
            </p>
            <p className="text-[11px] leading-relaxed text-text-primary">{auditResult.message}</p>
            <p className="text-[10px] mt-2 text-text-muted font-mono">
              Verified {auditResult.total_records} chained blocks against SHA-256 genesis anchor.
            </p>
          </div>
        )}
      </div>

      {/* Regulatory Parameters */}
      <div className="glass-card rounded-2xl border border-border p-6 space-y-4">
        <h3 className="text-sm font-black text-text-primary uppercase tracking-wider">APH 2025-26 Parameters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-card-subtle rounded-xl border border-border/80">
            <span className="text-text-muted block text-[10px] font-semibold uppercase">Land Area Cross-Check Tolerance</span>
            <span className="font-mono font-black text-text-primary text-base mt-1 block">2.0%</span>
          </div>
          <div className="p-4 bg-card-subtle rounded-xl border border-border/80">
            <span className="text-text-muted block text-[10px] font-semibold uppercase">Clearance Confidence Threshold</span>
            <span className="font-mono font-black text-text-primary text-base mt-1 block">80.0%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
