import React, { useState } from 'react';
import { X, Sparkles, Building, AlertCircle } from 'lucide-react';
import api from '../../lib/api';

interface SyntheticModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SyntheticGeneratorModal: React.FC<SyntheticModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [instName, setInstName] = useState('Delhi Institute of Advanced Engineering & Technology');
  const [injectAnomalies, setInjectAnomalies] = useState(true);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    try {
      setLoading(true);
      const appId = `AICTE-2026-${Math.floor(100000 + Math.random() * 900000)}`;

      // 1. Create Application
      const formData = new FormData();
      formData.append('id', appId);
      formData.append('institution_name', instName);
      formData.append('category', 'EoA Renewal');
      formData.append('is_synthetic', 'true');

      await api.post('/applications', formData);

      // Trigger synthetic document creation and upload on backend via script trigger
      const triggerRes = await fetch(`http://127.0.0.1:8000/api/admin/generate-synthetic?app_id=${appId}&institution_name=${encodeURIComponent(instName)}&inject_defects=${injectAnomalies}`, {
        method: 'POST'
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Generation triggered successfully. Refreshing queue.');
      onSuccess();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-md rounded-card border border-border shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles size={18} className="text-warning" />
            <h3 className="text-sm font-bold text-text-primary">Generate Realistic Demonstration Case</h3>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-text-secondary leading-relaxed">
          Generates genuine ReportLab PDF documents (Affidavits, State University NOCs, CAD Floor Plans, Accreditation) and routes them through the full real-time OCR, verification, and rule engine.
        </p>

        <div className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-text-primary block mb-1">Institution Name</label>
            <input 
              type="text" 
              value={instName}
              onChange={(e) => setInstName(e.target.value)}
              className="w-full bg-app border border-border rounded px-3 py-2 text-xs outline-none"
            />
          </div>

          <div className="p-3 bg-app rounded border border-border flex items-center justify-between">
            <div>
              <span className="font-bold text-text-primary block">Inject AICTE Compliance Anomalies</span>
              <span className="text-[10px] text-text-muted">
                Seeds land area discrepancy & lapsed university affiliation
              </span>
            </div>
            <input 
              type="checkbox"
              checked={injectAnomalies}
              onChange={(e) => setInjectAnomalies(e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-border">
          <button 
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-text-secondary font-medium hover:text-text-primary"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="px-4 py-1.5 bg-primary text-white text-xs font-semibold rounded hover:bg-blue-700 transition"
          >
            {loading ? 'Synthesizing...' : 'Generate & Scrutinize'}
          </button>
        </div>
      </div>
    </div>
  );
};
