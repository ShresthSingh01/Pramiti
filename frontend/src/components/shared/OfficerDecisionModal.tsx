import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  XCircle, 
  Clock, 
  FileText, 
  Send,
  Lock,
  UserCheck
} from 'lucide-react';
import api, { ApplicationDetail, Finding } from '../../lib/api';

export type DecisionType = 
  | 'RECOMMEND_APPROVAL' 
  | 'ISSUE_DEFICIENCY_NOTICE' 
  | 'RECOMMEND_EVC_INSPECTION' 
  | 'REJECT';

interface OfficerDecisionModalProps {
  isOpen: boolean;
  appDetail: ApplicationDetail;
  findings: Finding[];
  initialDecision?: DecisionType;
  onClose: () => void;
  onSuccess: () => void;
}

const EVC_SCOPE_OPTIONS = [
  "Land parcel & boundary demarcation audit (APH Sec 4.2)",
  "Architectural master layout & built-up area measurement",
  "Fire safety & barrier-free evacuation corridor audit",
  "Core laboratory machinery & computer terminal physical count",
  "Faculty biometric attendance & cadre register verification"
];

export const OfficerDecisionModal: React.FC<OfficerDecisionModalProps> = ({
  isOpen,
  appDetail,
  findings,
  initialDecision = 'RECOMMEND_APPROVAL',
  onClose,
  onSuccess
}) => {
  if (!isOpen) return null;

  const officerName = localStorage.getItem('eg_name') || 'Er. Rajesh Verma';
  const officerRole = localStorage.getItem('eg_role') === 'admin' ? 'Admin Director' : 'Scrutiny Officer';

  const criticalCount = findings.filter(f => f.severity === 'critical').length;
  const highCount = findings.filter(f => f.severity === 'high').length;

  const [selectedDecision, setSelectedDecision] = useState<DecisionType>(() => {
    if (criticalCount > 0 || highCount > 0) {
      return initialDecision === 'RECOMMEND_APPROVAL' ? 'ISSUE_DEFICIENCY_NOTICE' : initialDecision;
    }
    return initialDecision;
  });

  const getDefaultRemarks = (dec: DecisionType) => {
    switch (dec) {
      case 'RECOMMEND_APPROVAL':
        return `Upon comprehensive scrutiny of statutory records, architectural drawings, and issuing-authority digital attestations, the institution complies with all mandatory norms stipulated under AICTE Approval Process Handbook (APH 2025-26). Recommended for Extension of Approval (EoA).`;
      case 'ISSUE_DEFICIENCY_NOTICE':
        return `Discrepancies identified during multi-document evidence scrutiny: ${findings.map(f => `[${f.clauseRef || 'APH'}]: ${f.title}`).slice(0, 3).join('; ')}. Institution is directed to rectify deficiencies and upload attested supporting evidence within the prescribed hearing window.`;
      case 'RECOMMEND_EVC_INSPECTION':
        return `Documentary evidence presents physical infrastructure ambiguities requiring on-ground physical inspection by the Expert Visit Committee (EVC). Recommended for physical site visit to verify built-up area and campus boundaries.`;
      case 'REJECT':
        return `Application fails to satisfy statutory requirements under AICTE Regulations. Critical non-compliances identified in mandatory land title and university affiliation. Scrutiny rejection order issued with escalation to Standing Appellate Committee (SAC).`;
    }
  };

  const [remarks, setRemarks] = useState<string>(() => getDefaultRemarks(selectedDecision));
  const [deadlineDays, setDeadlineDays] = useState<number>(14);
  const [selectedEvcScopes, setSelectedEvcScopes] = useState<string[]>([EVC_SCOPE_OPTIONS[0], EVC_SCOPE_OPTIONS[1]]);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleDecisionChange = (dec: DecisionType) => {
    setSelectedDecision(dec);
    setRemarks(getDefaultRemarks(dec));
  };

  const toggleEvcScope = (scope: string) => {
    setSelectedEvcScopes(prev => 
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    );
  };

  const handleSubmit = async () => {
    if (!remarks.trim()) {
      alert("Please provide official scrutiny remarks before recording this determination.");
      return;
    }

    try {
      setSubmitting(true);
      await api.post(`/applications/${appDetail.id}/decision`, {
        decision: selectedDecision,
        remarks: remarks.trim(),
        officer_name: officerName,
        officer_role: officerRole,
        rectification_deadline_days: deadlineDays,
        evc_scope: selectedDecision === 'RECOMMEND_EVC_INSPECTION' ? selectedEvcScopes : [],
        deficiency_ids: findings.map(f => f.id)
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Failed to record decision:", err);
      alert(err.response?.data?.detail || "Failed to record determination. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card w-full max-w-2xl rounded-2xl border border-border shadow-2xl p-6 space-y-5 my-8">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-500/10 text-primary border border-primary/20 rounded-xl">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-text-primary">Official Scrutiny Determination</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-primary-soft text-primary">
                  APH 2025-26
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5 font-mono">
                {appDetail.id} &bull; <strong className="text-text-secondary">{appDetail.institutionName}</strong>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-border/60 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrutiny Evidence Snapshot */}
        <div className="bg-card-subtle p-3 rounded-xl border border-border flex items-center justify-between text-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-text-muted">Evidence Dossier Status</span>
            <p className="font-semibold text-text-primary">
              {appDetail.checklist.filter(c => c.status === 'verified').length} of {appDetail.checklist.length} Documents Authenticated
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {criticalCount > 0 ? (
              <span className="px-2.5 py-1 rounded-lg bg-danger-soft text-danger text-[11px] font-bold border border-danger/30 flex items-center space-x-1">
                <AlertTriangle size={13} />
                <span>{criticalCount} Critical Deficiency</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-lg bg-success-soft text-success text-[11px] font-bold border border-success/30 flex items-center space-x-1">
                <CheckCircle2 size={13} />
                <span>Zero Critical Deficiencies</span>
              </span>
            )}
            <span className="px-2.5 py-1 rounded-lg bg-card text-text-secondary text-[11px] font-mono font-bold border border-border">
              Risk: {appDetail.riskScore ?? 0}%
            </span>
          </div>
        </div>

        {/* 4 Statutory Determination Options */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-text-primary uppercase tracking-wider block">
            Select Statutory Regulatory Next Step:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            
            {/* 1. Recommend Approval */}
            <button
              type="button"
              onClick={() => handleDecisionChange('RECOMMEND_APPROVAL')}
              className={`p-3 rounded-xl border text-left transition-all flex items-start space-x-2.5 cursor-pointer ${
                selectedDecision === 'RECOMMEND_APPROVAL'
                  ? 'border-success bg-success-soft/30 shadow-sm ring-1 ring-success'
                  : 'border-border bg-card hover:border-text-secondary'
              }`}
            >
              <CheckCircle2 size={18} className={`shrink-0 mt-0.5 ${selectedDecision === 'RECOMMEND_APPROVAL' ? 'text-success' : 'text-text-muted'}`} />
              <div>
                <span className="text-xs font-bold block text-text-primary">Recommend for Approval</span>
                <span className="text-[10px] text-text-secondary block mt-0.5 leading-tight">
                  Clear for Extension of Approval (EoA). All mandatory requirements verified.
                </span>
              </div>
            </button>

            {/* 2. Issue Deficiency Notice */}
            <button
              type="button"
              onClick={() => handleDecisionChange('ISSUE_DEFICIENCY_NOTICE')}
              className={`p-3 rounded-xl border text-left transition-all flex items-start space-x-2.5 cursor-pointer ${
                selectedDecision === 'ISSUE_DEFICIENCY_NOTICE'
                  ? 'border-warning bg-warning-soft/30 shadow-sm ring-1 ring-warning'
                  : 'border-border bg-card hover:border-text-secondary'
              }`}
            >
              <AlertTriangle size={18} className={`shrink-0 mt-0.5 ${selectedDecision === 'ISSUE_DEFICIENCY_NOTICE' ? 'text-warning' : 'text-text-muted'}`} />
              <div>
                <span className="text-xs font-bold block text-text-primary">Issue Deficiency Notice</span>
                <span className="text-[10px] text-text-secondary block mt-0.5 leading-tight">
                  Initiate APH Rectification Loop. Transmit formal compliance directive to applicant.
                </span>
              </div>
            </button>

            {/* 3. Physical EVC Inspection */}
            <button
              type="button"
              onClick={() => handleDecisionChange('RECOMMEND_EVC_INSPECTION')}
              className={`p-3 rounded-xl border text-left transition-all flex items-start space-x-2.5 cursor-pointer ${
                selectedDecision === 'RECOMMEND_EVC_INSPECTION'
                  ? 'border-blue-500 bg-blue-500/10 shadow-sm ring-1 ring-blue-500'
                  : 'border-border bg-card hover:border-text-secondary'
              }`}
            >
              <Building2 size={18} className={`shrink-0 mt-0.5 ${selectedDecision === 'RECOMMEND_EVC_INSPECTION' ? 'text-blue-500' : 'text-text-muted'}`} />
              <div>
                <span className="text-xs font-bold block text-text-primary">Recommend Physical EVC</span>
                <span className="text-[10px] text-text-secondary block mt-0.5 leading-tight">
                  Flag for on-ground physical inspection by Expert Visit Committee.
                </span>
              </div>
            </button>

            {/* 4. Reject / Escalate */}
            <button
              type="button"
              onClick={() => handleDecisionChange('REJECT')}
              className={`p-3 rounded-xl border text-left transition-all flex items-start space-x-2.5 cursor-pointer ${
                selectedDecision === 'REJECT'
                  ? 'border-danger bg-danger-soft/30 shadow-sm ring-1 ring-danger'
                  : 'border-border bg-card hover:border-text-secondary'
              }`}
            >
              <XCircle size={18} className={`shrink-0 mt-0.5 ${selectedDecision === 'REJECT' ? 'text-danger' : 'text-text-muted'}`} />
              <div>
                <span className="text-xs font-bold block text-text-primary">Reject / Escalate to SAC</span>
                <span className="text-[10px] text-text-secondary block mt-0.5 leading-tight">
                  Adverse statutory finding. Escalate to Standing Appellate Committee.
                </span>
              </div>
            </button>

          </div>
        </div>

        {/* Dynamic Context Parameters */}
        {selectedDecision === 'ISSUE_DEFICIENCY_NOTICE' && (
          <div className="bg-app p-3 rounded-xl border border-warning/30 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-text-primary">Rectification Hearing Window:</span>
              <div className="flex items-center space-x-2">
                {[7, 14, 21].map(days => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setDeadlineDays(days)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                      deadlineDays === days 
                        ? 'bg-warning text-black border-warning' 
                        : 'bg-card border-border text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {days} Days
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-text-muted">
              Applicant will be notified to submit attested rectified documentation before the window expires.
            </p>
          </div>
        )}

        {selectedDecision === 'RECOMMEND_EVC_INSPECTION' && (
          <div className="bg-app p-3 rounded-xl border border-blue-500/30 space-y-2 text-xs">
            <span className="font-bold text-text-primary block">Select EVC Physical Inspection Mandate:</span>
            <div className="space-y-1.5">
              {EVC_SCOPE_OPTIONS.map(scope => (
                <label key={scope} className="flex items-center space-x-2 text-text-secondary hover:text-text-primary cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={selectedEvcScopes.includes(scope)}
                    onChange={() => toggleEvcScope(scope)}
                    className="rounded text-primary focus:ring-0"
                  />
                  <span>{scope}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Official Officer Remarks */}
        <div className="space-y-1.5 text-xs">
          <label className="font-bold text-text-primary block uppercase tracking-wider text-[11px]">
            Officer Scrutiny Notes & Statutory Justification:
          </label>
          <textarea
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full p-3 bg-card border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-sans leading-relaxed"
            placeholder="Enter official scrutiny rationale citing APH 2025-26 clauses..."
          />
        </div>

        {/* Officer Signature & Cryptographic Endorsement Block */}
        <div className="p-3 bg-card-subtle rounded-xl border border-border flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary text-white font-black text-[10px] flex items-center justify-center">
              SO
            </div>
            <div>
              <p className="font-bold text-text-primary text-[11px]">{officerName}</p>
              <p className="text-[10px] text-text-muted">{officerRole} &bull; AICTE Regulation Bureau</p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 text-[10px] text-text-muted font-mono">
            <Lock size={12} className="text-emerald-500" />
            <span>SHA-256 Tamper-Evident Sign</span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end space-x-3 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/25 transition-all flex items-center space-x-2 disabled:opacity-50 cursor-pointer active:scale-95"
          >
            {submitting ? (
              <span className="flex items-center space-x-2">
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Recording Order...</span>
              </span>
            ) : (
              <>
                <Send size={14} />
                <span>Seal Statutory Determination</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
