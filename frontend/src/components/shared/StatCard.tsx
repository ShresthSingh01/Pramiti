import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { AnimatedCounter } from './AnimatedCounter';

interface StatCardProps {
  title: string;
  value: number | string | null;
  subText?: string;
  icon?: LucideIcon;
  badgeColor?: 'primary' | 'success' | 'warning' | 'danger';
  index?: number;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subText,
  icon: Icon,
  badgeColor = 'primary',
  index = 0,
}) => {
  const isNumeric = typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)) && value.trim() !== '');

  const colorStyles = {
    primary: {
      badge: 'bg-primary-soft text-primary border border-primary/20 shadow-[0_0_12px_rgba(59,130,246,0.25)]',
      accent: 'group-hover:border-primary/40',
      glow: 'from-primary/10',
    },
    success: {
      badge: 'bg-success-soft text-success border border-success/20 shadow-[0_0_12px_rgba(34,197,94,0.25)]',
      accent: 'group-hover:border-success/40',
      glow: 'from-success/10',
    },
    warning: {
      badge: 'bg-warning-soft text-warning border border-warning/20 shadow-[0_0_12px_rgba(245,158,11,0.25)]',
      accent: 'group-hover:border-warning/40',
      glow: 'from-warning/10',
    },
    danger: {
      badge: 'bg-danger-soft text-danger border border-danger/30 shadow-[0_0_14px_rgba(239,68,68,0.3)]',
      accent: 'group-hover:border-danger/50 shadow-danger-glow',
      glow: 'from-danger/15',
    },
  }[badgeColor];

  const isCritical = badgeColor === 'danger' && value !== null && Number(value) > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: index * 0.03, ease: [0.16, 1, 0.3, 1] }}
      className={`glass-card rounded-card p-5 relative overflow-hidden flex flex-col justify-between group transition-all duration-200 ${colorStyles.accent}`}
    >
      {/* Background glow radial on hover */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${colorStyles.glow} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
      />

      {/* Subtle scan-line animation for critical cards */}
      {isCritical && (
        <div className="absolute left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-danger/70 to-transparent scan-anim pointer-events-none" />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-3 relative z-10">
        <span className="text-xs font-semibold tracking-wide text-text-secondary uppercase">
          {title}
        </span>
        {Icon && (
          <div className={`p-2 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${colorStyles.badge}`}>
            <Icon size={16} />
          </div>
        )}
      </div>

      {/* Value & Subtext */}
      <div className="relative z-10">
        <div className="text-3xl font-black text-text-primary tracking-tight font-mono">
          {isNumeric ? (
            <AnimatedCounter value={value} duration={1.1} />
          ) : (
            <span>{value ?? '—'}</span>
          )}
        </div>
        {subText && (
          <p className="text-[11px] font-medium text-text-muted mt-1 flex items-center space-x-1">
            {isCritical && <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse-danger shrink-0" />}
            <span>{subText}</span>
          </p>
        )}
      </div>
    </motion.div>
  );
};
