import React, { useEffect, useState, useRef } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  ExternalLink, 
  Eye, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import api from '../../lib/api';

export interface DocumentMarker {
  id: string;
  rule_id?: string | null;
  title: string;
  severity: string;
  is_error: boolean;
  clause_ref?: string;
  phrase?: string;
  page: number;
  bbox: number[]; // [ymin, xmin, ymax, xmax]
  description?: string;
  cross_doc?: string;
  cross_phrase?: string;
  remediation?: string;
  confidence?: number;
  bbox_is_estimated?: boolean;
  grounding_method?: string;
}

interface MarkersResponse {
  doc_id: string;
  doc_type: string;
  name: string;
  page_count: number;
  status: string;
  file_url?: string;
  verification_source?: string;
  verification_status?: string;
  markers: DocumentMarker[];
}

interface VisualDocumentInspectorProps {
  appId: string;
  doc: {
    id: string;
    docType: string;
    name?: string;
    fileUrl?: string;
    status: string;
  };
  targetMarkerId?: string | null;
  onRequestClarification?: (finding: any) => void;
  onViewAllFindings?: () => void;
}

export const VisualDocumentInspector: React.FC<VisualDocumentInspectorProps> = ({
  appId,
  doc,
  targetMarkerId,
  onRequestClarification,
  onViewAllFindings
}) => {
  const [data, setData] = useState<MarkersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'visual' | 'raw'>('visual');
  const [selectedMarker, setSelectedMarker] = useState<DocumentMarker | null>(null);
  const [imageError, setImageError] = useState(false);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchMarkers = async () => {
    try {
      setLoading(true);
      setImageError(false);
      const res = await api.get<MarkersResponse>(`/applications/${appId}/documents/${doc.id}/markers`);
      setData(res.data);
      
      // Auto-select error marker if targetMarkerId provided, else select first error
      if (res.data.markers && res.data.markers.length > 0) {
        if (targetMarkerId) {
          const matched = res.data.markers.find(m => m.id.includes(targetMarkerId) || (m.rule_id && targetMarkerId.includes(m.rule_id)));
          if (matched) {
            setSelectedMarker(matched);
            setPage(matched.page || 1);
            return;
          }
        }
        const firstErr = res.data.markers.find(m => m.is_error);
        setSelectedMarker(firstErr || res.data.markers[0]);
        if (firstErr) {
          setPage(firstErr.page || 1);
        }
      } else {
        setSelectedMarker(null);
      }
    } catch (err) {
      console.error('Failed to load document markers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarkers();
  }, [appId, doc.id]);

  useEffect(() => {
    if (targetMarkerId && data?.markers) {
      const matched = data.markers.find(m => m.id.includes(targetMarkerId) || (m.rule_id && targetMarkerId.includes(m.rule_id)));
      if (matched) {
        setSelectedMarker(matched);
        setPage(matched.page || 1);
      }
    }
  }, [targetMarkerId, data]);

  const markersOnCurrentPage = (data?.markers || []).filter(m => m.page === page);
  const errorMarkers = (data?.markers || []).filter(m => m.is_error);

  const pageImageUrl = `/api/applications/${appId}/documents/${doc.id}/page-image?page=${page}`;

  return (
    <div className="w-full h-full flex flex-col space-y-3">
      {/* 1. Header Bar: Document Title, Status & Mode Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border text-xs">
        <div className="flex items-center space-x-2.5 min-w-0">
          <span className="font-bold text-text-primary truncate">{doc.docType}</span>
          <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase shrink-0 ${
            doc.status === 'issues_found'
              ? 'bg-amber-100 text-amber-900 border border-amber-300'
              : doc.status === 'verified'
              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              : 'bg-primary-soft text-primary'
          }`}>
            {doc.status.replace('_', ' ')}
          </span>
          <span className="text-[10px] text-text-muted hidden md:inline truncate">
            {data?.verification_source ? `• Verified via ${data.verification_source}` : ''}
          </span>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {/* View Mode Toggle */}
          <div className="flex bg-app rounded-md border border-border p-0.5 text-[11px] font-semibold">
            <button
              onClick={() => setViewMode('visual')}
              className={`px-2 py-1 rounded transition flex items-center space-x-1 ${
                viewMode === 'visual'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Layers size={12} />
              <span>Visual Markers ({errorMarkers.length})</span>
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`px-2 py-1 rounded transition flex items-center space-x-1 ${
                viewMode === 'raw'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <FileText size={12} />
              <span>Raw PDF</span>
            </button>
          </div>

          {/* Open in new tab link */}
          {doc.fileUrl && (
            <a
              href={doc.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 text-text-muted hover:text-primary rounded hover:bg-app transition"
              title="Open raw document in new browser tab"
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>

      {/* 2. Compact Inspector Strip: Quick Line Markers Ribbon (No redundant full findings cards!) */}
      <div className="bg-app/80 border border-border rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2 overflow-x-auto py-0.5">
          <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider shrink-0 flex items-center space-x-1">
            <span>Line Markers:</span>
          </span>

          {errorMarkers.length > 0 ? (
            errorMarkers.map((em) => (
              <button
                key={em.id}
                type="button"
                onClick={() => {
                  setSelectedMarker(em);
                  setPage(em.page || 1);
                  setViewMode('visual');
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition flex items-center space-x-1.5 shrink-0 ${
                  selectedMarker?.id === em.id
                    ? 'bg-danger text-white shadow-sm ring-2 ring-danger/30'
                    : 'bg-danger-soft text-danger hover:bg-danger/10 border border-danger/30'
                }`}
              >
                <AlertTriangle size={12} />
                <span className="truncate max-w-[200px]">
                  {em.rule_id ? `${em.rule_id}: ` : ''}{em.phrase || em.title}
                </span>
              </button>
            ))
          ) : (
            <span className="text-[11px] text-success font-semibold flex items-center space-x-1">
              <CheckCircle size={13} />
              <span>Clean statutory compliance — no errors flagged on this document.</span>
            </span>
          )}
        </div>

        {onViewAllFindings && errorMarkers.length > 0 && (
          <button
            type="button"
            onClick={onViewAllFindings}
            className="text-[10px] font-bold text-primary hover:text-blue-700 inline-flex items-center space-x-1 shrink-0 ml-auto"
          >
            <span>View Full Clause Scrutiny & Remediation in Tab 2</span>
            <ArrowRight size={11} />
          </button>
        )}
      </div>

      {/* 3. Document Canvas Area with Exact Line Overlays */}
      <div className="flex-1 bg-slate-900/5 rounded-lg border border-border overflow-hidden flex flex-col relative min-h-[500px]">
        {viewMode === 'raw' ? (
          <iframe
            src={doc.fileUrl}
            className="w-full h-full min-h-[500px] border-none"
            title="Raw Document Viewer"
          />
        ) : (
          <div className="w-full h-full flex flex-col">
            {/* Canvas Controls Bar */}
            <div className="bg-card/90 border-b border-border px-3 py-1.5 flex items-center justify-between text-xs z-10">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] text-text-muted font-medium">
                  High-Resolution Visual Inspection Layer (Page {page} of {data?.page_count || 1})
                </span>
                {selectedMarker?.clause_ref && (
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300">
                    Governing Clause: {selectedMarker.clause_ref}
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {/* Zoom controls */}
                <button
                  type="button"
                  onClick={() => setZoomScale(prev => Math.max(0.75, prev - 0.15))}
                  className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-app"
                  title="Zoom Out"
                >
                  <ZoomOut size={13} />
                </button>
                <span className="text-[10px] font-mono text-text-muted">{Math.round(zoomScale * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setZoomScale(prev => Math.min(1.75, prev + 0.15))}
                  className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-app"
                  title="Zoom In"
                >
                  <ZoomIn size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomScale(1)}
                  className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-app"
                  title="Reset Zoom"
                >
                  <Maximize2 size={13} />
                </button>

                {/* Page Navigation */}
                {(data?.page_count || 1) > 1 && (
                  <div className="flex items-center space-x-1 pl-2 border-l border-border">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      className="p-1 rounded hover:bg-app text-text-secondary disabled:opacity-40"
                    >
                      <ChevronLeft size={13} />
                    </button>
                    <span className="text-[10px] font-mono">{page}/{data?.page_count}</span>
                    <button
                      type="button"
                      disabled={page >= (data?.page_count || 1)}
                      onClick={() => setPage(p => Math.min(data?.page_count || 1, p + 1))}
                      className="p-1 rounded hover:bg-app text-text-secondary disabled:opacity-40"
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Scrollable Canvas with Document Raster & Exact Overlay Box Highlights */}
            <div 
              ref={containerRef}
              className="flex-1 overflow-auto p-4 flex justify-center items-start bg-slate-100"
            >
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center text-xs text-text-muted space-y-2">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span>Rendering vector document and computing exact line markers...</span>
                </div>
              ) : imageError ? (
                <div className="py-20 text-center text-xs text-text-muted space-y-2">
                  <p className="font-bold text-text-primary">Raster rendering fallback</p>
                  <p>Displaying native PDF reader...</p>
                  <button
                    type="button"
                    onClick={() => setViewMode('raw')}
                    className="px-3 py-1 bg-primary text-white rounded text-xs font-semibold"
                  >
                    Open Raw PDF Viewer
                  </button>
                </div>
              ) : (
                <div 
                  className="relative shadow-xl rounded-md bg-white transition-all origin-top"
                  style={{ transform: `scale(${zoomScale})`, maxWidth: '100%' }}
                >
                  {/* High-Resolution Document Page Image */}
                  <img
                    src={pageImageUrl}
                    alt={`${doc.docType} Page ${page}`}
                    className="block w-full max-w-[850px] select-none pointer-events-none rounded border border-border"
                    onError={() => setImageError(true)}
                  />

                  {/* Overlaid Visual Highlight Boxes on Exact Coordinates */}
                  {markersOnCurrentPage.map((m) => {
                    const isSelected = selectedMarker?.id === m.id;
                    const ymin = m.bbox[0];
                    const xmin = m.bbox[1];
                    const ymax = m.bbox[2];
                    const xmax = m.bbox[3];

                    const topPct = Math.max(0, Math.min(100, ymin * 100));
                    const leftPct = Math.max(0, Math.min(100, xmin * 100));
                    const heightPct = Math.max(2.2, Math.min(100 - topPct, (ymax - ymin) * 100));
                    const widthPct = Math.max(4.0, Math.min(100 - leftPct, (xmax - xmin) * 100));

                    const isEst = !!m.bbox_is_estimated;

                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMarker(m)}
                        style={{
                          top: `${topPct}%`,
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                          height: `${heightPct}%`,
                        }}
                        className={`absolute cursor-pointer transition-all duration-200 z-10 group ${
                          isEst ? 'border-dashed' : 'border-solid'
                        } ${
                          m.is_error
                            ? isSelected
                              ? 'border-2 border-red-600 bg-red-500/35 ring-4 ring-amber-400/80 shadow-lg'
                              : 'border-2 border-red-500 bg-red-500/20 hover:bg-red-500/30 ring-2 ring-red-400/40'
                            : isSelected
                            ? 'border-2 border-blue-600 bg-blue-500/30 ring-2 ring-blue-400'
                            : 'border border-blue-500/70 bg-blue-500/10 hover:bg-blue-500/20'
                        }`}
                        title={m.title}
                      >
                        {/* Floating Tag over the exact line */}
                        <div className={`absolute -top-6 left-0 px-1.5 py-0.5 rounded text-[9px] font-bold whitespace-nowrap shadow flex items-center space-x-1 ${
                          m.is_error
                            ? 'bg-red-600 text-white ring-1 ring-white/50'
                            : 'bg-blue-600 text-white'
                        }`}>
                          <span>{m.is_error ? '⚠️' : '✓'}</span>
                          <span className="font-mono">{m.rule_id || m.title}:</span>
                          <span className="underline decoration-white/70 font-semibold">{m.phrase || 'Flagged'}</span>
                          {isEst && (
                            <span className="px-1 py-0.2 bg-amber-500 text-white rounded text-[8px] font-mono ml-0.5">
                              INFERRED
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. Active Marker Details Card at the bottom of the canvas */}
            {selectedMarker && (
              <div className="bg-card border-t border-border p-3 text-xs flex flex-wrap items-center justify-between gap-3 shadow-md z-10">
                <div className="flex items-start space-x-2.5 min-w-0 max-w-2xl">
                  <div className={`p-1.5 rounded shrink-0 ${
                    selectedMarker.is_error ? 'bg-danger-soft text-danger' : 'bg-primary-soft text-primary'
                  }`}>
                    {selectedMarker.is_error ? <AlertTriangle size={15} /> : <CheckCircle size={15} />}
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-text-primary text-xs">{selectedMarker.title}</span>
                      {selectedMarker.clause_ref && (
                        <span className="text-[10px] font-bold text-primary bg-primary-soft px-1.5 py-0.2 rounded border border-primary/20">
                          {selectedMarker.clause_ref}
                        </span>
                      )}
                      {selectedMarker.bbox_is_estimated ? (
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300">
                          ⚡ Regional Scope (Semantic Heuristic)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                          ✓ Exact Grounded Coordinates (PyMuPDF Vector Match)
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-text-secondary leading-snug">
                      <strong className="text-text-primary">Flagged on Page {selectedMarker.page}: </strong>
                      <span className="font-mono bg-app px-1 py-0.5 rounded text-danger font-semibold">"{selectedMarker.phrase}"</span>
                      {selectedMarker.cross_doc && selectedMarker.cross_phrase && (
                        <span> — Contradicts statement in <strong className="text-text-primary">{selectedMarker.cross_doc}</strong> (<span className="font-mono text-primary font-semibold">"{selectedMarker.cross_phrase}"</span>)</span>
                      )}
                    </p>
                    {selectedMarker.remediation && (
                      <p className="text-[10px] text-amber-900 font-medium">
                        <strong>Remediation: </strong>{selectedMarker.remediation}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {selectedMarker.is_error && onRequestClarification && (
                    <button
                      type="button"
                      onClick={() => onRequestClarification(selectedMarker)}
                      className="px-3 py-1 bg-primary text-white text-[11px] font-semibold rounded hover:bg-blue-700 transition"
                    >
                      Request Clarification
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
