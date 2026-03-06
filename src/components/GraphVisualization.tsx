import React, { useState, useCallback, useRef, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { ArrowLeft, Download } from 'lucide-react';
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
    <div className="h-screen flex flex-col bg-transparent">
      <header className="bg-white/60 backdrop-blur-md border-b border-white/40 px-6 py-3 flex items-center justify-between z-10 shadow-sm">
        <div className="flex items-center space-x-4">
          <button
            onClick={onReset}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors bg-white/50 px-3 py-1.5 rounded-lg border border-slate-200/50 hover:bg-white/80"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="h-6 w-px bg-slate-300/50"></div>
          <h1 className="font-bold text-slate-800 tracking-tight">Dependency Graph</h1>
        </div>

        <div className="flex items-center space-x-4">
          <SearchBar nodes={data.nodes} onSelect={setSelectedNode} />
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium rounded-lg hover:shadow-[0_0_15px_rgba(59,130,246,0.4)] transition-all hover:scale-105 active:scale-95"
          >
            <Download className="w-4 h-4" />
            Export PNG
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 relative" ref={graphRef}>
          <ForceGraph
            nodes={data.nodes}
            links={data.links}
            selectedNode={selectedNode}
            onNodeClick={(id) => setSelectedNode(id || null)}
            width={dimensions.width}
            height={dimensions.height}
          />

          <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
            <div className="pointer-events-auto">
              <Legend />
            </div>
          </div>

          <div className="absolute top-4 left-4 w-72 z-10 pointer-events-none">
            <div className="pointer-events-auto">
              <ConflictPanel
                conflicts={data.conflicts}
                onSelectNode={setSelectedNode}
              />
            </div>
          </div>
        </div>

        <NodeDetails
          node={selectedNodeData}
          allNodes={data.nodes}
          onClose={() => setSelectedNode(null)}
        />
      </div>

      <footer className="bg-white/60 backdrop-blur-md border-t border-white/40 px-6 py-2.5 text-sm font-medium text-slate-600 z-10 flex items-center shadow-[0_-1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-400"></div>
            Nodes: {data.nodes.length}
          </span>
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-slate-400"></div>
            Edges: {data.links.length}
          </span>
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-400"></div>
            Conflicts: {data.conflicts.length}
          </span>
          {selectedNode && (
            <>
              <div className="h-4 w-px bg-slate-300/50"></div>
              <span className="text-blue-600 font-semibold bg-blue-50/50 px-2 py-0.5 rounded-md border border-blue-100/50">
                Selected: {selectedNode}
              </span>
            </>
          )}
        </div>
      </footer>
    </div>
  );
};
