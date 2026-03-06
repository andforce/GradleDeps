import React from 'react';
import type { ConflictInfo } from '../types/dependency';

interface ConflictPanelProps {
  conflicts: ConflictInfo[];
  onSelectNode: (nodeId: string) => void;
}

export const ConflictPanel: React.FC<ConflictPanelProps> = ({ conflicts, onSelectNode }) => {
  if (conflicts.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-green-700 text-sm">
          No dependency conflicts detected
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-red-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-red-700">
          Dependency Conflicts ({conflicts.length})
        </h4>
      </div>

      <div className="space-y-3 max-h-48 overflow-y-auto">
        {conflicts.map(conflict => (
          <div
            key={conflict.id}
            className="bg-red-50 rounded p-3"
          >
            <p className="font-medium text-sm text-gray-800">
              {conflict.group}:{conflict.name}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Versions: {conflict.versions.join(', ')}
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {conflict.nodes.slice(0, 3).map(nodeId => (
                <button
                  key={nodeId}
                  onClick={() => onSelectNode(nodeId)}
                  className="text-xs px-2 py-1 bg-white border border-red-200 rounded hover:bg-red-100 text-red-700"
                >
                  {nodeId.split(':').pop()}
                </button>
              ))}
              {conflict.nodes.length > 3 && (
                <span className="text-xs text-gray-400 px-2 py-1">
                  +{conflict.nodes.length - 3} more
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
