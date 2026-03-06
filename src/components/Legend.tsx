import React from 'react';

const items = [
  { color: '#ef4444', label: 'Conflict' },
  { color: '#10b981', label: 'AndroidX' },
  { color: '#3b82f6', label: 'Kotlin/JetBrains' },
  { color: '#f59e0b', label: 'Google' },
  { color: '#6366f1', label: 'Other' },
  { color: '#8b5cf6', label: 'Project' },
];

export const Legend: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Legend</h4>
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.label} className="flex items-center">
            <span
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-gray-600">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
