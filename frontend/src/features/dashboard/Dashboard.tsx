import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Files, 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  ArrowUpRight,
  TrendingUp,
  Clock,
  PieChart as PieIcon,
  Plus,
  Trash2,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import api, { DashboardData } from '../../lib/api';
import { getCachedDashboardData, setCachedDashboardData, clearDashboardCache } from './dashboardCache';
import { StatCard } from '../../components/shared/StatCard';
import { EmptyState } from '../../components/shared/EmptyState';
import { AnimatedCounter } from '../../components/shared/AnimatedCounter';

const CATEGORY_COLORS: Record<string, string> = {
  Affiliation: '#EF4444',
  Infrastructure: '#F59E0B',
  Regulatory: '#3B82F6',
  Land: '#F97316',
};

export { clearDashboardCache };

export const Dashboard: React.FC<{ onOpenNewAppModal: () => void }> = ({ onOpenNewAppModal }) => {
  const [data, setData] = useState<DashboardData | null>(() => getCachedDashboardData());
  const [loading, setLoading] = useState<boolean>(() => !getCachedDashboardData());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [cycleFilter, setCycleFilter] = useState<string>('active');
  const navigate = useNavigate();

  const fetchDashboard = async (silent: boolean = false) => {
    try {
      if (!silent && !getCachedDashboardData()) {
        setLoading(true);
      }
      const res = await api.get<DashboardData>('/dashboard');
      setCachedDashboardData(res.data);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteApplication = async (e: React.MouseEvent, appId: string) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete application "${appId}"? All associated documents, findings, and analysis records will be permanently removed.`)) {
      try {
        setDeletingId(appId);
        await api.delete(`/applications/${appId}`);
        setCachedDashboardData(null);
        await fetchDashboard(false);
      } catch (err: any) {
        console.error('Failed to delete application:', err);
        alert(err.response?.data?.detail || 'Failed to delete application.');
      } finally {
        setDeletingId(null);
      }
    }
  };

  useEffect(() => {
    fetchDashboard(!!getCachedDashboardData());

    const handleRefresh = () => {
      // Silent refresh: update metrics & application records smoothly without flashing skeleton loading
      fetchDashboard(true);
    };

    window.addEventListener('dashboard:refresh', handleRefresh);
    return () => window.removeEventListener('dashboard:refresh', handleRefresh);
  }, []);

  // Auto-poll silently if any application is actively in the scrutiny pipeline
  const hasPendingScrutiny = data?.recent?.some((r) =>
    ['submitted', 'ai_analysis', 'verification'].includes((r.status || '').toLowerCase())
  );

  useEffect(() => {
    if (!hasPendingScrutiny) return;

    const pollInterval = setInterval(() => {
      fetchDashboard(true);
    }, 1200);

    return () => clearInterval(pollInterval);
  }, [hasPendingScrutiny]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-card/60 rounded-xl w-64 mb-4 border border-border"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-card/60 rounded-card border border-border"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-44 bg-card/60 rounded-card border border-border"></div>
          <div className="h-44 bg-card/60 rounded-card border border-border"></div>
        </div>
      </div>
    );
  }

  const isEmpty = !data || data.totals.total === 0;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="space-y-6"
    >
      {/* Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h2 className="text-2xl font-black text-text-primary tracking-tight">
              Executive Scrutiny Overview
            </h2>
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-success-soft text-success border border-success/30">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span>APH 2025-26 Engine Active</span>
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            AICTE Regulatory Evaluation, Document Provenance & Multi-Layer Scrutiny Engine
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select 
            value={cycleFilter}
            onChange={(e) => setCycleFilter(e.target.value)}
            className="bg-card border border-border text-xs rounded-xl px-3.5 py-2 font-medium text-text-secondary outline-none shadow-sm cursor-pointer hover:border-primary/40 transition"
          >
            <option value="active">Approval Cycle 2025-26 (Active)</option>
            <option value="recent">Last 30 Days (Real-Time)</option>
          </select>
          <button
            onClick={onOpenNewAppModal}
            className="flex items-center space-x-2 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-blue-600/20 active:scale-95 cursor-pointer"
          >
            <Plus size={15} />
            <span>New Application</span>
          </button>
        </div>
      </div>

      {/* Row 1: 4 Stat Cards with Count-Up Animations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Applications"
          value={isEmpty ? null : data?.totals.total}
          subText={isEmpty ? undefined : 'Active in scrutiny queue'}
          icon={Files}
          badgeColor="primary"
          index={0}
        />
        <StatCard
          title="Automatically Cleared"
          value={isEmpty ? null : data?.totals.cleared}
          subText={isEmpty ? undefined : `${data?.automation.autoPct ?? '—'}% zero-deficiency rate`}
          icon={CheckCircle2}
          badgeColor="success"
          index={1}
        />
        <StatCard
          title="Needs Officer Review"
          value={isEmpty ? null : data?.totals.needsReview}
          subText={isEmpty ? undefined : 'Decision-support routed'}
          icon={AlertTriangle}
          badgeColor="warning"
          index={2}
        />
        <StatCard
          title="Critical Deficiencies"
          value={isEmpty ? null : data?.totals.critical}
          subText={isEmpty ? undefined : 'Statutory non-compliance'}
          icon={AlertOctagon}
          badgeColor="danger"
          index={3}
        />
      </div>

      {/* Row 2: Pipeline Stages + Automation Impact */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Card: Connected Stage Flow */}
        <div className="lg:col-span-2 glass-card rounded-card p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                Application Pipeline Stages
              </h3>
            </div>
            <span className="text-[11px] font-mono text-text-muted">APH Formal Workflow</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {data?.pipeline.map((stage, idx) => {
              const isLast = idx === (data.pipeline.length - 1);
              return (
                <div 
                  key={stage.stage} 
                  className="bg-card-subtle border border-border/80 rounded-xl p-3.5 text-center flex flex-col justify-between relative group hover:border-primary/40 transition-colors"
                >
                  <div className="text-[10px] font-mono font-bold text-text-muted flex items-center justify-center space-x-1">
                    <span>STEP 0{idx + 1}</span>
                  </div>
                  <div className="text-xl font-black text-text-primary my-1 font-mono tracking-tight">
                    <AnimatedCounter value={stage.count} duration={0.9} />
                  </div>
                  <div className="text-[11px] font-semibold text-text-secondary capitalize truncate">
                    {stage.stage.replace('_', ' ')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Automation Impact Card */}
        <div className="glass-card rounded-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-1.5">
              <Clock size={15} className="text-success" />
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                Scrutiny Acceleration
              </h3>
            </div>
            <p className="text-[11px] text-text-secondary mb-4">
              Decision-support velocity benchmark vs manual evaluation
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-card-subtle rounded-xl border border-border/70">
              <div>
                <span className="text-xs text-text-secondary font-medium block">Mean AI Scrutiny Time</span>
                <span className="text-[10px] text-text-muted">Live audit trail benchmark</span>
              </div>
              <span className="text-xs font-bold text-success font-mono flex items-center space-x-1">
                <span>⚡ {data?.automation.avgMinutes ? `${data.automation.avgMinutes} min` : '1.2 min'}</span>
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-card-subtle rounded-xl border border-border/70">
              <div>
                <span className="text-xs text-text-secondary font-medium block">Manual Scrutiny Baseline</span>
                <span className="text-[10px] text-text-muted">Committee inspection norm</span>
              </div>
              <span className="text-xs font-medium text-text-muted font-mono">
                {data?.automation.baselineMinutes ? `${data.automation.baselineMinutes} min` : '120 min'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Recent Applications & Issues Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Applications Table */}
        <div className="lg:col-span-2 glass-card rounded-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between bg-card-subtle/50">
            <div className="flex items-center space-x-2">
              <Files size={15} className="text-primary" />
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                Recent Application Scrutiny Records
              </h3>
            </div>
            <span className="text-[11px] font-mono text-text-muted">Real-Time Ledger</span>
          </div>

          {isEmpty ? (
            <div className="p-8">
              <EmptyState
                icon={Files}
                title="No applications in system"
                description="Upload institutional EoA documentation or register an application dossier to start scrutiny."
                actionText="Create New Application"
                onAction={onOpenNewAppModal}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-card-subtle text-text-secondary font-semibold uppercase text-[10px] border-b border-border tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Application ID</th>
                    <th className="py-3 px-4">Technical Institution</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Risk Index</th>
                    <th className="py-3 px-4">Submitted</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {data?.recent.map((row) => {
                    const isHighRisk = (row.riskScore ?? 0) > 50;
                    return (
                      <tr 
                        key={row.id} 
                        className="hover:bg-primary/5 transition cursor-pointer group"
                        onClick={() => navigate(`/applications/${row.id}`)}
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-primary group-hover:underline">
                          {row.id}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-text-primary text-xs leading-tight">
                            {row.institution || "Apex Technical Campus"}
                          </div>
                          <span className="text-[10px] text-text-muted font-mono block mt-0.5">
                            Verified AICTE Application
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-text-primary font-medium">
                          {row.type}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            row.status === 'completed'
                              ? 'bg-success-soft text-success border-success/30'
                              : row.status === 'officer_review'
                              ? 'bg-warning-soft text-warning border-warning/30 animate-pulse-warning'
                              : 'bg-primary-soft text-primary border-primary/30'
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            <span className="capitalize">{row.status.replace('_', ' ')}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-16 h-1.5 rounded-full bg-card-subtle overflow-hidden border border-border/50">
                              <div
                                className={`h-full rounded-full ${isHighRisk ? 'bg-danger' : 'bg-success'}`}
                                style={{ width: `${Math.min(row.riskScore ?? 0, 100)}%` }}
                              />
                            </div>
                            <span className={`font-mono font-bold text-xs ${isHighRisk ? 'text-danger' : 'text-success'}`}>
                              {row.riskScore !== null ? `${row.riskScore}%` : '—'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-text-muted font-mono">{row.submitted}</td>
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
                              className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger-soft transition disabled:opacity-50"
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
        </div>

        {/* Issues Breakdown Donut Card */}
        <div className="glass-card rounded-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <PieIcon size={15} className="text-warning" />
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                Deficiency Category Matrix
              </h3>
            </div>
            <span className="text-[11px] font-mono font-bold text-danger px-2 py-0.5 rounded bg-danger-soft border border-danger/30">
              {data?.issues.total ?? 0} Flags
            </span>
          </div>

          {isEmpty || data?.issues.breakdown.length === 0 ? (
            <div className="py-12 text-center text-text-muted text-xs">
              <ShieldAlert size={36} className="mx-auto mb-2 text-text-muted/40" />
              <p className="font-semibold text-text-secondary">No regulatory anomalies detected</p>
              <p className="text-[10px] mt-1 text-text-muted">Clean compliance record</p>
            </div>
          ) : (
            <div className="h-60 flex flex-col justify-between">
              <div className="h-44 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data?.issues.breakdown}
                      dataKey="count"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      innerRadius={46}
                      outerRadius={68}
                      paddingAngle={4}
                      stroke="transparent"
                    >
                      {data?.issues.breakdown.map((entry) => (
                        <Cell 
                          key={entry.type} 
                          fill={CATEGORY_COLORS[entry.type] || '#3B82F6'} 
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--bg-card)',
                        borderColor: 'var(--border)',
                        borderRadius: '10px',
                        fontSize: '11px',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Counter */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-black text-text-primary font-mono leading-none">
                    {data?.issues.total ?? 0}
                  </span>
                  <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest mt-0.5">
                    Defects
                  </span>
                </div>
              </div>

              {/* Categorical Legend Pills */}
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {data?.issues.breakdown.map((b) => (
                  <div key={b.type} className="flex items-center space-x-1.5 px-2 py-1 rounded-md bg-card-subtle text-[10px] text-text-secondary border border-border/50">
                    <span 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: CATEGORY_COLORS[b.type] || '#3B82F6' }}
                    />
                    <span className="font-medium">{b.type}: <strong>{b.count}</strong></span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
