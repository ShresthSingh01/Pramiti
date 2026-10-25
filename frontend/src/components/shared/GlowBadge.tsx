import React from 'react';

export type SeverityType = 'critical' | 'high' | 'medium' | 'low' | 'verified' | 'warning';

interface GlowBadgeProps {
  label: string;
  variant?: SeverityType;
  size?: 'sm' | 'md';
  pulse?: boolean;
  className?: string;
}

const variantStyles: Record<SeverityType, string> = {
  critical:
    'bg-danger-soft text-danger border-danger/40 shadow-[0_0_12px_rgba(239,68,68,0.25)]',
  high:
    'bg-orange-soft text-orange border-orange/40 shadow-[0_0_12px_rgba(249,115,22,0.2)]',
  medium:
    'bg-warning-soft text-warning border-warning/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]',
  warning:
    'bg-warning-soft text-warning border-warning/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]',
  low:
    'bg-primary-soft text-primary border-primary/40 shadow-[0_0_12px_rgba(59,130,246,0.15)]',
  verified:
    'bg-success-soft text-success border-success/40 shadow-[0_0_12px_rgba(34,197,94,0.2)]',
};

export const GlowBadge: React.FC<GlowBadgeProps> = ({
  label,
  variant = 'low',
  size = 'sm',
  pulse = false,
  className = '',
}) => {
  const base = variantStyles[variant] || variantStyles.low;
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  const pulseClass = pulse
    ? variant === 'critical'
      ? 'animate-pulse-danger'
      : 'animate-pulse'
    : '';

  return (
    <span
      className={`inline-flex items-center space-x-1 font-semibold rounded-md border tracking-wide uppercase ${base} ${sizeClass} ${pulseClass} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      <span>{label}</span>
    </span>
  );
};
