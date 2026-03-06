import React from 'react';

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
  { color: '#8b5cf6', label: 'Project', shape: 'star' },
];

const StarIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg width="14" height="14" viewBox="-10 -10 20 20" className="mr-2 flex-shrink-0">
    <polygon
      points="0,-8 2.3,-2.6 8,-2.6 3.5,1.2 5.2,7 0,3.6 -5.2,7 -3.5,1.2 -8,-2.6 -2.3,-2.6"
      fill={color}
    />
  </svg>
);

export const Legend: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Legend</h4>
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.label} className="flex items-center">
            {item.shape === 'star' ? (
              <StarIcon color={item.color} />
            ) : (
              <span
                className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
            )}
            <span className="text-xs text-gray-600">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
