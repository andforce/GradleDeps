import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Box, GitBranch, AlertCircle, AlertTriangle, Layers } from 'lucide-react';
import type { DependencyNode } from '../types/dependency';

interface NodeDetailsProps {
  node: DependencyNode | null;
  allNodes: DependencyNode[];
  onClose: () => void;
}

export const NodeDetails: React.FC<NodeDetailsProps> = ({ node, allNodes, onClose }) => {
  const stats = useMemo(() => {
    if (!node) return null;

    const visited = new Set<string>();
    const queue = [...node.children];
    let transitiveCount = 0;

    while (queue.length > 0) {
      const childId = queue.shift()!;
      if (visited.has(childId)) continue;
      visited.add(childId);
      transitiveCount++;

      const child = allNodes.find(n => n.id === childId);
      if (child) {
        queue.push(...child.children);
      }
    }

    const parentNames = node.parents.map(parentId => {
      const parent = allNodes.find(n => n.id === parentId);
      return parent?.name || parentId;
    });

    return {
      directChildren: node.children.length,
      transitiveCount,
      parentNames,
    };
  }, [node, allNodes]);

  return (
    <AnimatePresence>
      {node && stats && (
        <motion.div
          initial={{ x: 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="w-80 bg-white/80 backdrop-blur-2xl border-l border-white/40 overflow-y-auto shadow-[-10px_0_30px_rgba(0,0,0,0.05)] z-20 flex flex-col h-full absolute right-0 top-0 bottom-0"
        >
          <div className="p-6 border-b border-slate-200/50 flex justify-between items-center bg-white/50 sticky top-0 backdrop-blur-md z-10">
            <h3 className="text-lg font-bold text-slate-800 tracking-tight">Node Details</h3>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6 flex-1">
            <div className="flex items-center justify-between">
              <span className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm border
                ${node.type === 'project'
                  ? 'bg-purple-50/80 text-purple-700 border-purple-200/50'
                  : 'bg-blue-50/80 text-blue-700 border-blue-200/50'}
              `}>
                <Box className="w-3.5 h-3.5" />
                {node.type === 'project' ? 'Project Module' : 'External Library'}
              </span>
              {node.hasConflict && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-red-50/80 text-red-600 border border-red-200/50 shadow-sm">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Conflict
                </span>
              )}
            </div>

            <div className="space-y-4">
              <div className="group">
                <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1 block">Name</label>
                <p className="text-slate-800 font-semibold break-all bg-white/50 p-2.5 rounded-lg border border-slate-100 group-hover:border-blue-200 transition-colors">
                  {node.name}
                </p>
              </div>

              {node.version && (
                <div className="group">
                  <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1 block">Version</label>
                  <p className="text-blue-600 font-mono text-sm bg-blue-50/30 p-2.5 rounded-lg border border-blue-100/50">
                    {node.version}
                  </p>
                </div>
              )}

              {node.group && (
                <div className="group">
                  <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1 block">Group</label>
                  <p className="text-slate-600 text-sm font-medium break-all bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                    {node.group}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-slate-200/50">
              <label className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-3">
                <GitBranch className="w-3.5 h-3.5" />
                Dependencies
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-white/80 to-slate-50/80 p-4 rounded-xl border border-slate-200/50 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-2xl font-black text-blue-600">{stats.directChildren}</p>
                  <p className="text-[10px] text-slate-500 font-medium uppercase mt-1">Direct</p>
                </div>
                <div className="bg-gradient-to-br from-white/80 to-slate-50/80 p-4 rounded-xl border border-slate-200/50 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-2xl font-black text-indigo-600">{stats.transitiveCount}</p>
                  <p className="text-[10px] text-slate-500 font-medium uppercase mt-1">Transitive</p>
                </div>
              </div>
            </div>

            {stats.parentNames.length > 0 && (
              <div className="pt-6 border-t border-slate-200/50">
                <label className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-3">
                  <Layers className="w-3.5 h-3.5" />
                  Referenced by ({stats.parentNames.length})
                </label>
                <div className="bg-white/50 rounded-xl border border-slate-200/50 overflow-hidden">
                  <ul className="divide-y divide-slate-100/50">
                    {stats.parentNames.slice(0, 5).map((name, idx) => (
                      <li key={idx} className="text-sm text-slate-600 truncate px-3 py-2 hover:bg-slate-50/80 transition-colors flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                        {name}
                      </li>
                    ))}
                    {stats.parentNames.length > 5 && (
                      <li className="text-xs text-slate-400 px-3 py-2 bg-slate-50/50 font-medium text-center">
                        + {stats.parentNames.length - 5} more modules
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            {node.hasConflict && node.conflictVersions && (
              <div className="pt-6 border-t border-red-100/50">
                <div className="bg-red-50/50 rounded-xl p-4 border border-red-200/50">
                  <label className="flex items-center gap-1.5 text-[10px] text-red-500 uppercase tracking-widest font-bold mb-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Version Conflict
                  </label>
                  <p className="text-xs text-slate-500 font-medium mb-2">
                    Also resolved in graph as:
                  </p>
                  <ul className="space-y-1.5">
                    {node.conflictVersions.map((version, idx) => (
                      <li key={idx} className="text-sm text-red-700 font-mono bg-white/80 px-2 py-1 rounded border border-red-100 shadow-sm flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-red-400" />
                        {version}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
