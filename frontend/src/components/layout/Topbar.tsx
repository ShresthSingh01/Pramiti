import React, { useState } from 'react';
import { Search, Bell, LogOut, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { logout } from '../../lib/api';
import { ThemeToggle } from '../shared/ThemeToggle';
import { Theme } from '../../lib/theme';

interface TopbarProps {
  hasUnreadAlerts: boolean;
  hasSynthetic: boolean;
  onPurgeSynthetic: () => void;
  theme: Theme;
  onToggleTheme: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  hasUnreadAlerts,
  hasSynthetic,
  onPurgeSynthetic,
  theme,
  onToggleTheme,
}) => {
  const officerName = localStorage.getItem('eg_name') || 'Er. Rajesh Verma (Scrutiny Officer)';
  const officerRole = localStorage.getItem('eg_role') || 'scrutiny_officer';
  const officerInitials = officerName.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || 'SO';
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  return (
    <header className="h-16 glass-card border-b border-border/80 flex items-center justify-between px-6 sticky top-0 z-30 transition-all">
      {/* Search Bar with Focus Glow Expansion */}
      <div
        className={`flex items-center space-x-2.5 px-3.5 py-1.5 rounded-xl border transition-all duration-300 ${
          isSearchFocused
            ? 'w-96 border-primary/50 shadow-glow bg-card'
            : 'w-72 border-border/80 bg-card/60 hover:border-border'
        }`}
      >
        <Search size={15} className={isSearchFocused ? 'text-primary' : 'text-text-muted'} />
        <input
          type="text"
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          placeholder="Search Institution, Application ID, or Clause..."
          className="bg-transparent border-none outline-none w-full text-xs text-text-primary placeholder:text-text-muted/70"
        />
      </div>

      {/* Right Action Icons & Controls */}
      <div className="flex items-center space-x-3.5">
        {/* Synthetic Demonstration Active Warning Banner */}
        {hasSynthetic && (
          <div className="hidden sm:flex items-center space-x-2 bg-amber-500/10 text-amber-500 text-[11px] font-semibold px-3 py-1 rounded-lg border border-amber-500/30">
            <Sparkles size={13} className="text-amber-500 animate-pulse" />
            <span>Synthetic Demo Active</span>
            <button
              onClick={onPurgeSynthetic}
              className="text-danger underline hover:text-red-400 ml-1 font-bold cursor-pointer transition-colors"
            >
              Purge
            </button>
          </div>
        )}

        {/* Theme Toggle (Light / Dark) */}
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />

        {/* Alerts Bell with Pulsing Indicator */}
        <Link
          to="/alerts"
          className="relative p-2 text-text-secondary hover:text-text-primary rounded-xl border border-border bg-card/60 hover:bg-card transition-colors flex items-center justify-center shadow-sm"
          title="Regulatory Deficiency Alerts"
        >
          <Bell size={17} />
          {hasUnreadAlerts && (
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-danger animate-pulse-danger flex items-center justify-center ring-2 ring-card" />
          )}
        </Link>

        {/* Authenticated Officer Profile Chip */}
        <div className="flex items-center space-x-3 pl-3 border-l border-border/80">
          <div className="relative">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-[0_0_12px_rgba(59,130,246,0.35)]">
              {officerInitials}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2 border-card" />
          </div>

          <div className="text-left text-xs hidden md:block">
            <p className="font-semibold text-text-primary leading-tight flex items-center space-x-1">
              <span>{officerName}</span>
            </p>
            <p className="text-[10px] text-text-secondary capitalize font-mono mt-0.5">
              {officerRole.replace('_', ' ')} · AICTE HQ
            </p>
          </div>

          {/* Logout Action */}
          <button
            onClick={logout}
            title="Log out secure session"
            className="p-2 text-text-muted hover:text-danger hover:bg-danger-soft rounded-lg transition-colors ml-1"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
};
