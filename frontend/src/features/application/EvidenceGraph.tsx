import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { 
  AlertTriangle, 
  FileText, 
  CheckCircle, 
  ShieldCheck, 
  ExternalLink, 
  X, 
  HelpCircle,
  Building,
  Info,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw
} from 'lucide-react';

interface EvidenceGraphProps {
  data: {
    nodes: any[];
    edges: any[];
  };
  onSelectDoc?: (docType: string) => void;
}

export const EvidenceGraphView: React.FC<EvidenceGraphProps> = ({ data, onSelectDoc }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [selectedItem, setSelectedItem] = useState<{
    type: 'node' | 'edge';
    data: any;
  } | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'conflicts'>('all');

  const toggleFilter = (mode: 'all' | 'conflicts') => {
    setFilterMode(mode);
    if (!cyRef.current) return;
    if (mode === 'all') {
      cyRef.current.elements().style('opacity', 1);
      cyRef.current.fit(undefined, 35);
    } else {
      const conflictEdges = cyRef.current.edges('[status = "conflict"]');
      const connectedNodes = conflictEdges.connectedNodes();
      const conflictElements = conflictEdges.union(connectedNodes);

      if (conflictElements.length > 0) {
        cyRef.current.elements().difference(conflictElements).style('opacity', 0.12);
        conflictElements.style('opacity', 1);
        cyRef.current.fit(conflictElements, 50);
      }
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;
    if (!data || !data.nodes || data.nodes.length === 0) return;

    // Check theme for dynamic node/edge contrast
    const isDark = document.documentElement.classList.contains('dark');

    const elements: any[] = [];

    // 1. Process Nodes
    (data.nodes || []).forEach((n) => {
      const isDoc = n.type === 'document';
      const isAuth = n.type === 'authority';
      const isConflict = !!n.is_conflict;

      elements.push({
        data: {
          id: String(n.id),
          label: n.label || n.field || String(n.id),
          type: n.type || 'fact',
          status: n.status || (isConflict ? 'conflict' : 'normal'),
          isConflict,
          raw: n
        }
      });
    });

    // Node IDs set for edge safety (prevents Cytoscape crash if dangling edge exists)
    const nodeIds = new Set(elements.map((e) => e.data.id));

    // 2. Process Edges (strictly filter for existing source & target)
    (data.edges || []).forEach((e) => {
      const sId = String(e.source);
      const tId = String(e.target);
      if (!nodeIds.has(sId) || !nodeIds.has(tId)) return;

      elements.push({
        data: {
          id: String(e.id),
          source: sId,
          target: tId,
          label: e.label || e.relation?.replace(/_/g, ' ') || '',
          relation: e.relation,
          status: e.status || 'normal',
          severity: e.severity,
          clause: e.clause,
          reason: e.reason,
          source_a: e.source_a,
          source_b: e.source_b,
          remediation: e.remediation,
          raw: e
        }
      });
    });

    // Destroy prior instance if existing
    if (cyRef.current) {
      try {
        cyRef.current.destroy();
      } catch {
        // ignore
      }
    }

    try {
      cyRef.current = cytoscape({
        container: containerRef.current,
        elements,
        boxSelectionEnabled: false,
        autounselectify: false,
        style: [
          // Base Node Style
          {
            selector: 'node',
            style: {
              'shape': 'round-rectangle',
              'background-color': isDark ? '#1E293B' : '#FFFFFF',
              'border-width': 2,
              'border-color': '#3B82F6',
              'label': 'data(label)',
              'color': isDark ? '#F1F5F9' : '#0F172A',
              'font-size': '10px',
              'font-weight': 'bold',
              'font-family': 'Inter, system-ui, sans-serif',
              'text-valign': 'center',
              'text-halign': 'center',
              'text-wrap': 'wrap',
              'text-max-width': '135px',
              'padding': '8px',
              'width': 'label',
              'height': 'label'
            }
          },
          // Document Parent Nodes
          {
            selector: 'node[type = "document"]',
            style: {
              'background-color': isDark ? '#1E3A8A' : '#EFF6FF',
              'border-color': '#2563EB',
              'border-width': 2.5,
              'color': isDark ? '#DBEAFE' : '#1E3A8A',
              'font-size': '11px',
              'font-weight': 'bold',
              'padding': '10px'
            }
          },
          // Authority Registry Nodes
          {
            selector: 'node[type = "authority"]',
            style: {
              'background-color': isDark ? '#334155' : '#F8FAFC',
              'border-color': isDark ? '#64748B' : '#94A3B8',
              'border-width': 2,
              'color': isDark ? '#E2E8F0' : '#334155',
              'font-size': '10px',
              'padding': '8px'
            }
          },
          // Conflict / Discrepancy Fact Nodes
          {
            selector: 'node[isConflict = true]',
            style: {
              'background-color': isDark ? '#7F1D1D' : '#FEF2F2',
              'border-color': '#EF4444',
              'border-width': 2.5,
              'color': isDark ? '#FECACA' : '#991B1B',
              'font-weight': 'bold'
            }
          },
          // Base Relational Edge
          {
            selector: 'edge',
            style: {
              'width': 1.8,
              'line-color': isDark ? '#475569' : '#94A3B8',
              'target-arrow-color': isDark ? '#475569' : '#94A3B8',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              'label': 'data(label)',
              'font-size': '8.5px',
              'color': isDark ? '#94A3B8' : '#475569',
              'text-background-color': isDark ? '#0F172A' : '#FFFFFF',
              'text-background-opacity': 0.9,
              'text-background-padding': '2px',
              'text-rotation': 'autorotate'
            }
          },
          // Provenance Edges (Fact -> Document)
          {
            selector: 'edge[status = "provenance"]',
            style: {
              'width': 1.2,
              'line-color': isDark ? '#334155' : '#CBD5E1',
              'target-arrow-color': isDark ? '#334155' : '#CBD5E1',
              'line-style': 'solid',
              'target-arrow-shape': 'vee',
              'font-size': '7.5px',
              'color': isDark ? '#64748B' : '#94A3B8'
            }
          },
          // Conflict Edges (Highlighted Red & Dashed)
          {
            selector: 'edge[status = "conflict"]',
            style: {
              'line-color': '#EF4444',
              'target-arrow-color': '#EF4444',
              'line-style': 'dashed',
              'width': 3.2,
              'color': isDark ? '#FCA5A5' : '#B91C1C',
              'font-size': '9.5px',
              'font-weight': 'bold',
              'text-background-color': isDark ? '#450A0A' : '#FEF2F2',
              'text-background-opacity': 0.95,
              'text-border-color': '#EF4444',
              'text-border-width': 1,
              'text-border-opacity': 0.6,
              'text-background-padding': '3px'
            }
          },
          // Selected Node or Edge
          {
            selector: ':selected',
            style: {
              'border-color': '#F59E0B',
              'border-width': 3.5,
              'line-color': '#F59E0B',
              'target-arrow-color': '#F59E0B'
            }
          }
        ],
        layout: {
          name: 'cose',
          animate: false,
          padding: 35,
          nodeRepulsion: 7000,
          idealEdgeLength: 100,
          edgeElasticity: 100,
          gravity: 0.3,
          numIter: 800
        }
      });

      // Click on Node
      cyRef.current.on('tap', 'node', (evt) => {
        const node = evt.target;
        setSelectedItem({
          type: 'node',
          data: node.data('raw') || node.data()
        });
      });

      // Click on Edge
      cyRef.current.on('tap', 'edge', (evt) => {
        const edge = evt.target;
        setSelectedItem({
          type: 'edge',
          data: edge.data('raw') || edge.data()
        });
      });

      // Auto-select first conflict edge or first issue for immediate user clarity
      const conflictEdge = (data.edges || []).find((e: any) => e.status === 'conflict');
      if (conflictEdge) {
        setSelectedItem({ type: 'edge', data: conflictEdge });
      } else if (elements.length > 0) {
        const conflictNode = elements.find(el => el.data.isConflict);
        if (conflictNode) {
          setSelectedItem({ type: 'node', data: conflictNode.data.raw || conflictNode.data });
        }
      }

      // Re-fit view once DOM dimensions settle
      const timer = setTimeout(() => {
        if (cyRef.current) {
          cyRef.current.resize();
          cyRef.current.fit(undefined, 35);
        }
      }, 120);

      // Add ResizeObserver for resilient responsive auto-resizing
      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
        resizeObserver = new ResizeObserver(() => {
          if (cyRef.current) {
            cyRef.current.resize();
          }
        });
        resizeObserver.observe(containerRef.current);
      }

      return () => {
        clearTimeout(timer);
        resizeObserver?.disconnect();
        try {
          cyRef.current?.destroy();
        } catch {
          // ignore
        }
      };
    } catch (err) {
      console.error('Failed to initialize Cytoscape evidence graph:', err);
    }
  }, [data]);

  const fitGraph = () => {
    if (cyRef.current) {
      cyRef.current.resize();
      cyRef.current.fit(undefined, 35);
    }
  };

  const zoomIn = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 1.25);
    }
  };

  const zoomOut = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 0.8);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full min-h-[580px]">
      {/* Column 1: Main Cytoscape Canvas (7 cols on lg screen) */}
      <div className="lg:col-span-7 xl:col-span-7 bg-card-subtle/70 rounded-2xl border border-border relative flex flex-col overflow-hidden shadow-inner min-h-[460px] lg:min-h-[580px]">
        {/* Top Floating Legend & Quick Controls */}
        <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          <div className="glass-card px-3.5 py-1.5 rounded-xl border border-border text-[11px] text-text-secondary flex flex-wrap items-center gap-3 shadow-md pointer-events-auto">
            <span className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500 inline-block"></span>
              <span className="font-semibold text-text-primary">Source Document</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded bg-card border border-blue-400 inline-block"></span>
              <span>Extracted Fact</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-3 h-0.5 bg-danger inline-block border-t border-dashed"></span>
              <span className="text-danger font-bold">Regulatory Conflict</span>
            </span>
          </div>

          {/* Interactive Zoom & Filter Toolbar */}
          <div className="flex items-center space-x-2 pointer-events-auto">
            {/* Conflict Filter Toggle */}
            <div className="glass-card p-1 rounded-xl border border-border flex items-center space-x-1 shadow-md">
              <button
                type="button"
                onClick={() => toggleFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                All Nodes ({data?.nodes?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => toggleFilter('conflicts')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center space-x-1 ${
                  filterMode === 'conflicts'
                    ? 'bg-danger text-white shadow-sm'
                    : 'text-danger hover:bg-danger-soft'
                }`}
              >
                <span>⚠️ Conflicts Only</span>
                <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-black/20">
                  {(data?.edges || []).filter((e: any) => e.status === 'conflict').length}
                </span>
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="glass-card p-1 rounded-xl border border-border flex items-center space-x-1 shadow-md">
              <button
                type="button"
                onClick={zoomIn}
                title="Zoom In"
                className="p-1.5 rounded-lg hover:bg-card text-text-secondary hover:text-text-primary transition cursor-pointer"
              >
                <ZoomIn size={14} />
              </button>
              <button
                type="button"
                onClick={zoomOut}
                title="Zoom Out"
                className="p-1.5 rounded-lg hover:bg-card text-text-secondary hover:text-text-primary transition cursor-pointer"
              >
                <ZoomOut size={14} />
              </button>
              <button
                type="button"
                onClick={fitGraph}
                title="Fit Graph to Viewport"
                className="px-2.5 py-1 rounded-lg hover:bg-card text-primary font-bold text-[10px] flex items-center space-x-1 transition cursor-pointer"
              >
                <Maximize2 size={12} />
                <span>Fit View</span>
              </button>
            </div>
          </div>
        </div>

        {/* The Concrete Cytoscape Mount Element */}
        <div 
          ref={containerRef} 
          className="w-full flex-1 min-h-[440px] lg:min-h-[560px]" 
          style={{ width: '100%', height: '100%', minHeight: '460px' }}
        />
      </div>

      {/* Column 2: Side Inspector Panel (5 cols on lg screen) */}
      <div className="lg:col-span-5 xl:col-span-5 glass-card rounded-2xl border border-border p-5 flex flex-col justify-between overflow-y-auto max-h-[720px] min-h-[460px] lg:min-h-[580px] shadow-sm">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center space-x-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0 border border-primary/20">
                <Info size={14} />
              </div>
              <h3 className="text-xs font-black text-text-primary uppercase tracking-wider truncate">
                Evidence Inspector
              </h3>
            </div>
            {selectedItem && (
              <button 
                type="button"
                onClick={() => setSelectedItem(null)} 
                className="px-2 py-0.5 rounded-lg hover:bg-card text-text-muted hover:text-text-primary text-[11px] font-semibold flex items-center space-x-1 transition shrink-0 border border-border/60 hover:border-border cursor-pointer shadow-xs"
                title="Deselect element"
              >
                <X size={12} />
                <span>Clear</span>
              </button>
            )}
          </div>

          {selectedItem ? (
            <div className="space-y-3.5 text-xs">
              {/* Type Badge & Severity Pill */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border shadow-xs ${
                  selectedItem.data.status === 'conflict' || selectedItem.data.isConflict
                    ? 'bg-danger/10 text-danger border-danger/30'
                    : selectedItem.data.type === 'document'
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-card-subtle text-text-secondary border-border'
                }`}>
                  {selectedItem.data.status === 'conflict' || selectedItem.data.isConflict ? (
                    <>
                      <AlertTriangle size={12} className="shrink-0 text-danger" />
                      <span>Regulatory Conflict</span>
                    </>
                  ) : selectedItem.type === 'edge' ? (
                    <span>Relational Edge</span>
                  ) : selectedItem.data.type === 'document' ? (
                    <>
                      <FileText size={12} className="shrink-0 text-primary" />
                      <span>Source Document</span>
                    </>
                  ) : (
                    <span>Extracted Fact</span>
                  )}
                </span>

                {selectedItem.data.severity && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider bg-danger/15 text-danger border border-danger/30">
                    {selectedItem.data.severity} SEVERITY
                  </span>
                )}
              </div>

              {/* Title & Statement */}
              <div className="space-y-1">
                <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">
                  Entity / Fact Identifier
                </p>
                <h4 className="text-sm font-extrabold text-text-primary tracking-tight break-words">
                  {selectedItem.data.label || selectedItem.data.field}
                </h4>
                {selectedItem.data.value && (
                  <div className="text-xs font-mono text-primary bg-primary-soft/50 px-3 py-2 rounded-xl mt-1.5 border border-primary/25 break-words">
                    &ldquo;{selectedItem.data.value}&rdquo;
                  </div>
                )}
              </div>

              {/* Exact Conflict Reason & Why Happened */}
              {(selectedItem.data.reason || selectedItem.data.clause) && (
                <div className="bg-danger/5 dark:bg-danger/10 border border-danger/25 rounded-2xl p-4 space-y-2.5 shadow-xs">
                  <div className="flex items-center space-x-2 text-danger font-bold text-[11px] uppercase tracking-wider">
                    <AlertTriangle size={14} className="shrink-0" />
                    <span>Why This Error Occurred</span>
                  </div>
                  <p className="text-xs text-text-primary leading-relaxed font-normal">
                    {selectedItem.data.reason}
                  </p>
                  {selectedItem.data.clause && (
                    <div className="pt-2 border-t border-danger/20 flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                      <span className="text-text-muted font-medium text-[10px]">Cited Regulation:</span>
                      <span className="font-mono font-bold text-primary bg-primary-soft px-2.5 py-0.5 rounded-lg border border-primary/25 text-[10px]">
                        {selectedItem.data.clause}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Exact Source Matching Details */}
              {(selectedItem.data.source_a || selectedItem.data.source_b) && (
                <div className="bg-card-subtle/80 border border-border rounded-2xl p-4 space-y-3 text-xs shadow-xs">
                  <div className="flex items-center space-x-2 text-text-primary font-bold text-[10px] uppercase tracking-wider">
                    <FileText size={13} className="text-text-secondary shrink-0" />
                    <span>Exact Document Sources</span>
                  </div>
                  {selectedItem.data.source_a && (
                    <div className="bg-card p-3 rounded-xl border border-border space-y-1">
                      <div className="flex items-center space-x-1.5 text-[10px] text-primary font-bold uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>
                        <span>Primary Record Source</span>
                      </div>
                      <p className="text-xs text-text-primary font-medium leading-relaxed break-words">
                        {selectedItem.data.source_a}
                      </p>
                    </div>
                  )}
                  {selectedItem.data.source_b && (
                    <div className="bg-card p-3 rounded-xl border border-border space-y-1">
                      <div className="flex items-center space-x-1.5 text-[10px] text-amber-500 font-bold uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
                        <span>Cross-Referenced Source</span>
                      </div>
                      <p className="text-xs text-text-primary font-medium leading-relaxed break-words">
                        {selectedItem.data.source_b}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Suggested Fix */}
              {selectedItem.data.remediation && (
                <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 space-y-1.5 text-xs shadow-xs">
                  <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase tracking-wider">
                    <ShieldCheck size={14} className="shrink-0" />
                    <span>Statutory Remediation Directive</span>
                  </div>
                  <p className="text-xs text-text-primary leading-relaxed font-medium">
                    {selectedItem.data.remediation}
                  </p>
                </div>
              )}

              {/* Document Jump button */}
              {selectedItem.data.doc_type && onSelectDoc && (
                <button
                  type="button"
                  onClick={() => onSelectDoc(selectedItem.data.doc_type)}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-md shadow-blue-500/20 flex items-center justify-center space-x-2 cursor-pointer group mt-2"
                >
                  <FileText size={14} className="group-hover:scale-110 transition-transform" />
                  <span>Inspect in Document Preview</span>
                  <ExternalLink size={12} className="opacity-70 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-text-muted text-xs my-auto min-h-[220px]">
              <div className="w-12 h-12 rounded-2xl bg-card-subtle border border-border flex items-center justify-center mb-3 text-text-muted">
                <Info size={22} className="opacity-60" />
              </div>
              <p className="font-bold text-text-primary text-sm">Select Node or Edge</p>
              <p className="text-xs mt-1.5 text-text-muted max-w-[240px] leading-relaxed">
                Click any fact node or contradiction edge to inspect extracted values, source clauses, and audit trails.
              </p>
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-border text-[10px] text-text-muted flex items-center justify-between mt-4">
          <span>AICTE APH 2025-26 Standard</span>
          <span className="font-mono font-semibold text-primary">Live Graph Intel</span>
        </div>
      </div>
    </div>
  );
};
