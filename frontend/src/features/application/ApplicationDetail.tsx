import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  AlertTriangle, 
  ExternalLink, 
  UploadCloud,
  CheckCircle, 
  FileQuestion,
  Eye,
  MessageSquare,
  AlertCircle,
  FileText,
  Network,
  ShieldCheck,
  Trash2,
  CheckCircle2,
  Building2,
  XCircle,
  RotateCcw,
  Send
} from 'lucide-react';
import api, { ApplicationDetail, Finding } from '../../lib/api';
import { VisualDocumentInspector } from './VisualDocumentInspector';
import { ClarificationModal } from '../../components/shared/ClarificationModal';
import { OfficerDecisionModal, DecisionType } from '../../components/shared/OfficerDecisionModal';

const EvidenceGraphView = React.lazy(() =>
  import('./EvidenceGraph').then((m) => ({ default: m.EvidenceGraphView }))
);

export const ApplicationDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<ApplicationDetail | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [graphData, setGraphData] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
  const [activeTab, setActiveTab] = useState<'documents' | 'findings' | 'graph'>('documents');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [targetMarkerId, setTargetMarkerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);
  const [clarificationFinding, setClarificationFinding] = useState<Finding | null>(null);
  const [clarificationSuccessMsg, setClarificationSuccessMsg] = useState<string | null>(null);
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [decisionModalType, setDecisionModalType] = useState<DecisionType>('RECOMMEND_APPROVAL');
  const [isSimulatingRectification, setIsSimulatingRectification] = useState(false);
  const [decisionSuccessMsg, setDecisionSuccessMsg] = useState<string | null>(null);

  const handleSimulateRectification = async () => {
    if (!id) return;
    if (window.confirm("Simulate Applicant Rectification Dossier Submission?\n\nThis replaces deficient documents with compliant counterparts and triggers an automated re-validation pass.")) {
      try {
        setIsSimulatingRectification(true);
        const res = await api.post(`/applications/${id}/simulate-rectification`);
        setDecisionSuccessMsg(res.data.message || "Applicant rectified dossier submitted. Re-validation pipeline queued.");
        await fetchData(false);
      } catch (err: any) {
        console.error("Failed to simulate rectification:", err);
        alert(err.response?.data?.detail || "Failed to submit rectified dossier.");
      } finally {
        setIsSimulatingRectification(false);
      }
    }
  };

  const handleDeleteApp = async () => {
    if (!id) return;
    if (window.confirm(`Are you sure you want to permanently delete application "${id}"? All uploaded documents, extracted facts, verifications, and scrutiny findings will be removed.`)) {
      try {
        setDeleting(true);
        await api.delete(`/applications/${id}`);
        navigate('/');
      } catch (err: any) {
        console.error('Failed to delete application:', err);
        alert(err.response?.data?.detail || 'Failed to delete application.');
        setDeleting(false);
      }
    }
  };

  const fetchData = async (isInitial: boolean = false) => {
    if (!id) return;
    try {
      if (isInitial) {
        setLoading(true);
      }
      const [detailRes, findingsRes, graphRes] = await Promise.all([
        api.get<ApplicationDetail>(`/applications/${id}`),
        api.get<Finding[]>(`/applications/${id}/findings`),
        api.get(`/applications/${id}/graph`)
      ]);
      setDetail(detailRes.data);
      setFindings(findingsRes.data);
      setGraphData(graphRes.data);

      const stillAnalyzing =
        ['submitted', 'ai_analysis', 'verification'].includes(detailRes.data.status?.toLowerCase() || '') ||
        detailRes.data.checklist.some((d: any) => d.status === 'analyzing');

      if (!stillAnalyzing) {
        setUploadingDocType(null);
      }

      setSelectedDocId((prev) => {
        if (prev && detailRes.data.checklist.some(d => d.id === prev)) {
          return prev;
        }
        const firstUploaded = detailRes.data.checklist.find(d => d.fileUrl);
        return firstUploaded?.id || detailRes.data.checklist[0]?.id || null;
      });
    } catch (err) {
      console.error(err);
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  };

  const handleUploadDoc = async (docType: string, file: File) => {
    if (!id) return;
    try {
      setUploadingDocType(docType);
      const form = new FormData();
      form.append('doc_type', docType);
      form.append('file', file);
      await api.post(`/applications/${id}/documents`, form);
      await fetchData(false);
    } catch (err) {
      console.error(err);
      setUploadingDocType(null);
    }
  };

  const handleInspectMarkerOnDocument = (f: Finding) => {
    setActiveTab('documents');
    setTargetMarkerId(f.ruleId || f.id);

    let targetDoc = null;
    if (f.docId) {
      targetDoc = detail?.checklist.find(d => d.id === f.docId);
    }
    if (!targetDoc && f.evidence?.primary_doc) {
      const p = f.evidence.primary_doc.toLowerCase();
      targetDoc = detail?.checklist.find(d => 
        d.docType.toLowerCase().includes(p) || p.includes(d.docType.toLowerCase())
      );
    }
    if (!targetDoc && f.evidence?.cross_doc) {
      const c = f.evidence.cross_doc.toLowerCase();
      targetDoc = detail?.checklist.find(d => 
        d.docType.toLowerCase().includes(c) || c.includes(d.docType.toLowerCase())
      );
    }
    if (!targetDoc) {
      targetDoc = detail?.checklist.find(d => d.fileUrl);
    }
    if (targetDoc) {
      setSelectedDocId(targetDoc.id);
    }
  };

  useEffect(() => {
    fetchData(true);
  }, [id]);

  const isPipelineActive =
    !!uploadingDocType ||
    ['submitted', 'ai_analysis', 'verification'].includes(detail?.status?.toLowerCase() || '') ||
    detail?.checklist.some(d => d.status === 'analyzing');

  useEffect(() => {
    if (!isPipelineActive) return;

    const interval = setInterval(async () => {
      await fetchData(false);
    }, 1500);

    return () => clearInterval(interval);
  }, [isPipelineActive, id]);

  if (loading) {
    return <div className="p-8 text-xs text-text-secondary">Loading institutional verification records...</div>;
  }

  if (!detail) {
    return <div className="p-8 text-xs text-danger">Application record not found.</div>;
  }

  // Deduplicate findings by ruleId for clean, non-confusing presentation
  const uniqueFindings = findings.filter(
    (f, index, self) => index === self.findIndex((t) => (t.ruleId || t.id) === (f.ruleId || f.id))
  );

  // Active selected document
  const activeDoc = detail.checklist.find(d => d.id === selectedDocId) 
    || detail.checklist.find(d => d.fileUrl) 
    || detail.checklist[0];

  return (
    <div className="space-y-6">
      {/* Top Clarification Notice Success Toast */}
      {clarificationSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-800 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle size={16} className="text-emerald-600 shrink-0" />
            <span>{clarificationSuccessMsg}</span>
          </div>
          <button 
            onClick={() => setClarificationSuccessMsg(null)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Banner with Institution Profile */}
      <div className="glass-card rounded-2xl border border-border p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Link to="/" className="p-2.5 rounded-xl bg-card-subtle hover:bg-border text-text-secondary hover:text-text-primary transition shadow-sm">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black text-text-primary tracking-tight">{detail.institutionName}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary-soft text-primary border border-primary/20 uppercase">
                {detail.category}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-1 font-mono">
              App ID: <strong className="text-text-secondary">{detail.id}</strong> | Regulation Handbook: AICTE APH 2025-26
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Circular Risk Index Gauge */}
          <div className="flex items-center space-x-3 bg-card-subtle px-3.5 py-1.5 rounded-xl border border-border">
            <div className="relative w-12 h-12 rounded-full flex items-center justify-center p-1">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(${(detail.riskScore ?? 0) > 50 ? '#EF4444' : '#22C55E'} ${detail.riskScore ?? 0}%, var(--border) 0%)`,
                }}
              />
              <div className="relative z-10 w-9 h-9 rounded-full bg-card flex flex-col items-center justify-center shadow-inner">
                <span className={`text-[11px] font-black font-mono leading-none ${(detail.riskScore ?? 0) > 50 ? 'text-danger' : 'text-success'}`}>
                  {detail.riskScore !== null ? `${Math.round(detail.riskScore)}%` : '—'}
                </span>
              </div>
            </div>
            <div className="text-left">
              <span className="text-[9px] text-text-muted uppercase font-bold tracking-wider block">Risk Assessment</span>
              <span className={`text-xs font-bold uppercase ${(detail.riskScore ?? 0) > 50 ? 'text-danger' : 'text-success'}`}>
                {(detail.riskScore ?? 0) > 50 ? 'Review Required' : 'Low Risk'}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              const base = api.defaults.baseURL || '/api';
              window.open(`${base}/applications/${detail.id}/report`, '_blank');
            }}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl transition shadow-md shadow-blue-600/25 active:scale-95 cursor-pointer"
          >
            <FileText size={14} />
            <span>Download Scrutiny Report (PDF)</span>
          </button>

          <button
            onClick={handleDeleteApp}
            disabled={deleting}
            className="flex items-center space-x-1.5 px-3 py-2 border border-danger/40 text-danger hover:bg-danger-soft text-xs font-semibold rounded-xl transition shadow-sm disabled:opacity-50 cursor-pointer"
            title="Delete Application"
          >
            <Trash2 size={14} className={deleting ? 'animate-spin' : ''} />
            <span>{deleting ? 'Deleting...' : 'Delete'}</span>
          </button>
        </div>
      </div>

      {/* Officer Statutory Determination & Next Steps Console */}
      <div className="bg-card rounded-2xl border border-border p-4 shadow-card space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-500/10 text-primary border border-primary/20 rounded-xl">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                  Officer Statutory Scrutiny Determination
                </h3>
                <span className="px-2 py-0.2 rounded-full text-[9px] font-mono font-bold bg-primary-soft text-primary border border-primary/20">
                  AICTE APH 2025-26 Mandate
                </span>
              </div>
              <p className="text-[11px] text-text-muted mt-0.5">
                AI flags are decision-support outputs. Statutory scrutiny, physical inspection recommendations, and final regulatory determinations remain with authorized officials.
              </p>
            </div>
          </div>

          {/* Action Trigger Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => { setDecisionModalType('RECOMMEND_APPROVAL'); setIsDecisionModalOpen(true); }}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
              title="Recommend Application for Extension of Approval"
            >
              <CheckCircle2 size={14} />
              <span>Recommend Approval</span>
            </button>

            <button
              onClick={() => { setDecisionModalType('ISSUE_DEFICIENCY_NOTICE'); setIsDecisionModalOpen(true); }}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 border border-amber-500/30 text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
              title="Dispatch formal deficiency notice and open rectification window"
            >
              <AlertTriangle size={14} />
              <span>Issue Deficiency Notice</span>
            </button>

            <button
              onClick={() => { setDecisionModalType('RECOMMEND_EVC_INSPECTION'); setIsDecisionModalOpen(true); }}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-500/25 border border-blue-500/30 text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
              title="Flag application for physical inspection by Expert Visit Committee"
            >
              <Building2 size={14} />
              <span>Recommend Physical EVC</span>
            </button>

            <button
              onClick={() => { setDecisionModalType('REJECT'); setIsDecisionModalOpen(true); }}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-500/25 border border-red-500/30 text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
              title="Issue adverse scrutiny order and escalate to SAC"
            >
              <XCircle size={14} />
              <span>Reject / SAC Escalate</span>
            </button>
          </div>
        </div>

        {/* Current Active Determination Status Display */}
        {detail.decision && (
          <div className={`p-3.5 rounded-xl border text-xs space-y-2 transition-all ${
            detail.decision === 'RECOMMEND_APPROVAL'
              ? 'bg-success-soft/30 border-success/40 text-success'
              : detail.decision === 'ISSUE_DEFICIENCY_NOTICE'
              ? 'bg-warning-soft/30 border-warning/40 text-warning'
              : detail.decision === 'RECOMMEND_EVC_INSPECTION'
              ? 'bg-blue-500/10 border-blue-500/30 text-primary'
              : 'bg-danger-soft/30 border-danger/40 text-danger'
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                {detail.decision === 'RECOMMEND_APPROVAL' && <CheckCircle2 size={16} className="text-success shrink-0" />}
                {detail.decision === 'ISSUE_DEFICIENCY_NOTICE' && <AlertTriangle size={16} className="text-warning shrink-0" />}
                {detail.decision === 'RECOMMEND_EVC_INSPECTION' && <Building2 size={16} className="text-primary shrink-0" />}
                {detail.decision === 'REJECT' && <XCircle size={16} className="text-danger shrink-0" />}
                <span className="font-bold uppercase tracking-wider text-text-primary">
                  {detail.decision === 'RECOMMEND_APPROVAL' && 'Statutory Endorsement: Recommended for Approval (EoA)'}
                  {detail.decision === 'ISSUE_DEFICIENCY_NOTICE' && 'Formal Deficiency Notice Dispatched (Rectification Loop Active)'}
                  {detail.decision === 'RECOMMEND_EVC_INSPECTION' && 'Expert Visit Committee (EVC) Physical Inspection Mandated'}
                  {detail.decision === 'REJECT' && 'Adverse Scrutiny Order: Application Rejected / Escalated to SAC'}
                </span>
                <span className="text-[10px] font-mono opacity-80">
                  &bull; Version v{detail.version || 1}
                </span>
              </div>

              {/* Rectification Loop Action if Deficiency Notice is active */}
              {detail.decision === 'ISSUE_DEFICIENCY_NOTICE' && (
                <button
                  type="button"
                  onClick={handleSimulateRectification}
                  disabled={isSimulatingRectification}
                  className="px-3 py-1.5 bg-warning hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  title="Simulate institution applicant uploading corrected affidavit & NOC"
                >
                  <RotateCcw size={13} className={isSimulatingRectification ? 'animate-spin' : ''} />
                  <span>{isSimulatingRectification ? 'Re-Validating...' : 'Simulate Applicant Rectification Dossier'}</span>
                </button>
              )}
            </div>

            {detail.decisionRemarks && (
              <p className="text-[11px] text-text-secondary leading-relaxed pl-6 italic">
                &ldquo;{detail.decisionRemarks}&rdquo;
              </p>
            )}

            <div className="text-[10px] text-text-muted pl-6 flex items-center space-x-2 font-mono">
              <span>Recorded by: <strong className="text-text-secondary">{detail.decisionBy || 'Scrutiny Officer'}</strong></span>
              {detail.decisionAt && <span>&bull; {new Date(detail.decisionAt).toLocaleString()}</span>}
            </div>
          </div>
        )}

        {/* Success toast if present */}
        {decisionSuccessMsg && (
          <div className="p-2.5 rounded-lg bg-success-soft border border-success/30 text-success text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 size={14} />
              <span>{decisionSuccessMsg}</span>
            </div>
            <button onClick={() => setDecisionSuccessMsg(null)} className="text-[10px] underline font-bold cursor-pointer">Dismiss</button>
          </div>
        )}
      </div>

      {/* Modern Segmented Controller Tabs */}
      <div className="flex border-b border-border/80 space-x-2 text-xs font-semibold pb-1">
        <button
          onClick={() => { setActiveTab('documents'); setTargetMarkerId(null); }}
          className={`px-4 py-2 rounded-xl transition-all flex items-center space-x-2 cursor-pointer ${
            activeTab === 'documents'
              ? 'bg-primary text-white shadow-md shadow-primary/25 font-bold'
              : 'text-text-secondary hover:text-text-primary hover:bg-card-subtle'
          }`}
        >
          <FileText size={15} />
          <span>Statutory Documents ({detail.checklist.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('findings')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center space-x-2 cursor-pointer ${
            activeTab === 'findings'
              ? 'bg-primary text-white shadow-md shadow-primary/25 font-bold'
              : 'text-text-secondary hover:text-text-primary hover:bg-card-subtle'
          }`}
        >
          <AlertTriangle size={15} className={uniqueFindings.length > 0 ? 'text-amber-300' : ''} />
          <span>Regulatory Findings</span>
          {uniqueFindings.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${activeTab === 'findings' ? 'bg-white text-primary' : 'bg-danger text-white'}`}>
              {uniqueFindings.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('graph')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center space-x-2 cursor-pointer ${
            activeTab === 'graph'
              ? 'bg-primary text-white shadow-md shadow-primary/25 font-bold'
              : 'text-text-secondary hover:text-text-primary hover:bg-card-subtle'
          }`}
        >
          <Network size={15} />
          <span>Evidence Graph ({graphData.nodes.length})</span>
        </button>
      </div>

      {/* TAB 1: Document Checklist & Exact Line-Level Visual Inspector */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          {/* Defined Role Subtitle Banner */}
          <div className="bg-card rounded-card border border-border p-3.5 shadow-card flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-primary-soft text-primary rounded-lg shrink-0">
                <FileText size={18} />
              </div>
              <div>
                <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider">
                  Document Checklist & Exact Line-Level Visual Inspector
                </h3>
                <p className="text-text-muted text-[11px] mt-0.5">
                  Verify mandatory document completeness on the left. In the right inspector, review high-resolution pages with in-place bounding boxes pinpointing exact lines and figures.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-[11px]">
              <span className="text-text-muted">Statutory Verification:</span>
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-300">
                {detail.checklist.filter(c => c.status === 'verified').length} / {detail.checklist.length} Verified
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column A: Document Checklist */}
            <div className="bg-card rounded-card border border-border p-4 shadow-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                  Mandatory Checklist
                </h3>
              </div>

              {isPipelineActive && (
                <div className="mb-2 p-2 bg-primary-soft rounded border border-primary/30 text-[10px] text-primary flex items-center space-x-2 animate-pulse">
                  <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                  <span>AI Scrutiny Pipeline Running (Extracting OCR & Cross-Checking Rules)...</span>
                </div>
              )}

              <div className="space-y-2">
                {detail.checklist.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => {
                      setSelectedDocId(doc.id);
                      setTargetMarkerId(null);
                    }}
                    className={`p-3 rounded-lg border text-xs flex items-center justify-between transition cursor-pointer ${
                      activeDoc?.id === doc.id
                        ? 'border-primary bg-primary-soft/30 ring-1 ring-primary/40'
                        : 'border-border bg-app hover:bg-border/40'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      {doc.status === 'verified' ? (
                        <CheckCircle size={15} className="text-success shrink-0" />
                      ) : doc.status === 'issues_found' ? (
                        <AlertTriangle size={15} className="text-warning shrink-0" />
                      ) : doc.status === 'analyzing' ? (
                        <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                      ) : (
                        <FileQuestion size={15} className="text-text-muted shrink-0" />
                      )}
                      <div className="truncate">
                        <p className="font-semibold text-text-primary leading-snug truncate">{doc.docType}</p>
                        <p className="text-[10px] text-text-muted capitalize">
                          Status: <span className={
                            doc.status === 'verified' ? 'text-success font-semibold' :
                            doc.status === 'issues_found' ? 'text-warning font-semibold' :
                            doc.status === 'analyzing' ? 'text-primary font-semibold animate-pulse' : 'text-text-muted'
                          }>
                            {doc.status === 'analyzing' ? 'Analyzing...' : doc.status.replace('_', ' ')}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {doc.fileUrl ? (
                        <>
                          <Eye size={13} className="text-text-secondary" />
                          <label 
                            onClick={(e) => e.stopPropagation()} 
                            className="cursor-pointer p-1 rounded hover:bg-border text-text-muted hover:text-text-primary transition"
                            title="Replace Document"
                          >
                            <UploadCloud size={13} />
                            <input
                              type="file"
                              accept=".pdf"
                              className="hidden"
                              onChange={(e) => e.target.files?.[0] && handleUploadDoc(doc.docType, e.target.files[0])}
                            />
                          </label>
                        </>
                      ) : (
                        <label 
                          onClick={(e) => e.stopPropagation()} 
                          className="cursor-pointer px-2 py-0.5 rounded text-[10px] font-bold bg-primary text-white hover:bg-blue-700 transition flex items-center space-x-1"
                        >
                          <UploadCloud size={11} />
                          <span>Upload</span>
                          <input
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && handleUploadDoc(doc.docType, e.target.files[0])}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column B & C: Visual Document Inspector (Direct In-Place Line Highlight Layer) */}
            <div className="lg:col-span-2 bg-card rounded-card border border-border shadow-card p-4 flex flex-col justify-between min-h-[550px]">
              {activeDoc && activeDoc.fileUrl ? (
                <VisualDocumentInspector
                  key={activeDoc.id}
                  appId={id!}
                  doc={activeDoc}
                  targetMarkerId={targetMarkerId}
                  onRequestClarification={(marker) => {
                    const matched = findings.find(f => (f.ruleId && marker.rule_id === f.ruleId) || f.id === marker.id);
                    setClarificationFinding(matched || {
                      id: marker.id,
                      title: marker.title,
                      severity: (marker.severity as any) || 'critical',
                      description: marker.description || marker.title,
                      tags: [],
                      clauseRef: marker.clause_ref,
                      ruleId: marker.rule_id,
                      suggestedFix: marker.remediation
                    });
                  }}
                  onViewAllFindings={() => setActiveTab('findings')}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-text-muted text-xs min-h-[480px]">
                  <Eye size={36} className="mb-2 text-text-muted/60" />
                  <p className="font-medium text-text-secondary">
                    {activeDoc ? `No document file uploaded yet for ${activeDoc.docType}` : 'Select a document to inspect'}
                  </p>
                  <p className="text-[11px] mt-1 max-w-md">
                    Upload a statutory PDF on the left checklist to inspect high-resolution vector pages with in-place line-error markers.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AI Findings & Regulatory Clause Decision-Support Ledger */}
      {activeTab === 'findings' && (
        <div className="space-y-4">
          {/* Defined Role Subtitle Banner */}
          <div className="bg-card rounded-card border border-border p-3.5 shadow-card flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-danger-soft text-danger rounded-lg shrink-0">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider">
                  AICTE APH 2025-26 Regulatory Scrutiny Ledger & Clause Decision-Support
                </h3>
                <p className="text-text-muted text-[11px] mt-0.5">
                  Formal audit ledger cross-referencing handbook statutory clauses, side-by-side conflicting quotes, root-cause explanations, and official inquiry dispatch.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                uniqueFindings.length > 0 ? 'bg-danger-soft text-danger border border-danger/30' : 'bg-success-soft text-success'
              }`}>
                {uniqueFindings.length} Potential Anomal{uniqueFindings.length === 1 ? 'y' : 'ies'} / Deficiencies Flagged
              </span>
              {uniqueFindings.length > 0 ? (
                <button
                  type="button"
                  onClick={() => { setDecisionModalType('ISSUE_DEFICIENCY_NOTICE'); setIsDecisionModalOpen(true); }}
                  className="px-2.5 py-1 rounded-lg bg-warning hover:bg-amber-400 text-black font-bold text-xs flex items-center space-x-1 cursor-pointer shadow-sm transition"
                  title="Dispatch consolidated deficiency notice under APH Sec 4.5"
                >
                  <Send size={12} />
                  <span>Issue Deficiency Directive</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setDecisionModalType('RECOMMEND_APPROVAL'); setIsDecisionModalOpen(true); }}
                  className="px-2.5 py-1 rounded-lg bg-success hover:bg-emerald-600 text-white font-bold text-xs flex items-center space-x-1 cursor-pointer shadow-sm transition"
                  title="Recommend application for approval"
                >
                  <CheckCircle2 size={12} />
                  <span>Recommend Approval</span>
                </button>
              )}
            </div>
          </div>

          {/* Statutory Advisory Due-Process Guardrail */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs text-text-secondary flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldCheck size={15} className="text-primary shrink-0" />
              <span className="text-[11px] text-text-primary">
                <strong>Statutory Guardrail:</strong> All automated findings are preliminary advisory indicators. Scrutiny, inspections, and final decisions remain strictly with competent AICTE authorities.
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-card border border-border text-[10px] font-mono text-text-muted font-bold">
              APH 2025-26 CITED
            </span>
          </div>

          {uniqueFindings.length === 0 ? (
            <div className="bg-card rounded-card border border-border p-8 text-center text-xs text-text-muted">
              <CheckCircle size={32} className="mx-auto mb-2 text-success" />
              <p className="font-bold text-text-primary">No Regulatory Deficiencies Detected</p>
              <p className="mt-1">All extracted facts and statutory seals satisfy the AICTE Approval Process Handbook (APH 2025-26) criteria.</p>
            </div>
          ) : (
            uniqueFindings.map((f) => (
              <div 
                key={f.id}
                className={`glass-card rounded-2xl border-l-4 p-5 space-y-4 transition-all duration-200 hover:border-r-border/80 ${
                  f.severity === 'critical' 
                    ? 'border-l-danger shadow-danger-glow' 
                    : f.severity === 'high'
                    ? 'border-l-orange'
                    : 'border-l-warning'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wide border ${
                      f.severity === 'critical' 
                        ? 'bg-danger-soft text-danger border-danger/30' 
                        : f.severity === 'high'
                        ? 'bg-orange-soft text-orange border-orange/30'
                        : 'bg-warning-soft text-warning border-warning/30'
                    }`}>
                      {f.severity}
                    </span>
                    <h3 className="text-sm font-black text-text-primary tracking-tight">{f.title}</h3>
                  </div>
                  <span className="text-[11px] font-mono text-text-muted">
                    Clause: <strong className="text-primary font-bold">{f.clauseRef}</strong>
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-text-secondary leading-relaxed">{f.description}</p>

                {/* Exact Matching Sources & Root Cause */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Matching Document Sources */}
                  <div className="bg-card-subtle border border-border/80 p-3.5 rounded-xl space-y-2">
                    <div className="flex items-center space-x-1.5 text-primary font-bold text-[11px] uppercase tracking-wider">
                      <FileText size={13} />
                      <span>Exact Document Sources & Citations</span>
                    </div>

                    {f.evidence?.primary_doc && (
                      <div className="text-[11px] space-y-0.5">
                        <span className="text-text-muted block text-[10px] font-semibold">Primary Source:</span>
                        <p className="font-semibold text-text-primary">{f.evidence.primary_doc}</p>
                        {f.evidence.phrase && (
                          <p className="italic text-text-secondary font-mono bg-card p-1.5 rounded-lg border border-border text-[10px]">
                            "{f.evidence.phrase}" ({f.evidence.line_ref || 'Page 1'})
                          </p>
                        )}
                      </div>
                    )}

                    {f.evidence?.cross_doc && (
                      <div className="text-[11px] space-y-0.5 pt-1 border-t border-border/60">
                        <span className="text-text-muted block text-[10px] font-semibold">Cross-Referenced Source:</span>
                        <p className="font-semibold text-text-primary">{f.evidence.cross_doc}</p>
                        {f.evidence.cross_phrase && (
                          <p className="italic text-text-secondary font-mono bg-card p-1.5 rounded-lg border border-border text-[10px]">
                            "{f.evidence.cross_phrase}" ({f.evidence.cross_line_ref || 'Page 1'})
                          </p>
                        )}
                      </div>
                    )}

                    {/* Sources pills from analysis */}
                    {f.analysis?.sources && f.analysis.sources.length > 0 && (
                      <div className="pt-1 flex flex-wrap gap-1">
                        {f.analysis.sources.map((s, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded-md bg-primary-soft text-primary text-[9px] font-semibold border border-primary/20 font-mono">
                            {s.doc_type || s.doc || 'Doc'}: {s.field || 'Evidence'} = {String(s.value || s.phrase || '')}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Why This Happened (Root Cause) */}
                  <div className="bg-amber-500/10 border border-amber-500/25 p-3.5 rounded-xl space-y-1.5">
                    <div className="flex items-center space-x-1.5 text-amber-500 font-bold text-[11px] uppercase tracking-wider">
                      <AlertCircle size={13} />
                      <span>Why This Happened (Root Cause)</span>
                    </div>
                    <p className="text-text-primary text-xs leading-relaxed">
                      {f.analysis?.why_happened || f.analysis?.explanation || f.description}
                    </p>
                    <div className="pt-1 text-[10px] text-text-muted font-mono">
                      Evaluated deterministically by regulatory rule engine against AICTE Handbook standards.
                    </div>
                  </div>
                </div>

                {/* Recommended Remediation Directive */}
                {f.suggestedFix && (
                  <div className="border-l-4 border-primary pl-3.5 py-2 text-xs bg-primary-soft/40 rounded-r-xl border border-primary/20">
                    <strong className="text-primary block text-[11px] uppercase tracking-wider font-bold">
                      Recommended Remediation Directive:
                    </strong>
                    <span className="text-text-secondary leading-relaxed mt-0.5 block">{f.suggestedFix}</span>
                  </div>
                )}

                {/* Actions Footer */}
                <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-text-muted">
                  <span>Official AICTE Verification Finding. Traceable to original uploaded records.</span>
                  <div className="flex items-center space-x-2">
                    {f.clarificationDispatched ? (
                      <span className="px-3 py-1 rounded bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center space-x-1 border border-emerald-300">
                        <CheckCircle size={12} />
                        <span>Clarification Notice Sent</span>
                      </span>
                    ) : (
                      <button 
                        type="button"
                        onClick={() => setClarificationFinding(f)}
                        className="px-3 py-1 rounded bg-primary text-white font-semibold hover:bg-blue-700 transition flex items-center space-x-1"
                      >
                        <MessageSquare size={12} />
                        <span>Request Clarification</span>
                      </button>
                    )}

                    <button 
                      type="button"
                      onClick={() => handleInspectMarkerOnDocument(f)}
                      className="px-2.5 py-1 rounded bg-app border border-border font-semibold hover:bg-border transition text-primary hover:text-blue-700 flex items-center space-x-1"
                    >
                      <Eye size={12} />
                      <span>Inspect Marker on Document</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: Cross-Document Evidence & Entity Resolution Graph */}
      {activeTab === 'graph' && (
        <div className="space-y-4">
          <div className="bg-card rounded-card border border-border p-3.5 shadow-card flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 shrink-0">
                <Network size={18} />
              </div>
              <div>
                <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider">
                  Cross-Document Evidence & Entity Resolution Graph
                </h3>
                <p className="text-text-muted text-[11px] mt-0.5">
                  Dynamic knowledge graph mapping verified extracted facts to original statutory records, external verification registries, and real-time contradiction edges.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded bg-primary-soft text-primary font-bold">
              {graphData.nodes.length} Verified Facts & Entities Linked
            </span>
          </div>

          <React.Suspense fallback={
            <div className="w-full min-h-[580px] bg-card-subtle/50 rounded-2xl border border-border flex flex-col items-center justify-center p-8 text-center animate-pulse">
              <div className="w-9 h-9 border-3 border-primary border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs font-bold text-text-primary">Loading Interactive Evidence Graph...</p>
              <p className="text-[11px] text-text-muted mt-1">Initializing graph engine and statutory entity nodes</p>
            </div>
          }>
            <EvidenceGraphView 
              data={graphData} 
              onSelectDoc={(docType) => {
                setActiveTab('documents');
                setTargetMarkerId(null);
                const matched = detail.checklist.find(d => 
                  d.docType.toLowerCase().includes(docType.toLowerCase()) || 
                  docType.toLowerCase().includes(d.docType.toLowerCase())
                );
                if (matched) {
                  setSelectedDocId(matched.id);
                }
              }} 
            />
          </React.Suspense>
        </div>
      )}

      {/* Clarification Modal Dialog */}
      {clarificationFinding && (
        <ClarificationModal
          isOpen={!!clarificationFinding}
          appId={id!}
          finding={clarificationFinding}
          onClose={() => setClarificationFinding(null)}
          onDispatched={(findingId, noticeNo) => {
            setFindings(prev => prev.map(f => f.id === findingId ? { ...f, clarificationDispatched: true } : f));
            setClarificationSuccessMsg(`Clarification Notice ${noticeNo} successfully dispatched to institution authority.`);
            setClarificationFinding(null);
          }}
        />
      )}

      {/* Officer Determination Modal */}
      {isDecisionModalOpen && detail && (
        <OfficerDecisionModal
          isOpen={isDecisionModalOpen}
          appDetail={detail}
          findings={findings}
          initialDecision={decisionModalType}
          onClose={() => setIsDecisionModalOpen(false)}
          onSuccess={() => {
            setDecisionSuccessMsg("Official scrutiny determination recorded and appended to SHA-256 audit ledger.");
            fetchData(false);
          }}
        />
      )}
    </div>
  );
};
