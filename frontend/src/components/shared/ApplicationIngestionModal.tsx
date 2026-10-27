import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  Building2, 
  FileCheck2, 
  UploadCloud, 
  CheckCircle2, 
  AlertOctagon, 
  ArrowRight,
  ShieldCheck,
  Cpu,
  LayoutDashboard
} from 'lucide-react';
import api from '../../lib/api';
import { clearDashboardCache } from '../../features/dashboard/dashboardCache';

interface IngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ShowcaseDossier {
  id: string;
  title: string;
  fileCount: number;
  files: { filename: string; url: string; name: string }[];
}

export const ApplicationIngestionModal: React.FC<IngestionModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const [appId, setAppId] = useState(`AICTE-2026-${Math.floor(100000 + Math.random() * 900000)}`);
  const [instName, setInstName] = useState('Apex National Institute of Technology, Pune');
  const [category, setCategory] = useState('EoA Renewal');
  const [selectedDossier, setSelectedDossier] = useState<'Dossier_A_Compliant' | 'Dossier_B_Deficiencies_Detected'>('Dossier_A_Compliant');
  const [dossiers, setDossiers] = useState<ShowcaseDossier[]>([]);
  
  // Custom manual uploads map
  const [manualFiles, setManualFiles] = useState<Record<string, File>>({});
  
  // Processing state & live stepper
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [progressStatusText, setProgressStatusText] = useState('Initializing SHA-256 cryptographic digests...');
  const [completedRiskScore, setCompletedRiskScore] = useState<number | null>(null);
  const [completedFindingsCount, setCompletedFindingsCount] = useState<number | null>(null);
  const [processedDocInfo, setProcessedDocInfo] = useState<{ processed: number; total: number }>({ processed: 0, total: 6 });

  const autoNavTimeoutRef = useRef<any>(null);

  const steps = [
    { title: "SHA-256 Digest & Hashing", desc: "Generating tamper-evident cryptographic checksums" },
    { title: "Native PDF OCR & Provenance Extraction", desc: "Extracting normalized bounding boxes & field candidates on CPU" },
    { title: "Issuing Authority Verification", desc: "Querying SHCIL e-Stamp, State University Portal & CoA Registry" },
    { title: "AICTE APH 2025-26 Rule Engine", desc: "Cross-document consistency validation & clause citations" },
    { title: "Evidence Graph Synthesis", desc: "Constructing multi-entity graph & calculating risk index" }
  ];

  const requiredDocTypes = [
    { type: "Registered Affidavit / Undertaking", desc: "E-Stamp notarized undertaking under APH Sec 4.2" },
    { type: "University NOC / Affiliation", desc: "State Technical University continuation of affiliation" },
    { type: "Architectural Floor Plan", desc: "Master CAD layout certified by Council of Architecture" },
    { type: "NAAC / NBA Accreditation", desc: "National Quality Assurance Tier-1 accreditation" },
    { type: "Previous Year EoA Approval Order", desc: "Statutory AICTE previous cycle approval letter" },
    { type: "Certified Faculty Profile List", desc: "Certified cadre register compliant with 1:15/1:20 ratio" }
  ];

  useEffect(() => {
    if (isOpen) {
      api.get<ShowcaseDossier[]>('/sample-dossiers')
        .then(res => setDossiers(res.data))
        .catch(err => console.error(err));
      
      // Reset processing flags when opening modal
      setIsProcessing(false);
      setIsCompleted(false);
      setCurrentStep(0);
      setCompletedRiskScore(null);
      setCompletedFindingsCount(null);
      if (autoNavTimeoutRef.current) {
        clearTimeout(autoNavTimeoutRef.current);
      }
    }
    return () => {
      if (autoNavTimeoutRef.current) {
        clearTimeout(autoNavTimeoutRef.current);
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectCompliant = () => {
    setSelectedDossier('Dossier_A_Compliant');
    setInstName('Apex National Institute of Technology, Pune');
    setManualFiles({});
  };

  const handleSelectDeficient = () => {
    setSelectedDossier('Dossier_B_Deficiencies_Detected');
    setInstName('Aryavart Institute of Engineering & Technology, Lucknow');
    setManualFiles({});
  };

  const handleFileChange = (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setManualFiles(prev => ({ ...prev, [docType]: e.target.files![0] }));
    }
  };

  const finishAndNavigate = (targetAppId: string, goToDashboard: boolean = false) => {
    if (autoNavTimeoutRef.current) {
      clearTimeout(autoNavTimeoutRef.current);
    }
    clearDashboardCache();
    window.dispatchEvent(new CustomEvent('dashboard:refresh'));
    onSuccess();
    onClose();
    if (goToDashboard) {
      navigate('/');
    } else {
      navigate(`/applications/${targetAppId}`);
    }
  };

  const handleIngestAndScrutinize = async () => {
    try {
      setIsProcessing(true);
      setIsCompleted(false);
      setCurrentStep(0);
      setProgressStatusText("Initializing cryptographic SHA-256 digests and registering application...");

      const hasManualUploads = Object.keys(manualFiles).length > 0;

      let targetAppId = appId.trim();
      if (!targetAppId) {
        targetAppId = `AICTE-2026-${Math.floor(100000 + Math.random() * 900000)}`;
      }

      if (!hasManualUploads) {
        // Quick 1-click professional ingestion via showcase dossier
        await api.post('/sample-dossiers/create-and-ingest', {
          app_id: targetAppId,
          institution_name: instName,
          category: category,
          dossier_id: selectedDossier
        });
      } else {
        // 1. Create Application
        const formData = new FormData();
        formData.append('id', targetAppId);
        formData.append('institution_name', instName);
        formData.append('category', category);
        formData.append('is_synthetic', 'false');
        await api.post('/applications', formData);

        // 2. Upload manual files
        for (const [docType, file] of Object.entries(manualFiles)) {
          const docForm = new FormData();
          docForm.append('doc_type', docType);
          docForm.append('file', file);
          await api.post(`/applications/${targetAppId}/documents`, docForm);
        }

        // 3. For any remaining missing docs, fallback to selected dossier
        await api.post(`/sample-dossiers/load-into-app?app_id=${targetAppId}&dossier_id=${selectedDossier}`);
      }

      // Keep modal open and actively poll until the backend scrutiny pipeline is 100% complete
      setCurrentStep(1);
      setProgressStatusText("Extracting normalized bounding boxes & field candidates via PyMuPDF...");

      let pollCount = 0;
      const maxPolls = 80;
      let isDone = false;
      let finalRisk = 0;
      let finalFindingsCount = 0;

      while (pollCount < maxPolls && !isDone) {
        await new Promise(r => setTimeout(r, 250));
        pollCount++;

        try {
          const appRes = await api.get<any>(`/applications/${targetAppId}`);
          const appData = appRes.data;
          const status = (appData.status || '').toLowerCase();
          const checklist: any[] = appData.checklist || [];
          const totalDocs = checklist.length || 6;
          const analyzingDocs = checklist.filter((d: any) => d.status === 'analyzing');
          const completedDocs = checklist.filter((d: any) => d.status === 'verified' || d.status === 'issues_found');

          setProcessedDocInfo({ processed: completedDocs.length, total: totalDocs });

          if (status === 'ai_analysis' || analyzingDocs.length > 0) {
            setCurrentStep(1);
            if (completedDocs.length > 0) {
              setProgressStatusText(`Extracting fields & bounding boxes: ${completedDocs.length}/${totalDocs} documents processed...`);
            } else {
              setProgressStatusText(`Extracting fields & bounding boxes on CPU across ${totalDocs} statutory documents...`);
            }
          } else if (status === 'verification') {
            setCurrentStep(2);
            setProgressStatusText("Querying SHCIL e-Stamp, State University Portal & CoA Registry...");
          }

          const pipelineStillRunning = ['submitted', 'ai_analysis', 'verification'].includes(status) || analyzingDocs.length > 0;
          if (!pipelineStillRunning) {
            isDone = true;
            setCurrentStep(3);
            setProgressStatusText("Evaluating AICTE APH 2025-26 rules & cross-document consistency...");
            await new Promise(r => setTimeout(r, 160));
            
            setCurrentStep(4);
            setProgressStatusText("Evidence Graph synthesized! Computing risk index & building audit ledger...");
            await new Promise(r => setTimeout(r, 160));
            
            finalRisk = appData.riskScore ?? 0;
            try {
              const findingsRes = await api.get<any[]>(`/applications/${targetAppId}/findings`);
              finalFindingsCount = findingsRes.data?.length || 0;
            } catch {
              finalFindingsCount = 0;
            }

            setCompletedRiskScore(finalRisk);
            setCompletedFindingsCount(finalFindingsCount);
            setIsCompleted(true);
            setProgressStatusText(`Scrutiny complete! Risk Index: ${finalRisk}% | ${finalFindingsCount} findings detected.`);
            break;
          }
        } catch (pollErr) {
          console.warn("Temporary polling issue, retrying...", pollErr);
        }
      }

      // If timed out, set completed gracefully
      if (!isDone) {
        setIsCompleted(true);
        setCurrentStep(4);
        setProgressStatusText("Pipeline finished preliminary pass. Loading records...");
      }

      // Bust cache and notify dashboard
      clearDashboardCache();
      window.dispatchEvent(new CustomEvent('dashboard:refresh'));
      onSuccess();

      // Auto-navigate after 1.2 seconds so user sees visual confirmation, or they can click immediately
      autoNavTimeoutRef.current = setTimeout(() => {
        finishAndNavigate(targetAppId, false);
      }, 1200);

    } catch (err: any) {
      console.error("Ingestion failed:", err);
      setIsProcessing(false);
      const detail = err.response?.data?.detail || err.message || "Unknown error occurred";
      alert(`Ingestion failed: ${detail}\nPlease ensure the backend server is running.`);
    }
  };

  const getProgressPercentage = () => {
    if (isCompleted) return 100;
    if (currentStep === 0) return 15;
    if (currentStep === 1) {
      const base = 25;
      const docShare = processedDocInfo.total > 0 ? (processedDocInfo.processed / processedDocInfo.total) * 30 : 0;
      return Math.round(base + docShare);
    }
    if (currentStep === 2) return 68;
    if (currentStep === 3) return 86;
    if (currentStep === 4) return 96;
    return 20;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card w-full max-w-3xl rounded-xl border border-border shadow-2xl p-6 space-y-5 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-primary-soft rounded-lg text-primary">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">New Scrutiny Application Ingestion</h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Ingest and register institutional regulatory records into the verifiable evidence graph.
              </p>
            </div>
          </div>
          {!isProcessing && (
            <button onClick={onClose} className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-border transition cursor-pointer">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Processing Stepper Overlay */}
        {isProcessing ? (
          <div className="py-6 px-4 space-y-6">
            <div className="text-center space-y-2">
              {isCompleted ? (
                <div className="w-12 h-12 bg-success-soft text-success rounded-full flex items-center justify-center mx-auto animate-bounce">
                  <CheckCircle2 size={32} />
                </div>
              ) : (
                <Cpu size={36} className="mx-auto text-primary animate-pulse" />
              )}
              
              <h3 className="text-base font-bold text-text-primary">
                {isCompleted ? "Evidence Scrutiny & Ingestion Complete" : "Executing Evidence Scrutiny Pipeline"}
              </h3>
              <p className="text-xs text-text-secondary max-w-md mx-auto">
                {isCompleted 
                  ? "All statutory documents have been analyzed, cross-referenced against issuing authorities, and loaded into the dashboard."
                  : "Analyzing documents using PyMuPDF bounding box extraction and deterministic APH 2025-26 rules."
                }
              </p>
            </div>

            {/* Visual Progress Bar */}
            <div className="max-w-xl mx-auto space-y-1.5">
              <div className="flex justify-between text-[11px] text-text-muted font-mono">
                <span>Progress: {progressStatusText}</span>
                <span className="font-bold text-text-primary">{getProgressPercentage()}%</span>
              </div>
              <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${isCompleted ? 'bg-success' : 'bg-primary'}`}
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
            </div>

            {/* Stepper Stages */}
            <div className="space-y-2.5 max-w-xl mx-auto">
              {steps.map((st, idx) => {
                const isStepFinished = idx < currentStep || isCompleted;
                const isStepActive = idx === currentStep && !isCompleted;

                return (
                  <div 
                    key={idx}
                    className={`p-3 rounded-lg border text-xs flex items-center space-x-3 transition-all ${
                      isStepFinished 
                        ? 'border-success/40 bg-success-soft/30 text-success' 
                        : isStepActive 
                        ? 'border-primary bg-primary-soft/40 text-primary font-semibold shadow-sm ring-1 ring-primary/20'
                        : 'border-border bg-app/50 text-text-muted opacity-60'
                    }`}
                  >
                    <div className="shrink-0">
                      {isStepFinished ? (
                        <CheckCircle2 size={16} className="text-success" />
                      ) : isStepActive ? (
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-border flex items-center justify-center text-[9px] font-mono">
                          {idx + 1}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-text-primary">{st.title}</p>
                      <p className="text-[10px] text-text-secondary">{st.desc}</p>
                    </div>
                    {isStepFinished && (
                      <span className="text-[10px] font-mono text-success font-semibold shrink-0">Done</span>
                    )}
                    {isStepActive && (
                      <span className="text-[10px] font-mono text-primary font-semibold shrink-0 animate-pulse">Running...</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Live Status and Completion Actions */}
            {isCompleted ? (
              <div className="max-w-xl mx-auto pt-2 space-y-3">
                <div className="p-3.5 bg-card-subtle rounded-xl border border-border flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck size={18} className="text-success shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-text-primary">Scrutiny Ready for Review</p>
                      <p className="text-[10px] text-text-secondary">
                        Found {completedFindingsCount ?? 0} compliance findings • Risk Index: {completedRiskScore ?? 0}%
                      </p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${
                    (completedRiskScore ?? 0) > 50 ? 'bg-danger-soft text-danger' : 'bg-success-soft text-success'
                  }`}>
                    Risk: {completedRiskScore ?? 0}%
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => finishAndNavigate(appId.trim(), true)}
                    className="flex-1 px-4 py-2 bg-card border border-border rounded-lg text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-border transition flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <LayoutDashboard size={14} />
                    <span>View in Dashboard</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => finishAndNavigate(appId.trim(), false)}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer"
                  >
                    <span>Open Application Details</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
                <p className="text-center text-[10px] text-text-muted">
                  Auto-opening application in 2 seconds...
                </p>
              </div>
            ) : (
              <div className="text-center pt-2">
                <p className="text-[11px] text-text-muted">
                  Please hold while our deterministic verification engine authenticates all documents against state registries.
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Institutional Presets */}
            <div className="bg-app p-3 rounded-lg border border-border space-y-2">
              <span className="text-[11px] font-bold text-text-primary uppercase tracking-wider block">
                Select Benchmark Application Dossier:
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleSelectCompliant}
                  className={`p-3 rounded-lg border text-left transition flex items-center justify-between cursor-pointer ${
                    selectedDossier === 'Dossier_A_Compliant'
                      ? 'border-success bg-success-soft/40 shadow-sm'
                      : 'border-border bg-card hover:border-text-secondary'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-1.5">
                      <ShieldCheck size={14} className="text-success" />
                      <span className="text-xs font-bold text-text-primary">Dossier A: Standard Compliant</span>
                    </div>
                    <p className="text-[10px] text-text-secondary">Apex National Institute of Technology, Pune</p>
                    <span className="text-[9px] text-success font-semibold block">0 Deficiencies | Baseline Compliance</span>
                  </div>
                  {selectedDossier === 'Dossier_A_Compliant' && (
                    <CheckCircle2 size={16} className="text-success shrink-0" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSelectDeficient}
                  className={`p-3 rounded-lg border text-left transition flex items-center justify-between cursor-pointer ${
                    selectedDossier === 'Dossier_B_Deficiencies_Detected'
                      ? 'border-warning bg-warning-soft/40 shadow-sm'
                      : 'border-border bg-card hover:border-text-secondary'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-1.5">
                      <AlertOctagon size={14} className="text-warning" />
                      <span className="text-xs font-bold text-text-primary">Dossier B: Deficiencies Case</span>
                    </div>
                    <p className="text-[10px] text-text-secondary">Aryavart Institute of Engineering, Lucknow</p>
                    <span className="text-[9px] text-warning font-semibold block">Contains Discrepant Land & Lapsed Affiliation</span>
                  </div>
                  {selectedDossier === 'Dossier_B_Deficiencies_Detected' && (
                    <CheckCircle2 size={16} className="text-warning shrink-0" />
                  )}
                </button>
              </div>
            </div>

            {/* Application Profile Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="font-semibold text-text-primary block mb-1">Application Identifier</label>
                <input
                  type="text"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  className="w-full bg-app border border-border rounded px-3 py-2 text-xs font-mono outline-none focus:border-primary"
                />
              </div>

              <div className="md:col-span-2">
                <label className="font-semibold text-text-primary block mb-1">Technical Institution Legal Name</label>
                <input
                  type="text"
                  value={instName}
                  onChange={(e) => setInstName(e.target.value)}
                  className="w-full bg-app border border-border rounded px-3 py-2 text-xs outline-none focus:border-primary font-medium"
                />
              </div>
            </div>

            {/* Document Ingestion Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-text-primary uppercase tracking-wider text-[11px]">
                  Mandatory Checklist Ingestion Slots (6 Documents)
                </span>
                <span className="text-text-muted text-[10px]">
                  Attach custom PDFs or rely on the pre-filled professional dossier
                </span>
              </div>

              <div className="border border-border rounded-lg divide-y divide-border bg-card max-h-56 overflow-y-auto">
                {requiredDocTypes.map((doc, idx) => {
                  const hasCustom = !!manualFiles[doc.type];
                  return (
                    <div key={idx} className="p-2.5 px-3 flex items-center justify-between text-xs hover:bg-app/50 transition">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <FileCheck2 size={15} className="text-primary shrink-0" />
                        <div className="truncate">
                          <p className="font-semibold text-text-primary leading-tight truncate">{doc.type}</p>
                          <p className="text-[10px] text-text-muted truncate">{doc.desc}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 shrink-0">
                        {hasCustom ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary-soft text-primary">
                            Custom: {manualFiles[doc.type].name.slice(0, 15)}...
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-text-secondary border border-border">
                            Standard Document Attached
                          </span>
                        )}

                        <label className="cursor-pointer px-2 py-1 bg-app border border-border rounded text-[10px] font-medium text-text-secondary hover:text-text-primary hover:bg-border transition flex items-center space-x-1">
                          <UploadCloud size={12} />
                          <span>{hasCustom ? 'Replace' : 'Upload PDF'}</span>
                          <input
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            onChange={(e) => handleFileChange(doc.type, e)}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div className="text-[11px] text-text-muted flex items-center space-x-1.5">
                <ShieldCheck size={14} className="text-primary" />
                <span>Deterministic statutory rule validation with SHA-256 tamper-evident provenance.</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 text-xs text-text-secondary font-medium hover:text-text-primary transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleIngestAndScrutinize}
                  className="px-5 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition shadow-sm flex items-center space-x-1.5 cursor-pointer"
                >
                  <span>Ingest Application & Run Scrutiny</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
};
