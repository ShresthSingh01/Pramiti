import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  Sparkles, 
  Building2, 
  FileCheck2, 
  UploadCloud, 
  CheckCircle2, 
  AlertOctagon, 
  ExternalLink, 
  ArrowRight,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import api from '../../lib/api';

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
  
  // Processing state & stepper
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

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
    }
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

  const handleIngestAndScrutinize = async () => {
    let progressTimer: any = null;
    try {
      setIsProcessing(true);
      setCurrentStep(0);

      const hasManualUploads = Object.keys(manualFiles).length > 0;

      let targetAppId = appId.trim();
      if (!targetAppId) {
        targetAppId = `AICTE-2026-${Math.floor(100000 + Math.random() * 900000)}`;
      }

      // Smooth step advancement so user sees active pipeline stages
      progressTimer = setInterval(() => {
        setCurrentStep((prev) => (prev < 2 ? prev + 1 : prev));
      }, 600);

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

      clearInterval(progressTimer);
      // Fast-forward final verification stages
      setCurrentStep(3);
      await new Promise(r => setTimeout(r, 350));
      setCurrentStep(4);
      await new Promise(r => setTimeout(r, 350));

      setIsProcessing(false);
      onSuccess();
      onClose();
      navigate(`/applications/${targetAppId}`);

    } catch (err: any) {
      if (progressTimer) clearInterval(progressTimer);
      console.error("Ingestion failed:", err);
      setIsProcessing(false);
      const detail = err.response?.data?.detail || err.message || "Unknown error occurred";
      alert(`Ingestion failed: ${detail}\nPlease ensure the backend server is running.`);
    }
  };

  const currentDossierObj = dossiers.find(d => d.id === selectedDossier);

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
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-text-primary">Application Ingestion & Scrutiny Studio</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary text-white uppercase tracking-wider">
                  Live Showcase
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Ingest regulatory documents into the verifiable evidence graph with zero external API token costs.
              </p>
            </div>
          </div>
          {!isProcessing && (
            <button onClick={onClose} className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-border transition">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Processing Stepper Overlay */}
        {isProcessing ? (
          <div className="py-8 px-4 space-y-6">
            <div className="text-center space-y-1.5">
              <Cpu size={36} className="mx-auto text-primary animate-pulse" />
              <h3 className="text-sm font-bold text-text-primary">Executing Zero-Cost Local Processing Pipeline</h3>
              <p className="text-xs text-text-secondary">
                Analyzing documents using PyMuPDF bounding box extraction and deterministic APH 2025-26 rules
              </p>
            </div>

            <div className="space-y-3 max-w-xl mx-auto">
              {steps.map((st, idx) => (
                <div 
                  key={idx}
                  className={`p-3 rounded-lg border text-xs flex items-center space-x-3 transition-all ${
                    idx < currentStep 
                      ? 'border-success/40 bg-success-soft/30 text-success' 
                      : idx === currentStep 
                      ? 'border-primary bg-primary-soft/40 text-primary font-semibold shadow-sm'
                      : 'border-border bg-app/50 text-text-muted opacity-60'
                  }`}
                >
                  <div className="shrink-0">
                    {idx < currentStep ? (
                      <CheckCircle2 size={16} className="text-success" />
                    ) : idx === currentStep ? (
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-border flex items-center justify-center text-[9px]">
                        {idx + 1}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-text-primary">{st.title}</p>
                    <p className="text-[10px] text-text-secondary">{st.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Quick-Fill Preset Buttons */}
            <div className="bg-app p-3 rounded-lg border border-border space-y-2">
              <span className="text-[11px] font-bold text-text-primary uppercase tracking-wider block">
                Quick-Fill with Prepared Professional Dossiers:
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleSelectCompliant}
                  className={`p-3 rounded-lg border text-left transition flex items-center justify-between ${
                    selectedDossier === 'Dossier_A_Compliant'
                      ? 'border-success bg-success-soft/40 shadow-sm'
                      : 'border-border bg-card hover:border-text-secondary'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-1.5">
                      <ShieldCheck size={14} className="text-success" />
                      <span className="text-xs font-bold text-text-primary">Dossier A: Fully Compliant</span>
                    </div>
                    <p className="text-[10px] text-text-secondary">Apex National Institute of Technology, Pune</p>
                    <span className="text-[9px] text-success font-semibold block">0 Deficiencies | Clean Golden Path</span>
                  </div>
                  {selectedDossier === 'Dossier_A_Compliant' && (
                    <CheckCircle2 size={16} className="text-success shrink-0" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSelectDeficient}
                  className={`p-3 rounded-lg border text-left transition flex items-center justify-between ${
                    selectedDossier === 'Dossier_B_Deficiencies_Detected'
                      ? 'border-warning bg-warning-soft/40 shadow-sm'
                      : 'border-border bg-card hover:border-text-secondary'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-1.5">
                      <AlertOctagon size={14} className="text-warning" />
                      <span className="text-xs font-bold text-text-primary">Dossier B: Deficiencies Detected</span>
                    </div>
                    <p className="text-[10px] text-text-secondary">Aryavart Institute of Engineering, Lucknow</p>
                    <span className="text-[9px] text-warning font-semibold block">Seeds Land Mismatch & Lapsed Affiliation</span>
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
                            Showcase PDF Ready
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
                <Sparkles size={13} className="text-warning" />
                <span>Runs 100% on CPU locally with zero paid API token usage.</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 text-xs text-text-secondary font-medium hover:text-text-primary transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleIngestAndScrutinize}
                  className="px-5 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition shadow-sm flex items-center space-x-1.5"
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
