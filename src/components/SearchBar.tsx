import React, { useState, useCallback } from 'react';
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
      <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200 px-3 py-2">
        <span className="text-gray-400 mr-2">🔍</span>
        <input
          type="text"
          placeholder="Search dependencies..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="flex-1 outline-none text-sm"
        />
      </div>

      {isOpen && results.length > 0 && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <ul className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
            {results.map(node => (
              <li
                key={node.id}
                onClick={() => handleSelect(node.id)}
                className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm"
              >
                <span className="font-medium">{node.name}</span>
                {node.version && (
                  <span className="text-gray-500 ml-2">{node.version}</span>
                )}
                <span className="text-gray-400 text-xs block">{node.group}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};
