import React, { useState, useEffect } from 'react';
import { ShieldCheck, LogIn, Lock, UserCheck, AlertCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../../assets/logo.png';
import api from '../../lib/api';
import { ThemeToggle } from '../../components/shared/ThemeToggle';
import { Theme, getInitialTheme, applyTheme } from '../../lib/theme';

interface LoginPageProps {
  onLogin: (token: string, role: string, fullName: string) => void;
}

const STATUS_CYCLER = [
  'Verifying Issuing Authority Registry Adapters...',
  'Grounding Provenance against AICTE APH 2025-26...',
  'Multi-Layer PDF ELA & Metadata Forensics Ready...',
  'Cryptographic SHA-256 Chaining Initialized...',
];

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('officer');
  const [password, setPassword] = useState('aicte2026');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusIdx, setStatusIdx] = useState(0);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIdx((prev) => (prev + 1) % STATUS_CYCLER.length);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const cleanUser = username.trim();
    const cleanPw = password.trim();

    if (!cleanUser || !cleanPw) {
      setError('Please enter both Officer ID and Passkey.');
      setLoading(false);
      return;
    }

    try {
      const formData = new URLSearchParams();
      formData.append('username', cleanUser);
      formData.append('password', cleanPw);

      const res = await api.post('/auth/token', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const { access_token, role, full_name } = res.data;
      localStorage.setItem('eg_token', access_token);
      localStorage.setItem('eg_role', role);
      localStorage.setItem('eg_name', full_name);
      localStorage.setItem('eg_user', cleanUser);
      localStorage.setItem('pramiti_token', access_token);

      onLogin(access_token, role, full_name);
    } catch (err: any) {
      if (!err?.response) {
        setError('Cannot connect to PRAMITI backend server. Please make sure the backend is active on http://127.0.0.1:8000.');
      } else if (err.response.status >= 500) {
        setError(`Backend gateway error (HTTP ${err.response.status}). Ensure backend is active on http://127.0.0.1:8000.`);
      } else {
        setError(err?.response?.data?.detail || 'Authentication failed. Please verify credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-app flex flex-col justify-center items-center p-4 relative overflow-hidden transition-colors">
      {/* Background Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.12)_0%,transparent_70%)] pointer-events-none" />

      {/* Top right Theme Switcher */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md glass-card rounded-2xl p-8 space-y-6 relative z-10 shadow-2xl border border-border"
      >
        {/* Crest & Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="relative w-24 h-24 flex items-center justify-center">
            {/* Animated Rotating Ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 rounded-2xl border border-dashed border-primary/30"
            />
            <div className="w-20 h-20 rounded-2xl bg-card border border-border p-2 flex items-center justify-center shadow-lg relative z-10">
              <img src={logo} alt="PRAMITI Logo" className="w-full h-full object-contain" />
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-black tracking-[0.15em] bg-gradient-to-r from-blue-500 via-indigo-400 to-blue-400 bg-clip-text text-transparent">
              PRAMITI
            </h1>
            <p className="text-xs text-text-secondary max-w-xs leading-relaxed mt-1">
              AI-Powered Application Validation, Document Provenance & Regulatory Scrutiny Platform
            </p>
          </div>

          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-semibold bg-primary-soft text-primary border border-primary/30">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span>Regulation Bureau · Ministry of Education, GoI</span>
          </div>
        </div>

        {/* Live Status Cycling Ticker */}
        <div className="h-6 flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={statusIdx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="text-[11px] font-mono text-text-muted text-center flex items-center space-x-1.5 truncate"
            >
              <span className="text-success">●</span>
              <span>{STATUS_CYCLER[statusIdx]}</span>
            </motion.p>
          </AnimatePresence>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-3 bg-danger-soft border border-danger/30 rounded-xl flex items-center space-x-2 text-danger text-xs"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Authorized Officer ID
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="officer / admin"
              className="w-full px-3.5 py-2.5 text-xs bg-card-subtle border border-border rounded-xl text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Secure Regulatory Passkey
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 text-xs bg-card-subtle border border-border rounded-xl text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs tracking-wide uppercase rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer active:scale-98"
          >
            {loading ? (
              <span className="text-xs">Authenticating Signature...</span>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Enter Scrutiny Workspace</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Credentials Quick Inject */}
        <div className="pt-4 border-t border-border/70 space-y-2 text-[11px]">
          <p className="font-semibold text-text-secondary text-center">SIH Demo Authorized Credentials</p>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <button
              type="button"
              onClick={() => { setUsername('officer'); setPassword('aicte2026'); }}
              className="p-2.5 border border-border/80 rounded-xl bg-card-subtle hover:border-primary/50 text-left transition-all group cursor-pointer"
            >
              <span className="font-bold block text-text-primary group-hover:text-primary">Scrutiny Officer</span>
              <span className="font-mono text-text-muted">officer / aicte2026</span>
            </button>
            <button
              type="button"
              onClick={() => { setUsername('admin'); setPassword('aicte2026'); }}
              className="p-2.5 border border-border/80 rounded-xl bg-card-subtle hover:border-primary/50 text-left transition-all group cursor-pointer"
            >
              <span className="font-bold block text-text-primary group-hover:text-primary">Admin Director</span>
              <span className="font-mono text-text-muted">admin / aicte2026</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
