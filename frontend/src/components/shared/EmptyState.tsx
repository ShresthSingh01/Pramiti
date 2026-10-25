import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionText,
  onAction
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center glass-card rounded-2xl border border-border">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-card-subtle border border-border/80 flex items-center justify-center text-text-muted mb-3 shadow-inner">
          <Icon size={24} className="text-primary/70" />
        </div>
      )}
      <h3 className="text-sm font-bold text-text-primary mb-1 tracking-tight">{title}</h3>
      <p className="text-xs text-text-secondary max-w-sm mb-4 leading-relaxed">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl transition shadow-md shadow-blue-600/20 active:scale-95 cursor-pointer"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
