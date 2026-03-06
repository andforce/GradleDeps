import React from 'react';
import { motion } from 'framer-motion';

interface LegendItem {
  color: string;
  label: string;
  shape?: 'circle' | 'star';
}

const items: LegendItem[] = [
  { color: '#ef4444', label: 'Conflict' },
  { color: '#10b981', label: 'AndroidX' },
  { color: '#3b82f6', label: 'Kotlin/JetBrains' },
  { color: '#f59e0b', label: 'Google' },
  { color: '#6366f1', label: 'Other' },
  { color: '#ec4899', label: 'Project', shape: 'star' },
];

const StarIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg width="14" height="14" viewBox="-10 -10 20 20" className="mr-2.5 flex-shrink-0">
    <polygon
      points="0,-8 2.3,-2.6 8,-2.6 3.5,1.2 5.2,7 0,3.6 -5.2,7 -3.5,1.2 -8,-2.6 -2.3,-2.6"
      fill={color}
    />
  </svg>
);

export const Legend: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/40 p-5"
    >
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Legend</h4>
      <div className="space-y-3">
        {items.map((item, index) => (
          <motion.div 
            key={item.label} 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center"
          >
            {item.shape === 'star' ? (
              <StarIcon color={item.color} />
            ) : (
              <span
                className="w-3 h-3 rounded-full mr-2.5 flex-shrink-0 shadow-sm"
                style={{ backgroundColor: item.color }}
              />
            )}
            <span className="text-sm font-medium text-slate-600">{item.label}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
