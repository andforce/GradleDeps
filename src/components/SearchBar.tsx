import React, { useState, useCallback } from 'react';
import { Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DependencyNode } from '../types/dependency';

interface SearchBarProps {
  nodes: DependencyNode[];
  onSelect: (nodeId: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ nodes, onSelect }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredNodes = useCallback(() => {
    if (!query.trim()) return [];
    return nodes.filter(n =>
      n.name.toLowerCase().includes(query.toLowerCase()) ||
      n.group.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10);
  }, [query, nodes]);

  const handleSelect = (nodeId: string) => {
    onSelect(nodeId);
    setQuery('');
    setIsOpen(false);
  };

  const results = filteredNodes();

  return (
    <div className="relative">
      <div className="flex items-center bg-white/80 backdrop-blur-xl rounded-xl shadow-sm border border-white/40 px-3 py-2 transition-all focus-within:shadow-md focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500/30">
        <Search className="text-slate-400 w-4 h-4 mr-2" />
        <input
          type="text"
          placeholder="Search dependencies..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="flex-1 outline-none text-sm bg-transparent placeholder-slate-400 text-slate-700 w-64"
        />
      </div>

      <AnimatePresence>
        {isOpen && results.length > 0 && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <motion.ul 
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="absolute top-full right-0 mt-2 w-80 bg-white/90 backdrop-blur-xl border border-white/40 rounded-xl shadow-xl z-20 max-h-80 overflow-y-auto overflow-x-hidden p-1"
            >
              {results.map((node, index) => (
                <motion.li
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  key={node.id}
                  onClick={() => handleSelect(node.id)}
                  className="px-4 py-3 hover:bg-slate-50/80 cursor-pointer rounded-lg transition-colors"
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-baseline gap-2 truncate">
                      <span className="font-medium text-slate-800 text-sm">{node.name}</span>
                      {node.version && (
                        <span className="text-blue-500/80 text-xs font-mono">{node.version}</span>
                      )}
                    </div>
                    <span className="text-slate-400 text-xs truncate">{node.group}</span>
                  </div>
                </motion.li>
              ))}
            </motion.ul>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
