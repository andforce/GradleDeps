import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import type { ConflictInfo } from '../types/dependency';

interface ConflictPanelProps {
  conflicts: ConflictInfo[];
  onSelectNode: (nodeId: string) => void;
}

export const ConflictPanel: React.FC<ConflictPanelProps> = ({ conflicts, onSelectNode }) => {
  if (conflicts.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-emerald-50/80 backdrop-blur-xl border border-emerald-200/50 rounded-2xl p-4 shadow-sm"
      >
        <p className="text-emerald-700 text-sm font-medium flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          No dependency conflicts detected
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white/80 backdrop-blur-xl border border-red-200/50 rounded-2xl p-5 shadow-[0_8px_30px_rgb(239,68,68,0.08)]"
    >
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-red-100/50">
        <h4 className="text-sm font-bold text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Dependency Conflicts ({conflicts.length})
        </h4>
      </div>

      <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
        <AnimatePresence>
          {conflicts.map((conflict, index) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              key={conflict.id}
              className="bg-red-50/50 rounded-xl p-3.5 border border-red-100/50 hover:bg-red-50/80 transition-colors"
            >
              <p className="font-semibold text-sm text-slate-800 break-all leading-tight">
                {conflict.group}:<span className="text-red-700">{conflict.name}</span>
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 bg-white/50 w-fit px-2 py-1 rounded-md border border-red-100/30">
                <span className="font-medium text-slate-600">Versions:</span>
                {conflict.versions.join(', ')}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {conflict.nodes.slice(0, 3).map(nodeId => (
                  <button
                    key={nodeId}
                    onClick={() => onSelectNode(nodeId)}
                    className="text-xs px-2.5 py-1 bg-white/80 border border-red-200/60 rounded-md hover:bg-red-100 hover:border-red-300 text-red-700 font-medium transition-all shadow-sm active:scale-95"
                  >
                    {nodeId.split(':').pop()}
                  </button>
                ))}
                {conflict.nodes.length > 3 && (
                  <span className="text-xs text-slate-400 px-2 py-1 bg-slate-50/50 rounded-md border border-slate-200/50">
                    +{conflict.nodes.length - 3} more
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
