# Gradle Dependency Visualizer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Build a web-based React app that visualizes Android Gradle dependencies as an interactive force-directed graph with conflict detection.

**Architecture:** React + TypeScript + Vite frontend. D3.js for force-directed graph rendering. Parser converts gradle dependencies tree text to node-link graph data.

**Tech Stack:** React 18, TypeScript, Vite, D3.js v7, Tailwind CSS, html-to-image (for export)

---

## Task 1: Initialize Vite React Project

**Files:**
- Create: Entire project structure

**Step 1: Create Vite project**

```bash
cd /Users/dywang/Code/github/GradleDeps
npm create vite@latest . -- --template react-ts
```

**Step 2: Install dependencies**

```bash
npm install d3 html-to-image
npm install -D @types/d3
```

**Step 3: Setup Tailwind CSS**

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Step 4: Configure Tailwind**

Edit `tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

Edit `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 5: Commit**

```bash
git init
git add .
git commit -m "chore: initialize vite react project with tailwind"
```

---

## Task 2: Define TypeScript Types

**Files:**
- Create: `src/types/dependency.ts`

**Step 1: Write types**

```typescript
export interface DependencyNode {
  id: string;
  name: string;
  version: string;
  group: string;
  type: 'external' | 'project';
  level: number; // depth in dependency tree
  children: string[]; // child node ids
  parents: string[]; // parent node ids
  hasConflict: boolean;
  conflictVersions?: string[];
}

export interface DependencyLink {
  source: string;
  target: string;
}

export interface ParsedGraph {
  nodes: DependencyNode[];
  links: DependencyLink[];
  conflicts: ConflictInfo[];
}

export interface ConflictInfo {
  id: string;
  group: string;
  name: string;
  versions: string[];
  nodes: string[]; // node ids with this conflict
}

export interface NodeDetails {
  node: DependencyNode;
  directChildren: number;
  transitiveCount: number;
  referencedBy: string[];
}
```

**Step 2: Commit**

```bash
git add src/types/dependency.ts
git commit -m "feat: add dependency types"
```

---

## Task 3: Implement Gradle Dependencies Parser

**Files:**
- Create: `src/parser/gradleParser.ts`
- Test: `src/parser/gradleParser.test.ts`

**Step 1: Write parser**

