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
  const connectedNodesRef = useRef<Set<string>>(new Set());

  // 计算与选中节点相连的节点集合
  const updateConnectedNodes = useCallback(() => {
    const connected = new Set<string>();
    if (selectedNode) {
      connected.add(selectedNode);
      links.forEach(link => {
        const sourceId = typeof link.source === 'string' ? link.source : (link.source as SimulationNode).id;
        const targetId = typeof link.target === 'string' ? link.target : (link.target as SimulationNode).id;
        if (sourceId === selectedNode) {
          connected.add(targetId);
        } else if (targetId === selectedNode) {
          connected.add(sourceId);
        }
      });
    }
    connectedNodesRef.current = connected;
  }, [selectedNode, links]);

  // 获取节点的分类颜色
  const getBaseNodeColor = useCallback((node: SimulationNode): string => {
    if (node.hasConflict) return '#ef4444'; // 红色 - 冲突
    if (node.group.startsWith('androidx')) return '#10b981'; // 绿色
    if (node.group.startsWith('org.jetbrains')) return '#3b82f6'; // 蓝色
    if (node.group.startsWith('com.google')) return '#f59e0b'; // 橙色
    // 为其他 group 分配更多颜色
    const colorMap: Record<string, string> = {
      'person': '#3b82f6',      // 蓝色 - 个人
      'organization': '#10b981', // 绿色 - 组织/机构
      'university': '#f97316',   // 橙色 - 高校
      'media': '#a855f7',        // 紫色 - 媒体
      'platform': '#ec4899',     // 粉色 - 平台
      'authority': '#14b8a6',    // 青色 - 权威机构
      'event': '#f59e0b',        // 琥珀色 - 事件
      'concept': '#8b5cf6',      // 紫罗兰 - 概念
      'location': '#22c55e',     // 绿色 - 地点
      'conflict': '#dc2626',     // 深红色 - 冲突
    };
    return colorMap[node.group] || '#6366f1'; // 默认靛蓝色
  }, []);

  // 获取节点填充颜色 - 选中节点红色，相连节点彩色，其他灰色
  const getNodeColor = useCallback((node: SimulationNode) => {
    if (!selectedNode) {
      return getBaseNodeColor(node);
    }
    const connected = connectedNodesRef.current;
    if (node.id === selectedNode) {
      return '#ef4444'; // 选中节点 - 红色
    }
    if (connected.has(node.id)) {
      return getBaseNodeColor(node); // 相连节点 - 分类颜色
    }
    return '#9ca3af'; // 其他节点 - 灰色
  }, [selectedNode, getBaseNodeColor]);

  // 获取节点边框颜色
  const getNodeStroke = useCallback((node: SimulationNode) => {
    if (selectedNode && node.id === selectedNode) {
      return '#b91c1c'; // 选中节点边框为深红色
    }
    return '#fff'; // 默认白色边框
  }, [selectedNode]);

  // 获取节点边框宽度
  const getNodeStrokeWidth = useCallback((node: SimulationNode) => {
    if (selectedNode && node.id === selectedNode) {
      return 3; // 选中节点边框加粗
    }
    return 2; // 默认边框宽度
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

    // 更新相连节点集合
    updateConnectedNodes();

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    const g = svg.append('g');

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

    const simulation = d3.forceSimulation<SimulationNode>(simulationNodes)
      .force('link', d3.forceLink<SimulationNode, SimulationLink>(simulationLinks)
        .id(d => d.id)
        .distance(80)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    const link = g.append('g')
      .attr('stroke-linecap', 'round')
      .selectAll('path')
      .data(simulationLinks)
      .join('path')
      .attr('fill', 'none')
      .attr('stroke', getLinkColor)
      .attr('stroke-opacity', getLinkOpacity)
      .attr('stroke-width', 1.5);

    const node = g.append('g')
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

    node.append('circle')
      .attr('r', 8)
      .attr('fill', getNodeColor)
      .attr('stroke', getNodeStroke)
      .attr('stroke-width', getNodeStrokeWidth)
      .on('click', (event, d) => {
        event.stopPropagation();
        onNodeClick(d.id);
      });

    node.append('text')
      .text(d => d.name.length > 20 ? d.name.slice(0, 20) + '...' : d.name)
      .attr('x', 12)
      .attr('y', 4)
      .attr('font-size', '10px')
      .attr('fill', selectedNode ? '#9ca3af' : '#374151')
      .style('pointer-events', 'none');

    simulation.on('tick', () => {
      link
        .attr('d', (d) => {
          const source = d.source as SimulationNode;
          const target = d.target as SimulationNode;
          const dx = target.x! - source.x!;
          const dy = target.y! - source.y!;
          const dr = Math.sqrt(dx * dx + dy * dy);
          return `M${source.x},${source.y}A${dr},${dr} 0 0,1 ${target.x},${target.y}`;
        })
        .attr('stroke', getLinkColor)
        .attr('stroke-opacity', getLinkOpacity);

      node.attr('transform', d => `translate(${d.x},${d.y})`);

      node.select('circle')
        .attr('fill', getNodeColor)
        .attr('stroke', getNodeStroke)
        .attr('stroke-width', getNodeStrokeWidth);

      node.select('text')
        .attr('fill', selectedNode ? (d => (d as SimulationNode).id === selectedNode ? '#1f2937' : '#6b7280') : '#374151')
        .attr('font-weight', selectedNode ? (d => (d as SimulationNode).id === selectedNode ? '600' : 'normal') : 'normal');
    });

    svg.on('click', () => {
      onNodeClick('');
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, links, selectedNode, onNodeClick, width, height, updateConnectedNodes, getNodeColor, getNodeStroke, getNodeStrokeWidth, getLinkColor, getLinkOpacity]);

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
