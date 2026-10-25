import React, { useState } from 'react';
import { X, Send, ShieldAlert, FileText, CheckCircle2, Clock } from 'lucide-react';
import api, { Finding } from '../../lib/api';

interface ClarificationModalProps {
  isOpen: boolean;
  appId: string;
  finding: Finding | null;
  onClose: () => void;
  onDispatched: (findingId: string, noticeNo: string) => void;
}

export const ClarificationModal: React.FC<ClarificationModalProps> = ({
  isOpen,
  appId,
  finding,
  onClose,
  onDispatched,
}) => {
  if (!isOpen || !finding) return null;

  const defaultRecipient = "Chairman / Secretary, Sponsoring Educational Trust";
  const defaultNotice = finding.suggestedFix 
    ? `Under ${finding.clauseRef || 'AICTE APH 2025-26'}, regulatory deficiency detected: "${finding.description}". Specific Rectification Directive: ${finding.suggestedFix}`
    : `Under ${finding.clauseRef || 'AICTE APH 2025-26'}, please provide attested supporting documentation and explanation regarding: "${finding.description}".`;

  const [recipient, setRecipient] = useState(defaultRecipient);
  const [message, setMessage] = useState(defaultNotice);
  const [deadline, setDeadline] = useState(7);
  const [loading, setLoading] = useState(false);

  const handleDispatch = async () => {
    try {
      setLoading(true);
      const res = await api.post<{ status: string; notice_no: string; message: string }>(
        `/applications/${appId}/clarifications`,
        {
          finding_id: finding.id,
          recipient,
          message,
          deadline_days: deadline,
        }
      );
      onDispatched(finding.id, res.data.notice_no);
      onClose();
    } catch (err: any) {
      console.error(err);
      alert('Failed to dispatch clarification: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-xl rounded-xl border border-border shadow-2xl p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-warning-soft rounded-lg text-warning">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">Dispatch Formal Clarification Notice</h3>
              <p className="text-[11px] text-text-muted">
                Statutory Inquiry pursuant to AICTE Approval Process Handbook (APH 2025-26)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-text-muted hover:text-text-primary">
            <X size={18} />
          </button>
        </div>

        {/* Finding Context Card */}
        <div className="bg-app p-3 rounded-lg border border-border space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-text-primary">{finding.title}</span>
            <span className="text-[10px] font-semibold text-text-muted bg-white px-2 py-0.5 rounded border border-border">
              {finding.clauseRef}
            </span>
          </div>
          <p className="text-text-secondary text-[11px] leading-relaxed">{finding.description}</p>
          {finding.evidence?.phrase && (
            <p className="text-[10px] font-mono text-danger bg-danger-soft/30 p-1.5 rounded border border-danger/20">
              Exact Flagged Phrase: &ldquo;{finding.evidence.phrase}&rdquo;
            </p>
          )}
        </div>

        {/* Inputs */}
        <div className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-text-primary block mb-1">Addressed To (Recipient)</label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full bg-app border border-border rounded px-3 py-2 text-xs outline-none focus:border-primary font-medium"
            />
          </div>

          <div>
            <label className="font-semibold text-text-primary block mb-1">Official Clarification & Remediation Directive</label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-app border border-border rounded p-3 text-xs outline-none focus:border-primary leading-relaxed font-sans"
            />
          </div>

          <div className="flex items-center justify-between p-2.5 bg-app rounded border border-border">
            <div className="flex items-center space-x-2">
              <Clock size={15} className="text-primary" />
              <span className="font-medium text-text-primary">Statutory Submission Deadline</span>
            </div>
            <select
              value={deadline}
              onChange={(e) => setDeadline(Number(e.target.value))}
              className="bg-card border border-border rounded px-2.5 py-1 text-xs font-semibold outline-none"
            >
              <option value={3}>3 Working Days (Urgent)</option>
              <option value={7}>7 Working Days (Standard)</option>
              <option value={15}>15 Working Days (Inspection Appeal)</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-text-secondary font-medium hover:text-text-primary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDispatch}
            disabled={loading}
            className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition shadow-sm flex items-center space-x-1.5"
          >
            <Send size={13} />
            <span>{loading ? 'Dispatching...' : 'Dispatch Formal Notice'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