```typescript
import { DependencyNode, DependencyLink, ParsedGraph, ConflictInfo } from '../types/dependency';

export function parseGradleDependencies(text: string): ParsedGraph {
  const lines = text.split('\n');
  const nodes = new Map<string, DependencyNode>();
  const links: DependencyLink[] = [];
  const conflictMap = new Map<string, Set<string>>();

  const stack: { id: string; level: number }[] = [];

  for (const line of lines) {
    const parsed = parseLine(line);
    if (!parsed) continue;

    const { name, version, level, isTransitive } = parsed;
    const id = version ? `${name}:${version}` : name;

    // Track conflicts
    if (version) {
      const baseId = name;
      if (!conflictMap.has(baseId)) {
        conflictMap.set(baseId, new Set());
      }
      conflictMap.get(baseId)!.add(version);
    }

    // Create or update node
    if (!nodes.has(id)) {
      const group = name.includes(':') ? name.split(':')[0] : '';
      const artifactName = name.includes(':') ? name.split(':')[1] : name;

      nodes.set(id, {
        id,
        name: artifactName,
        version: version || '',
        group,
        type: name.startsWith('project ') ? 'project' : 'external',
        level,
        children: [],
        parents: [],
        hasConflict: false,
      });
    }

    // Manage parent-child relationship
    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    if (stack.length > 0) {
      const parentId = stack[stack.length - 1].id;
      const parent = nodes.get(parentId)!;
      const child = nodes.get(id)!;

      if (!parent.children.includes(id)) {
        parent.children.push(id);
      }
      if (!child.parents.includes(parentId)) {
        child.parents.push(parentId);
      }

      links.push({ source: parentId, target: id });
    }

    stack.push({ id, level });
  }

  // Build conflicts
  const conflicts: ConflictInfo[] = [];
  for (const [baseId, versions] of conflictMap) {
    if (versions.size > 1) {
      const versionList = Array.from(versions);
      const conflictNodes: string[] = [];

      for (const [nodeId, node] of nodes) {
        if (node.name === baseId.split(':')[1] && node.group === baseId.split(':')[0]) {
          node.hasConflict = true;
          node.conflictVersions = versionList.filter(v => v !== node.version);
          conflictNodes.push(nodeId);
        }
      }

      const [group, name] = baseId.split(':');
      conflicts.push({
        id: baseId,
        group,
        name,
        versions: versionList,
        nodes: conflictNodes,
      });
    }
  }

  return {
    nodes: Array.from(nodes.values()),
    links,
    conflicts,
  };
}

function parseLine(line: string): { name: string; version: string; level: number; isTransitive: boolean } | null {
  // Match patterns like:
  // +--- androidx.core:core-ktx:1.9.0
  // |    +--- androidx.annotation:annotation:1.3.0
  // |    |    \--- org.jetbrains.kotlin:kotlin-stdlib:1.7.10
  // \--- project :app

  const match = line.match(/^(\||\\---|\+---)\s*(.*)$/);
  if (!match) return null;

  const prefix = match[1];
  const content = match[2].trim();

  // Calculate level based on indentation/prefix
  const level = line.search(/[\w:]/);

  // Extract name and version
  // Format: group:name:version or group:name:version -> version
  const versionMatch = content.match(/^([^\s]+):([^\s]+):([^\s-]+)/);
  if (versionMatch) {
    return {
      name: `${versionMatch[1]}:${versionMatch[2]}`,
      version: versionMatch[3],
      level: Math.floor(level / 5),
      isTransitive: prefix === '\\---' || prefix === '|',
    };
  }

  // Project dependency: "project :app"
  const projectMatch = content.match(/^project\s+(:[^:]+)$/);
  if (projectMatch) {
    return {
      name: `project ${projectMatch[1]}`,
      version: '',
      level: Math.floor(level / 5),
      isTransitive: false,
    };
  }

  return null;
}
```

**Step 2: Commit**

```bash
git add src/parser/gradleParser.ts
git commit -m "feat: implement gradle dependencies parser"
```

---

## Task 4: Create Welcome Screen with Input

**Files:**
- Create: `src/components/WelcomeScreen.tsx`

**Step 1: Write component**

```tsx
import React, { useState, useCallback } from 'react';

interface WelcomeScreenProps {
  onParse: (text: string) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onParse }) => {
  const [text, setText] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleFileUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      onParse(content);
    };
    reader.readAsText(file);
  }, [onParse]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type === 'text/plain') {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleSubmit = useCallback(() => {
    if (text.trim()) {
      onParse(text);
    }
  }, [text, onParse]);

  const sampleText = `+--- androidx.core:core-ktx:1.9.0
