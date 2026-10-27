import React, { useEffect, useState } from 'react';
import { BookOpen, Search, CheckCircle2, ChevronRight, Layers, Cpu } from 'lucide-react';
import api from '../../lib/api';

interface RuleItem {
  id: string;
  clause_ref: string;
  handbook_version: string;
  title: string;
  severity: string;
  description: string;
  suggested_fix?: string;
}

interface QuickCheck {
  title: string;
  question: string;
  answer: string;
  page?: number;
  section?: string;
  engine?: string;
}

export const RuleStoreView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'rules' | 'handbook'>('rules');
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [loading, setLoading] = useState(true);

  // PageIndex Regulatory Explorer State
  const [query, setQuery] = useState('');
  const [querying, setQuerying] = useState(false);
  const [queryResult, setQueryResult] = useState<any>(null);
  const [quickChecks, setQuickChecks] = useState<QuickCheck[]>([]);
  const [kbStatus, setKbStatus] = useState<any>(null);

  useEffect(() => {
    api.get<RuleItem[]>('/rules')
      .then(res => setRules(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));

    // Fetch PageIndex KB status and quick checks
    api.get('/regulatory/status')
      .then(res => setKbStatus(res.data))
      .catch(console.error);

    api.get('/regulatory/quick-checks')
      .then(res => setQuickChecks(res.data.checks || []))
      .catch(console.error);
  }, []);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    setQuerying(true);
    api.post('/regulatory/query', { question: query })
      .then(res => setQueryResult(res.data))
      .catch(err => setQueryResult({ available: false, answer: `Error: ${err.message}` }))
      .finally(() => setQuerying(false));
  };

  const handleQuickClick = (q: string) => {
    setQuery(q);
    setQuerying(true);
    api.post('/regulatory/query', { question: q })
      .then(res => setQueryResult(res.data))
      .catch(err => setQueryResult({ available: false, answer: `Error: ${err.message}` }))
      .finally(() => setQuerying(false));
  };

  return (
    <div className="space-y-6">
      {/* Header with Navigation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Regulatory Intelligence & Rules</h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Compiled from AICTE Approval Process Handbook (APH 2025-26) with PageIndex Vectorless Tree Search
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'rules'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-card text-text-secondary hover:text-text-primary border border-border'
            }`}
          >
            Deterministic Rules ({rules.length})
          </button>
          <button
            onClick={() => setActiveTab('handbook')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'handbook'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-card text-text-secondary hover:text-text-primary border border-border'
            }`}
          >
            <BookOpen size={13} />
            <span>PageIndex Handbook Explorer</span>
            {kbStatus?.ready && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: Deterministic Rules List */}
      {activeTab === 'rules' && (
        <>
          {loading ? (
            <div className="p-8 text-xs text-text-secondary">Loading rule book...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rules.map((r) => (
                <div key={r.id} className="glass-card rounded-2xl border border-border p-5 flex flex-col justify-between hover:border-primary/40 transition-all duration-200">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-primary font-mono bg-primary-soft px-2 py-0.5 rounded border border-primary/20">{r.id}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
                        r.severity === 'critical' ? 'bg-danger-soft text-danger border-danger/30' : 'bg-warning-soft text-warning border-warning/30'
                      }`}>
                        {r.severity}
                      </span>
                    </div>
                    <h3 className="text-sm font-black text-text-primary mb-1 tracking-tight">{r.title}</h3>
                    <p className="text-[11px] text-text-muted mb-3 font-mono">
                      Clause Citation: {r.clause_ref} ({r.handbook_version})
                    </p>
                    <p className="text-xs text-text-secondary leading-relaxed mb-4">{r.description}</p>
                  </div>

                  {r.suggested_fix && (
                    <div className="bg-card-subtle p-3 rounded-xl border border-border/80 text-[11px] text-text-secondary">
                      <span className="font-bold text-text-primary block mb-1">Remediation Policy:</span>
                      {r.suggested_fix}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* TAB 2: PageIndex Handbook Explorer */}
      {activeTab === 'handbook' && (
        <div className="space-y-6">
          {/* Status Banner */}
          <div className="bg-gradient-to-r from-blue-900/10 via-indigo-900/10 to-slate-900/10 border border-blue-500/20 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-blue-500/10 text-blue-600 rounded-lg">
                <Layers size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-text-primary">
                  AICTE Handbook Vectorless Knowledge Base
                </h4>
                <p className="text-xs text-text-secondary">
                  Powered by PageIndex Local SDK • Hierarchical tree reasoning • {kbStatus?.doc_name || 'APH 2025-26'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              <CheckCircle2 size={14} />
              <span>Air-Gapped (Zero Data to Cloud)</span>
            </div>
          </div>

          {/* Interactive Search Query Box */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-3 text-text-muted" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask any regulatory question (e.g., minimum land area in rural vs metro, student faculty cadre ratio)..."
                className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <button
              type="submit"
              disabled={querying || !query.trim()}
              className="px-5 py-2.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-hover disabled:opacity-50 transition flex items-center space-x-1.5"
            >
              <Search size={14} />
              <span>{querying ? 'Searching Tree...' : 'Verify Clause'}</span>
            </button>
          </form>

          {/* Query Result Card */}
          {queryResult && (
            <div className="bg-card border-2 border-primary/20 rounded-xl p-5 shadow-card space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 bg-primary-soft text-primary font-bold text-[10px] rounded">
                    {queryResult.node_title || 'Regulatory Finding'}
                  </span>
                  {queryResult.page && (
                    <span className="text-[11px] font-semibold text-text-muted">
                      Official Page {queryResult.page}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-mono text-text-muted">
                  Engine: {queryResult.engine || 'PageIndex Local'}
                </span>
              </div>

              <div className="text-xs text-text-primary leading-relaxed whitespace-pre-line bg-app p-3 rounded-lg border border-border">
                {queryResult.answer}
              </div>

              {queryResult.sources && queryResult.sources.length > 0 && (
                <div className="text-[11px] text-text-secondary">
                  <span className="font-semibold text-text-primary">Source Citation: </span>
                  {queryResult.sources[0].title} (Page {queryResult.sources[0].page})
                </div>
              )}
            </div>
          )}

          {/* Quick Pre-Computed Regulatory Checks */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
              Common Regulatory Norms (Quick Checks)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {quickChecks.map((qc, i) => (
                <div
                  key={i}
                  onClick={() => handleQuickClick(qc.question)}
                  className="bg-card hover:bg-card-hover border border-border rounded-lg p-3.5 cursor-pointer transition shadow-sm hover:border-primary/40 group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-text-primary group-hover:text-primary transition">
                      {qc.title}
                    </span>
                    <span className="text-[10px] font-mono bg-app px-2 py-0.5 rounded text-text-muted">
                      Page {qc.page || 1}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary line-clamp-2 mt-1">
                    {qc.answer}
                  </p>
                  <div className="mt-2.5 flex items-center text-[10px] text-primary font-semibold">
                    <span>Inspect Clause Excerpt</span>
                    <ChevronRight size={12} className="ml-1 group-hover:translate-x-0.5 transition" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
