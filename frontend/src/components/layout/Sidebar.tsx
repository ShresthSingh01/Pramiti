import React from 'react';
import { NavLink } from 'react-router-dom';
import logo from '../../assets/logo.png';
import { 
  LayoutDashboard, 
  Files, 
  ShieldCheck, 
  BadgeCheck, 
  Bell, 
  Settings,
  Plus
} from 'lucide-react';

interface SidebarProps {
  onOpenSyntheticModal: () => void;
}

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/applications', label: 'Applications', icon: Files },
  { to: '/rules', label: 'Rule Compliance', icon: ShieldCheck },
  { to: '/verification', label: 'Verification Hub', icon: BadgeCheck },
  { to: '/alerts', label: 'Deficiency Alerts', icon: Bell },
  { to: '/settings', label: 'Settings & APH', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ onOpenSyntheticModal }) => {
  return (
    <aside className="w-64 bg-sidebar flex flex-col justify-between text-text-on-dark min-h-screen shrink-0 shadow-2xl border-r border-white/5 relative z-40 transition-colors">
      <div>
        {/* Brand header */}
        <NavLink
          to="/"
          className="p-4 border-b border-white/10 flex items-center space-x-3 group transition-colors hover:bg-white/[0.03]"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-white via-white to-blue-50 p-1 flex items-center justify-center shadow-[0_0_16px_rgba(255,255,255,0.15)] overflow-hidden shrink-0 border border-white/20 group-hover:scale-105 transition-transform">
            <img src={logo} alt="PRAMITI Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="font-black text-base tracking-wider bg-gradient-to-r from-white via-blue-100 to-indigo-200 bg-clip-text text-transparent leading-tight">
                PRAMITI
              </h1>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                v2.0
              </span>
            </div>
            <p className="text-[10px] text-text-muted font-medium tracking-tight">AICTE Evidence Intelligence</p>
          </div>
        </NavLink>

        {/* Suite navigation label */}
        <div className="px-5 pt-4 pb-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted/60">
            Regulatory Scrutiny
          </p>
        </div>

        {/* Navigation links */}
        <nav className="p-3 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group relative ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600/30 to-indigo-600/10 text-white border-l-4 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.2)]'
                      : 'text-text-muted hover:bg-sidebar-hover hover:text-white hover:translate-x-0.5'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={17}
                      className={`transition-colors ${
                        isActive ? 'text-blue-400 drop-shadow-[0_0_6px_rgba(96,165,250,0.6)]' : 'text-text-muted group-hover:text-white'
                      }`}
                    />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Registration Action & Organization footer */}
      <div className="p-4 border-t border-white/10 space-y-3">
        <button
          onClick={onOpenSyntheticModal}
          className="w-full flex items-center justify-center space-x-2 py-2 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-medium border border-white/10 transition-colors"
        >
          <Plus size={14} className="text-blue-400" />
          <span>Register Application</span>
        </button>

        <div className="pt-2 text-[10px] text-text-muted border-t border-white/5 leading-snug">
          <p className="font-semibold text-text-on-dark">Regulation Bureau</p>
          <p className="text-text-muted/80">Ministry of Education, GoI</p>
          <div className="flex items-center space-x-1.5 mt-2 text-[9px] text-emerald-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>APH 2025-26 Active</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