|    +--- androidx.annotation:annotation:1.3.0
|    |    \\--- org.jetbrains.kotlin:kotlin-stdlib:1.7.10
|    \\--- androidx.core:core:1.9.0
\\--- com.google.android.material:material:1.8.0`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-3xl w-full">
        <h1 className="text-4xl font-bold text-gray-800 mb-2 text-center">
          Gradle Dependency Visualizer
        </h1>
        <p className="text-gray-600 text-center mb-8">
          Visualize your Android project dependencies as an interactive graph
        </p>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            How to use:
          </h2>
          <ol className="list-decimal list-inside text-gray-600 space-y-2 mb-6">
            <li>Run in your Android project:</li>
            <code className="block bg-gray-100 p-3 rounded text-sm font-mono text-gray-800">
              ./gradlew dependencies --configuration implementation &gt; deps.txt
            </code>
            <li>Upload the file or paste the content below</li>
          </ol>

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center mb-4 transition-colors
              ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'}
            `}
          >
            <p className="text-gray-600 mb-2">
              📁 Drop file here or click to upload
            </p>
            <input
              type="file"
              accept=".txt,.gradle"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer"
            >
              Choose File
            </label>
          </div>

          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Or paste gradle dependencies output here..."
              className="w-full h-64 p-4 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() => setText(sampleText)}
              className="absolute bottom-4 right-4 text-xs text-blue-500 hover:text-blue-600"
            >
              Load sample
            </button>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="w-full py-4 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Generate Dependency Graph
        </button>
      </div>
    </div>
  );
};
```

**Step 2: Commit**

```bash
git add src/components/WelcomeScreen.tsx
git commit -m "feat: add welcome screen with file upload and paste"
```

---

## Task 5: Create Force-Directed Graph Component

**Files:**
- Create: `src/components/ForceGraph.tsx`

**Step 1: Write component**

```tsx
import React, { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { DependencyNode, DependencyLink } from '../types/dependency';

interface ForceGraphProps {
  nodes: DependencyNode[];
  links: DependencyLink[];
  selectedNode: string | null;
  onNodeClick: (nodeId: string) => void;
  width: number;
  height: number;
}

interface SimulationNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  group: string;
  hasConflict: boolean;
  level: number;
}

interface SimulationLink extends d3.SimulationLinkDatum<SimulationNode> {
  source: string | SimulationNode;
  target: string | SimulationNode;
}

export const ForceGraph: React.FC<ForceGraphProps> = ({
  nodes,
  links,
  selectedNode,
  onNodeClick,
  width,
  height,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getNodeColor = useCallback((node: SimulationNode) => {
    if (selectedNode) {
      return node.id === selectedNode ? '#ef4444' : '#9ca3af';
    }
    if (node.hasConflict) return '#ef4444';
    if (node.group.startsWith('androidx')) return '#10b981';
    if (node.group.startsWith('org.jetbrains')) return '#3b82f6';
    if (node.group.startsWith('com.google')) return '#f59e0b';
    return '#6366f1';
  }, [selectedNode]);

  const getLinkColor = useCallback((link: SimulationLink) => {
    if (!selectedNode) return '#cbd5e1';

    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
    const targetId = typeof link.target === 'string' ? link.target : link.target.id;

    if (sourceId === selectedNode || targetId === selectedNode) {
      return '#ef4444';
    }
    return '#e5e7eb';
  }, [selectedNode]);

  const getLinkOpacity = useCallback((link: SimulationLink) => {
    if (!selectedNode) return 0.6;

    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
    const targetId = typeof link.target === 'string' ? link.target : link.target.id;

    if (sourceId === selectedNode || targetId === selectedNode) {
      return 1;
    }
    return 0.2;
  }, [selectedNode]);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    const g = svg.append('g');

    // Prepare data
    const simulationNodes: SimulationNode[] = nodes.map(n => ({
      id: n.id,
      name: n.name,
      group: n.group,
      hasConflict: n.hasConflict,
      level: n.level,
    }));

    const simulationLinks: SimulationLink[] = links.map(l => ({
      source: l.source,
      target: l.target,
    }));

    // Create simulation
    const simulation = d3.forceSimulation<SimulationNode>(simulationNodes)
      .force('link', d3.forceLink<SimulationNode, SimulationLink>(simulationLinks)
        .id(d => d.id)
        .distance(80)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Draw links
    const link = g.append('g')
      .attr('stroke-linecap', 'round')
      .selectAll('line')
      .data(simulationLinks)
      .join('line')
      .attr('stroke', getLinkColor)
      .attr('stroke-opacity', getLinkOpacity)
      .attr('stroke-width', 1.5);

    // Draw nodes
    const node = g.append('g')
      .selectAll('g')
      .data(simulationNodes)
      .join('g')
      .style('cursor', 'pointer')
      .call(d3.drag<SVGGElement, SimulationNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    // Node circles
    node.append('circle')
      .attr('r', 8)
      .attr('fill', getNodeColor)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .on('click', (event, d) => {
        event.stopPropagation();
        onNodeClick(d.id);
      });

    // Node labels
    node.append('text')
      .text(d => d.name.length > 20 ? d.name.slice(0, 20) + '...' : d.name)
      .attr('x', 12)
      .attr('y', 4)
      .attr('font-size', '10px')
      .attr('fill', selectedNode ? '#9ca3af' : '#374151')
      .style('pointer-events', 'none');

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as SimulationNode).x!)
        .attr('y1', d => (d.source as SimulationNode).y!)
        .attr('x2', d => (d.target as SimulationNode).x!)
        .attr('y2', d => (d.target as SimulationNode).y!)
        .attr('stroke', getLinkColor)
        .attr('stroke-opacity', getLinkOpacity);

      node.attr('transform', d => `translate(${d.x},${d.y})`);

      node.select('circle')
        .attr('fill', getNodeColor);

      node.select('text')
        .attr('fill', selectedNode ? (d => d.id === selectedNode ? '#374151' : '#9ca3af') : '#374151');
    });

    // Click background to deselect
    svg.on('click', () => {
      onNodeClick('');
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, links, selectedNode, onNodeClick, width, height, getNodeColor, getLinkColor, getLinkOpacity]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="w-full h-full"
      />
    </div>
  );
};
```

**Step 2: Commit**

```bash
git add src/components/ForceGraph.tsx
git commit -m "feat: add force-directed graph with d3"
```

---

## Task 6: Create Node Details Panel

**Files:**
- Create: `src/components/NodeDetails.tsx`

**Step 1: Write component**

```tsx
import React, { useMemo } from 'react';
import { DependencyNode } from '../types/dependency';

