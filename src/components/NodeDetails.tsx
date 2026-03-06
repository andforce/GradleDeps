import React, { useMemo } from 'react';
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

  if (!node || !stats) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-6">
        <p className="text-gray-500 text-center">
          Click a node to view details
        </p>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">Node Details</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <span className={`
            px-3 py-1 rounded-full text-xs font-medium
            ${node.type === 'project'
              ? 'bg-purple-100 text-purple-700'
              : 'bg-blue-100 text-blue-700'}
          `}>
            {node.type === 'project' ? 'Project Module' : 'External Library'}
          </span>
          {node.hasConflict && (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
              Conflict
            </span>
          )}
        </div>

        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide">Name</label>
          <p className="text-gray-800 font-medium break-all">{node.name}</p>
        </div>

        {node.version && (
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide">Version</label>
            <p className="text-gray-800 font-medium">{node.version}</p>
          </div>
        )}

        {node.group && (
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide">Group</label>
            <p className="text-gray-800 font-medium">{node.group}</p>
          </div>
        )}

        <div className="pt-4 border-t border-gray-100">
          <label className="text-xs text-gray-500 uppercase tracking-wide">Dependencies</label>
          <div className="mt-2 grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-2xl font-bold text-gray-800">{stats.directChildren}</p>
              <p className="text-xs text-gray-500">Direct</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-2xl font-bold text-gray-800">{stats.transitiveCount}</p>
              <p className="text-xs text-gray-500">Transitive</p>
            </div>
          </div>
        </div>

        {stats.parentNames.length > 0 && (
          <div className="pt-4 border-t border-gray-100">
            <label className="text-xs text-gray-500 uppercase tracking-wide">
              Referenced by ({stats.parentNames.length})
            </label>
            <ul className="mt-2 space-y-1">
              {stats.parentNames.slice(0, 5).map((name, idx) => (
                <li key={idx} className="text-sm text-gray-600 truncate">
                  • {name}
                </li>
              ))}
              {stats.parentNames.length > 5 && (
                <li className="text-sm text-gray-400">
                  + {stats.parentNames.length - 5} more...
                </li>
              )}
            </ul>
          </div>
        )}

        {node.hasConflict && node.conflictVersions && (
          <div className="pt-4 border-t border-gray-100">
            <label className="text-xs text-red-500 uppercase tracking-wide">Version Conflict</label>
            <p className="text-sm text-gray-600 mt-1">
              Also resolved as:
            </p>
            <ul className="mt-2 space-y-1">
              {node.conflictVersions.map((version, idx) => (
                <li key={idx} className="text-sm text-red-600">
                  • {version}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
