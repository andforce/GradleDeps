import React, { useState, useCallback, useRef, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { ForceGraph } from './ForceGraph';
import { NodeDetails } from './NodeDetails';
import { SearchBar } from './SearchBar';
import { Legend } from './Legend';
import { ConflictPanel } from './ConflictPanel';
import type { ParsedGraph } from '../types/dependency';

interface GraphVisualizationProps {
  data: ParsedGraph;
  onReset: () => void;
}

export const GraphVisualization: React.FC<GraphVisualizationProps> = ({ data, onReset }) => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const graphRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const updateDimensions = () => {
      if (graphRef.current) {
        const rect = graphRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const handleExport = useCallback(async () => {
    if (!graphRef.current) return;

    try {
      const dataUrl = await toPng(graphRef.current, { quality: 0.95 });
      const link = document.createElement('a');
      link.download = 'gradle-dependencies.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export:', err);
      alert('Failed to export image');
    }
  }, []);

  const selectedNodeData = selectedNode
    ? data.nodes.find(n => n.id === selectedNode) || null
    : null;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onReset}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            ← Back
          </button>
          <h1 className="font-semibold text-gray-800">Dependency Graph</h1>
        </div>

        <div className="flex items-center space-x-4">
          <SearchBar nodes={data.nodes} onSelect={setSelectedNode} />
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
          >
            Export PNG
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative" ref={graphRef}>
          <ForceGraph
            nodes={data.nodes}
            links={data.links}
            selectedNode={selectedNode}
            onNodeClick={(id) => setSelectedNode(id || null)}
            width={dimensions.width}
            height={dimensions.height}
          />

          <div className="absolute bottom-4 left-4">
            <Legend />
          </div>

          <div className="absolute top-4 left-4 w-72">
            <ConflictPanel
              conflicts={data.conflicts}
              onSelectNode={setSelectedNode}
            />
          </div>
        </div>

        <NodeDetails
          node={selectedNodeData}
          allNodes={data.nodes}
          onClose={() => setSelectedNode(null)}
        />
      </div>

      <footer className="bg-white border-t border-gray-200 px-4 py-2 text-sm text-gray-500">
        <span>Nodes: {data.nodes.length}</span>
        <span className="mx-4">|</span>
        <span>Edges: {data.links.length}</span>
        <span className="mx-4">|</span>
        <span>Conflicts: {data.conflicts.length}</span>
        {selectedNode && (
          <>
            <span className="mx-4">|</span>
            <span>Selected: {selectedNode}</span>
          </>
        )}
      </footer>
    </div>
  );
};