interface NodeDetailsProps {
  node: DependencyNode | null;
  allNodes: DependencyNode[];
  onClose: () => void;
}

export const NodeDetails: React.FC<NodeDetailsProps> = ({ node, allNodes, onClose }) => {
  const stats = useMemo(() => {
    if (!node) return null;

    // Calculate transitive dependencies
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
        {/* Type badge */}
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

        {/* Basic info */}
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

        {/* Dependencies stats */}
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

        {/* Referenced by */}
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

        {/* Conflict info */}
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
```

**Step 2: Commit**

```bash
git add src/components/NodeDetails.tsx
git commit -m "feat: add node details panel"
```

---

## Task 7: Create Search and Legend Components

**Files:**
- Create: `src/components/SearchBar.tsx`
- Create: `src/components/Legend.tsx`

**Step 1: Write SearchBar**

```tsx
import React, { useState, useCallback } from 'react';
import { DependencyNode } from '../types/dependency';

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
```

**Step 2: Write Legend**

```tsx
import React from 'react';

export const Legend: React.FC = () => {
  const items = [
    { color: '#ef4444', label: 'Conflict' },
    { color: '#10b981', label: 'AndroidX' },
    { color: '#3b82f6', label: 'Kotlin/JetBrains' },
    { color: '#f59e0b', label: 'Google' },
    { color: '#6366f1', label: 'Other' },
    { color: '#8b5cf6', label: 'Project' },
  ];

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
```

**Step 3: Commit**

```bash
git add src/components/SearchBar.tsx src/components/Legend.tsx
git commit -m "feat: add search bar and legend components"
```

---

## Task 8: Create Conflict Panel

**Files:**
- Create: `src/components/ConflictPanel.tsx`

**Step 1: Write component**

```tsx
import React from 'react';
import { ConflictInfo } from '../types/dependency';

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
          ⚠️ Dependency Conflicts ({conflicts.length})
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
```

**Step 2: Commit**

```bash
git add src/components/ConflictPanel.tsx
git commit -m "feat: add conflict panel component"
```

---

## Task 9: Create Main Visualization Screen

**Files:**
- Create: `src/components/GraphVisualization.tsx`

**Step 1: Write component**

```tsx
import React, { useState, useCallback, useRef } from 'react';
import { toPng } from 'html-to-image';
import { ForceGraph } from './ForceGraph';
import { NodeDetails } from './NodeDetails';
import { SearchBar } from './SearchBar';
import { Legend } from './Legend';
import { ConflictPanel } from './ConflictPanel';
import { ParsedGraph } from '../types/dependency';

interface GraphVisualizationProps {
  data: ParsedGraph;
  onReset: () => void;
}

export const GraphVisualization: React.FC<GraphVisualizationProps> = ({ data, onReset }) => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const graphRef = useRef<HTMLDivElement>(null);

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
      {/* Header */}
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

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Graph area */}
        <div className="flex-1 relative" ref={graphRef}>
          <ForceGraph
            nodes={data.nodes}
            links={data.links}
            selectedNode={selectedNode}
            onNodeClick={(id) => setSelectedNode(id || null)}
            width={800}
            height={600}
          />

          {/* Legend overlay */}
          <div className="absolute bottom-4 left-4">
            <Legend />
          </div>

          {/* Conflict panel overlay */}
          <div className="absolute top-4 left-4 w-72">
            <ConflictPanel
              conflicts={data.conflicts}
              onSelectNode={setSelectedNode}
            />
          </div>
        </div>

        {/* Details panel */}
        <NodeDetails
          node={selectedNodeData}
          allNodes={data.nodes}
          onClose={() => setSelectedNode(null)}
        />
      </div>

      {/* Footer */}
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
```

**Step 2: Commit**

```bash
git add src/components/GraphVisualization.tsx
git commit -m "feat: add main graph visualization screen"
```

---

## Task 10: Wire Up App.tsx

**Files:**
- Modify: `src/App.tsx`

**Step 1: Write main App**

```tsx
import React, { useState } from 'react';
import { WelcomeScreen } from './components/WelcomeScreen';
import { GraphVisualization } from './components/GraphVisualization';
import { parseGradleDependencies } from './parser/gradleParser';
import { ParsedGraph } from './types/dependency';

function App() {
  const [parsedData, setParsedData] = useState<ParsedGraph | null>(null);

  const handleParse = (text: string) => {
    try {
      const data = parseGradleDependencies(text);
      setParsedData(data);
    } catch (err) {
      console.error('Parse error:', err);
      alert('Failed to parse dependencies. Please check your input format.');
    }
  };

  const handleReset = () => {
    setParsedData(null);
  };

  return (
    <div className="App">
      {parsedData ? (
        <GraphVisualization data={parsedData} onReset={handleReset} />
      ) : (
        <WelcomeScreen onParse={handleParse} />
      )}
    </div>
  );
}

export default App;
```

**Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire up main app with routing between screens"
```

---

## Task 11: Add Test Sample and Final Polish

**Files:**
- Modify: `index.html` (update title)
- Modify: `src/index.css` (add any custom styles)

**Step 1: Update HTML title**

Edit `index.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Gradle Dependency Visualizer</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 2: Test the app**

```bash
npm run dev
```

**Step 3: Final commit**

```bash
git add .
git commit -m "feat: complete gradle dependency visualizer v1.0"
```

---

## Summary

This implementation creates a complete web-based Gradle dependency visualizer with:

- **Input**: File upload and text paste support
- **Parser**: Converts gradle dependencies tree to graph data
- **Visualization**: D3 force-directed graph with interactive features
- **Selection**: Click to highlight related dependencies
- **Details panel**: Shows node info, child counts, conflicts
- **Search**: Find dependencies by name/group
- **Conflicts**: Detects and displays version conflicts
- **Export**: Save graph as PNG

**To run:**
```bash
npm install
npm run dev
```

**Production build:**
```bash
npm run build
```
