import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { Theme } from '../../lib/theme';

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className="p-2 rounded-xl border border-border bg-card/70 hover:bg-card text-text-secondary hover:text-text-primary transition-all duration-200 relative overflow-hidden shadow-sm flex items-center justify-center group"
      title={`Switch to ${theme === 'dark' ? 'Light (Bureau)' : 'Dark (Terminal)'} Mode`}
      aria-label="Toggle visual theme"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={theme}
          initial={{ y: -16, opacity: 0, rotate: -90, scale: 0.6 }}
          animate={{ y: 0, opacity: 1, rotate: 0, scale: 1 }}
          exit={{ y: 16, opacity: 0, rotate: 90, scale: 0.6 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="flex items-center justify-center"
        >
          {theme === 'dark' ? (
            <Sun size={17} className="text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] group-hover:scale-110 transition-transform" />
          ) : (
            <Moon size={17} className="text-blue-600 drop-shadow-[0_0_8px_rgba(37,99,235,0.4)] group-hover:scale-110 transition-transform" />
          )}
        </motion.div>
      </AnimatePresence>
    </button>
  );
};
