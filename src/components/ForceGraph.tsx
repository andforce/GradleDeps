import React, { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import type { DependencyNode, DependencyLink } from '../types/dependency';

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
  type: 'external' | 'project';
  hasConflict: boolean;
  level: number;
}

const starPath = (outer: number, inner: number): string => {
  const points = 5;
  const step = Math.PI / points;
  let d = '';
  for (let i = 0; i < 2 * points; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const angle = i * step - Math.PI / 2;
    d += (i === 0 ? 'M' : 'L') + (r * Math.cos(angle)) + ',' + (r * Math.sin(angle));
  }
  return d + 'Z';
};

interface SimulationLink extends d3.SimulationLinkDatum<SimulationNode> {
  source: string | SimulationNode;
  target: string | SimulationNode;
}

const getBaseNodeColor = (node: SimulationNode): string => {
  if (node.hasConflict) return '#ef4444';
  if (node.type === 'project') return '#ec4899';
  if (node.group.startsWith('androidx')) return '#10b981';
  if (node.group.startsWith('org.jetbrains')) return '#3b82f6';
  if (node.group.startsWith('com.google')) return '#f59e0b';
  return '#6366f1';
};

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
  const selectedNodeRef = useRef<string | null>(null);
  const onNodeClickRef = useRef(onNodeClick);
  const linkSelectionRef = useRef<d3.Selection<SVGPathElement, SimulationLink, SVGGElement, unknown> | null>(null);
  const nodeSelectionRef = useRef<d3.Selection<SVGGElement, SimulationNode, SVGGElement, unknown> | null>(null);
  const simulationLinksRef = useRef<SimulationLink[]>([]);

  selectedNodeRef.current = selectedNode;
  onNodeClickRef.current = onNodeClick;

  const computeConnectedNodes = useCallback((selected: string | null, simLinks: SimulationLink[]): Set<string> => {
    const connected = new Set<string>();
    if (selected) {
      connected.add(selected);
      simLinks.forEach(link => {
        const sourceId = typeof link.source === 'string' ? link.source : (link.source as SimulationNode).id;
        const targetId = typeof link.target === 'string' ? link.target : (link.target as SimulationNode).id;
        if (sourceId === selected) connected.add(targetId);
        else if (targetId === selected) connected.add(sourceId);
      });
    }
    return connected;
  }, []);

  const applyStyles = useCallback((selected: string | null) => {
    const linkSel = linkSelectionRef.current;
    const nodeSel = nodeSelectionRef.current;
    if (!linkSel || !nodeSel) return;

    const connected = computeConnectedNodes(selected, simulationLinksRef.current);

    linkSel
      .attr('stroke', (link: SimulationLink) => {
        if (!selected) return '#cbd5e1';
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
        const targetId = typeof link.target === 'string' ? link.target : link.target.id;
        return (sourceId === selected || targetId === selected) ? '#ef4444' : '#e5e7eb';
      })
      .attr('stroke-opacity', (link: SimulationLink) => {
        if (!selected) return 0.6;
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
        const targetId = typeof link.target === 'string' ? link.target : link.target.id;
        return (sourceId === selected || targetId === selected) ? 1 : 0.2;
      });

    nodeSel.select('.node-shape')
      .attr('fill', (d: SimulationNode) => {
        if (!selected) return getBaseNodeColor(d);
        if (d.id === selected) return '#ef4444';
        if (connected.has(d.id)) return getBaseNodeColor(d);
        return '#9ca3af';
      })
      .attr('stroke', (d: SimulationNode) => {
        return (selected && d.id === selected) ? '#b91c1c' : '#fff';
      })
      .attr('stroke-width', (d: SimulationNode) => {
        return (selected && d.id === selected) ? 3 : 2;
      });

    nodeSel.select('text')
      .attr('fill', (d: SimulationNode) => {
        if (!selected) return '#374151';
        return d.id === selected ? '#1f2937' : '#6b7280';
      })
      .attr('font-weight', (d: SimulationNode) => {
        return (selected && d.id === selected) ? '600' : 'normal';
      });
  }, [computeConnectedNodes]);

  // selectedNode 变化时只更新样式，不重建模拟
  useEffect(() => {
    applyStyles(selectedNode);
  }, [selectedNode, applyStyles]);

  // 力模拟初始化：仅在 nodes/links/尺寸 变化时重建
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);

    const simulationNodes: SimulationNode[] = nodes.map(n => ({
      id: n.id,
      name: n.name,
      group: n.group,
      type: n.type,
      hasConflict: n.hasConflict,
      level: n.level,
    }));

    const simulationLinks: SimulationLink[] = links.map(l => ({
      source: l.source,
      target: l.target,
    }));
    simulationLinksRef.current = simulationLinks;

    const simulation = d3.forceSimulation<SimulationNode>(simulationNodes)
      .force('link', d3.forceLink<SimulationNode, SimulationLink>(simulationLinks)
        .id(d => d.id)
        .distance(80)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    const linkSel = g.append('g')
      .attr('stroke-linecap', 'round')
      .selectAll<SVGPathElement, SimulationLink>('path')
      .data(simulationLinks)
      .join('path')
      .attr('fill', 'none')
      .attr('stroke', '#cbd5e1')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1.5);
    linkSelectionRef.current = linkSel as unknown as d3.Selection<SVGPathElement, SimulationLink, SVGGElement, unknown>;

    const nodeSel = g.append('g')
      .selectAll<SVGGElement, SimulationNode>('g')
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
    nodeSelectionRef.current = nodeSel as unknown as d3.Selection<SVGGElement, SimulationNode, SVGGElement, unknown>;

      nodeSel.each(function(d) {
      const el = d3.select(this);
      const setupShape = (shape: d3.Selection<SVGGElement | SVGRectElement | SVGCircleElement, unknown, null, undefined>) => {
        shape
          .attr('fill', getBaseNodeColor(d))
          .attr('stroke', '#fff')
          .attr('stroke-width', 2)
          .on('click', (event: MouseEvent) => {
            event.stopPropagation();
            onNodeClickRef.current(d.id);
          });
      };

      if (d.type === 'project') {
        setupShape(el.append('path').attr('d', starPath(15, 6.75)).attr('class', 'node-shape'));
      } else {
        setupShape(el.append('circle').attr('r', 8).attr('class', 'node-shape'));
      }
    });

    nodeSel.append('text')
      .text(d => d.name.length > 20 ? d.name.slice(0, 20) + '...' : d.name)
      .attr('x', 12)
      .attr('y', 4)
      .attr('font-size', '10px')
      .attr('fill', '#374151')
      .style('pointer-events', 'none');

    simulation.on('tick', () => {
      linkSel
        .attr('d', (d) => {
          const source = d.source as SimulationNode;
          const target = d.target as SimulationNode;
          const dx = target.x! - source.x!;
          const dy = target.y! - source.y!;
          const dr = Math.sqrt(dx * dx + dy * dy);
          return `M${source.x},${source.y}A${dr},${dr} 0 0,1 ${target.x},${target.y}`;
        });

      nodeSel.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    svg.on('click', () => {
      onNodeClickRef.current('');
    });

    // 初始化时如果已有选中节点，应用样式
    applyStyles(selectedNodeRef.current);

    return () => {
      simulation.stop();
      linkSelectionRef.current = null;
      nodeSelectionRef.current = null;
    };
  }, [nodes, links, width, height, applyStyles]);

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
