import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Files, 
  Search, 
  Filter, 
  ArrowUpRight, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  RotateCcw, 
  Building2, 
  AlertOctagon,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../lib/api';
import { StatCard } from '../../components/shared/StatCard';
import { EmptyState } from '../../components/shared/EmptyState';
import { clearDashboardCache } from '../dashboard/dashboardCache';

export interface ApplicationItem {
  id: string;
  institution: string;
  type: string;
  status: string;
  riskScore: number | null;
  isSynthetic?: boolean;
  submitted: string;
}

export const ApplicationListView: React.FC<{ onOpenNewAppModal: () => void }> = ({ onOpenNewAppModal }) => {
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const navigate = useNavigate();

  const fetchApplications = async (silent: boolean = false) => {
    try {
      if (!silent) {
        setIsRefreshing(true);
      }
      const res = await api.get<ApplicationItem[]>('/applications');
      setApplications(res.data);
    } catch (err) {
      console.error('Failed to fetch applications queue:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchApplications(false);

    const handleRefresh = () => {
      fetchApplications(true);
    };

    window.addEventListener('dashboard:refresh', handleRefresh);
    return () => window.removeEventListener('dashboard:refresh', handleRefresh);
  }, []);

  // Auto-poll silently if any application is actively in the scrutiny pipeline
  const hasPendingScrutiny = useMemo(() => {
    return applications.some(a => 
      ['submitted', 'ai_analysis', 'verification'].includes((a.status || '').toLowerCase())
    );
  }, [applications]);

  useEffect(() => {
    if (!hasPendingScrutiny) return;

    const pollInterval = setInterval(() => {
      fetchApplications(true);
    }, 1200);

    return () => clearInterval(pollInterval);
  }, [hasPendingScrutiny]);

  const handleDeleteApplication = async (e: React.MouseEvent, appId: string) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to permanently delete application "${appId}"? All associated documents, extracted facts, and findings will be removed.`)) {
      try {
        setDeletingId(appId);
        await api.delete(`/applications/${appId}`);
        clearDashboardCache();
        window.dispatchEvent(new CustomEvent('dashboard:refresh'));
        await fetchApplications(true);
      } catch (err: any) {
        console.error('Failed to delete application:', err);
        alert(err.response?.data?.detail || 'Failed to delete application.');
      } finally {
        setDeletingId(null);
      }
    }
  };

  // Distinct Categories for Filter
  const categories = useMemo(() => {
    const set = new Set<string>();
    applications.forEach(a => {
      if (a.type) set.add(a.type);
    });
    return Array.from(set);
  }, [applications]);

  // Filtered Applications
  const filteredApps = useMemo(() => {
    return applications.filter(app => {
      // 1. Search Query (ID or Institution)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = app.id.toLowerCase().includes(q);
        const matchesInst = (app.institution || '').toLowerCase().includes(q);
        if (!matchesId && !matchesInst) return false;
      }

      // 2. Status Filter
      if (statusFilter !== 'all') {
        const s = (app.status || '').toLowerCase();
        if (statusFilter === 'pipeline') {
          if (!['submitted', 'ai_analysis', 'verification'].includes(s)) return false;
        } else if (s !== statusFilter) {
          return false;
        }
      }

      // 3. Category Filter
      if (categoryFilter !== 'all' && app.type !== categoryFilter) {
        return false;
      }

      // 4. Risk Filter
      if (riskFilter === 'high') {
        if ((app.riskScore ?? 0) <= 50) return false;
      } else if (riskFilter === 'compliant') {
        if ((app.riskScore ?? 0) > 50) return false;
      }

      return true;
    });
  }, [applications, searchQuery, statusFilter, categoryFilter, riskFilter]);

  // Summary Metrics for the queue
  const metrics = useMemo(() => {
    const total = applications.length;
    const needsReview = applications.filter(a => a.status === 'officer_review').length;
    const cleared = applications.filter(a => a.status === 'completed' && (a.riskScore ?? 0) <= 30).length;
    const highRisk = applications.filter(a => (a.riskScore ?? 0) > 50).length;
    const inPipeline = applications.filter(a => 
      ['submitted', 'ai_analysis', 'verification'].includes((a.status || '').toLowerCase())
    ).length;

    return { total, needsReview, cleared, highRisk, inPipeline };
  }, [applications]);

  const hasActiveFilters = searchQuery !== '' || statusFilter !== 'all' || categoryFilter !== 'all' || riskFilter !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setRiskFilter('all');
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-card/60 rounded-xl w-64 mb-4 border border-border"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-card/60 rounded-card border border-border"></div>
          ))}
        </div>
        <div className="h-96 bg-card/60 rounded-card border border-border"></div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="space-y-6"
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h2 className="text-2xl font-black text-text-primary tracking-tight">
              Institutional Applications Queue
            </h2>
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary-soft text-primary border border-primary/30">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span>AICTE Regulation Bureau • Cycle 2025-26</span>
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Complete regulatory scrutiny registry for Technical Institution Approval dossiers and Extension of Approval (EoA) filings.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchApplications(false)}
            title="Refresh application queue"
            disabled={isRefreshing}
            className="p-2 bg-card border border-border rounded-xl text-text-secondary hover:text-text-primary hover:border-primary/40 transition cursor-pointer disabled:opacity-50"
          >
            <RotateCcw size={15} className={isRefreshing ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={onOpenNewAppModal}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-blue-600/20 active:scale-95 cursor-pointer"
          >
            <Plus size={15} />
            <span>Ingest New Application</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="TOTAL APPLICATIONS"
          value={metrics.total}
          subText="Registered in scrutiny queue"
          icon={Files}
          badgeColor="primary"
          index={0}
        />
        <StatCard
          title="NEEDS OFFICER REVIEW"
          value={metrics.needsReview}
          subText="Flagged for regulatory scrutiny"
          icon={AlertTriangle}
          badgeColor="warning"
          index={1}
        />
        <StatCard
          title="AUTOMATICALLY CLEARED"
          value={metrics.cleared}
          subText="Zero critical deficiencies"
          icon={CheckCircle2}
          badgeColor="success"
          index={2}
        />
        <StatCard
          title="HIGH RISK ANOMALIES"
          value={metrics.highRisk}
          subText="Risk index exceeds 50%"
          icon={AlertOctagon}
          badgeColor="danger"
          index={3}
        />
      </div>

      {/* Main Table Card with Integrated Search & Filter Controls */}
      <div className="glass-card rounded-card overflow-hidden">
        {/* Controls Toolbar */}
        <div className="p-4 border-b border-border bg-card-subtle/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search by Application ID (e.g. AICTE-2026...) or Institution name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card border border-border rounded-xl pl-9 pr-3.5 py-2 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-primary transition"
            />
          </div>

          {/* Filters & Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter */}
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] font-semibold text-text-muted">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-card border border-border text-xs rounded-xl px-2.5 py-1.5 font-medium text-text-secondary outline-none shadow-sm cursor-pointer hover:border-primary/40 transition"
              >
                <option value="all">All Statuses ({applications.length})</option>
                <option value="officer_review">Officer Review ({metrics.needsReview})</option>
                <option value="completed">Completed ({metrics.cleared})</option>
                <option value="pipeline">In Pipeline ({metrics.inPipeline})</option>
              </select>
            </div>

            {/* Category Filter */}
            {categories.length > 1 && (
              <div className="flex items-center space-x-1.5">
                <span className="text-[11px] font-semibold text-text-muted">Type:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-card border border-border text-xs rounded-xl px-2.5 py-1.5 font-medium text-text-secondary outline-none shadow-sm cursor-pointer hover:border-primary/40 transition"
                >
                  <option value="all">All Types</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Risk Filter */}
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] font-semibold text-text-muted">Risk:</span>
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="bg-card border border-border text-xs rounded-xl px-2.5 py-1.5 font-medium text-text-secondary outline-none shadow-sm cursor-pointer hover:border-primary/40 transition"
              >
                <option value="all">All Risk Levels</option>
                <option value="high">High Risk (&gt;50%)</option>
                <option value="compliant">Compliant (≤50%)</option>
              </select>
            </div>

            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-[11px] text-primary hover:underline font-semibold px-2 py-1 cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Content Table or Empty States */}
        {applications.length === 0 ? (
          <div className="p-12 text-center">
            <EmptyState
              icon={Files}
              title="No Applications in Queue"
              description="No technical institution approval dossiers have been submitted for scrutiny yet."
              actionText="Ingest Canonical Application Dossier"
              onAction={onOpenNewAppModal}
            />
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Filter size={32} className="mx-auto text-text-muted/50" />
            <h3 className="text-sm font-bold text-text-primary">No Matching Applications</h3>
            <p className="text-xs text-text-secondary max-w-sm mx-auto">
              No applications match your active search and filter criteria. Try adjusting your search term or clearing filters.
            </p>
            <button
              onClick={resetFilters}
              className="px-3.5 py-1.5 bg-primary-soft text-primary font-semibold text-xs rounded-lg hover:bg-primary hover:text-white transition cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-card-subtle text-text-secondary font-semibold uppercase text-[10px] border-b border-border tracking-wider">
                <tr>
                  <th className="py-3 px-4">Application ID</th>
                  <th className="py-3 px-4">Technical Institution</th>
                  <th className="py-3 px-4">Filing Category</th>
                  <th className="py-3 px-4">Scrutiny Status</th>
                  <th className="py-3 px-4">Risk Index</th>
                  <th className="py-3 px-4">Submitted Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredApps.map((row) => {
                  const isHighRisk = (row.riskScore ?? 0) > 50;
                  const isProcessing = ['submitted', 'ai_analysis', 'verification'].includes((row.status || '').toLowerCase());

                  return (
                    <tr
                      key={row.id}
                      onClick={() => navigate(`/applications/${row.id}`)}
                      className="hover:bg-primary/5 transition cursor-pointer group"
                    >
                      {/* ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-primary group-hover:underline">
                        <div className="flex items-center space-x-1.5">
                          <span>{row.id}</span>
                          {row.isSynthetic && (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-400/20">
                              SHOWCASE
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Institution */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-text-primary text-xs leading-tight">
                          {row.institution || "Apex Technical Campus"}
                        </div>
                        <span className="text-[10px] text-text-muted font-mono block mt-0.5">
                          AICTE Approved Technical Campus
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 text-text-primary font-medium">
                        <span className="px-2 py-0.5 rounded-md bg-card-subtle border border-border text-[11px]">
                          {row.type}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                          row.status === 'completed'
                            ? 'bg-success-soft text-success border-success/30'
                            : row.status === 'officer_review'
                            ? 'bg-warning-soft text-warning border-warning/30 animate-pulse-warning'
                            : 'bg-primary-soft text-primary border-primary/30'
                        }`}>
                          {isProcessing ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          )}
                          <span className="capitalize">{row.status.replace('_', ' ')}</span>
                        </span>
                      </td>

                      {/* Risk Index */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-16 h-1.5 rounded-full bg-card-subtle overflow-hidden border border-border/50">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${isHighRisk ? 'bg-danger' : 'bg-success'}`}
                              style={{ width: `${Math.min(row.riskScore ?? 0, 100)}%` }}
                            />
                          </div>
                          <span className={`font-mono font-bold text-xs ${isHighRisk ? 'text-danger' : 'text-success'}`}>
                            {row.riskScore !== null ? `${row.riskScore}%` : '—'}
                          </span>
                        </div>
                      </td>

                      {/* Submitted */}
                      <td className="py-3.5 px-4 text-text-muted font-mono">{row.submitted}</td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/applications/${row.id}`);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-primary-soft text-primary hover:bg-primary hover:text-white font-semibold inline-flex items-center space-x-1 transition-all"
                          >
                            <span>Inspect</span>
                            <ArrowUpRight size={13} />
                          </button>

                          <button
                            onClick={(e) => handleDeleteApplication(e, row.id)}
                            disabled={deletingId === row.id}
                            title={`Delete application ${row.id}`}
                            className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger-soft transition disabled:opacity-50 cursor-pointer"
                          >
                            <Trash2 size={14} className={deletingId === row.id ? 'animate-spin' : ''} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer */}
        <div className="p-3.5 border-t border-border bg-card-subtle/30 flex items-center justify-between text-[11px] text-text-muted">
          <span>Showing {filteredApps.length} of {applications.length} registered applications</span>
          <span className="font-mono">PRAMITI Scrutiny Ledger v2.0</span>
        </div>
      </div>
    </motion.div>
  );
};
