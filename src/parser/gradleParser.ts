import type { DependencyNode, DependencyLink, ParsedGraph, ConflictInfo } from '../types/dependency';

export function parseGradleDependencies(text: string): ParsedGraph {
  const lines = text.split('\n');
  const nodes = new Map<string, DependencyNode>();
  const links: DependencyLink[] = [];
  const conflictMap = new Map<string, Set<string>>();

  const stack: { id: string; level: number }[] = [];

  for (const line of lines) {
    const parsed = parseLine(line);
    if (!parsed) continue;

    const { name, version, level } = parsed;
    const id = version ? `${name}:${version}` : name;

    if (version) {
      const baseId = name;
      if (!conflictMap.has(baseId)) {
        conflictMap.set(baseId, new Set());
      }
      conflictMap.get(baseId)!.add(version);
    }

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
  // +--- androidx.core:core-ktx:1.9.0
  // |    +--- androidx.annotation:annotation:1.3.0
  // |    |    \--- org.jetbrains.kotlin:kotlin-stdlib:1.7.10
  // \--- project :app

  const match = line.match(/[+\\]---\s+(.*)$/);
  if (!match) return null;

  const content = match[1].trim();
  const level = line.search(/[+\\]---/);

  // group:name:version 或 group:name:version -> resolvedVersion
  // 版本部分可能是 {strictly X.Y.Z} 等约束格式
  const versionMatch = content.match(/^([^\s]+):([^\s]+):(\{[^}]+\}|[^\s->]+)(?:\s*->\s*(\S+))?/);
  if (versionMatch) {
    let resolvedVersion = versionMatch[4] || versionMatch[3];
    const constraintMatch = resolvedVersion.match(/\{\w+\s+([^}]+)\}/);
    if (constraintMatch) {
      resolvedVersion = constraintMatch[1];
    }
    return {
      name: `${versionMatch[1]}:${versionMatch[2]}`,
      version: resolvedVersion,
      level: Math.floor(level / 5),
      isTransitive: line.includes('\\---'),
    };
  }

  // project :app
  const projectMatch = content.match(/^project\s+(:\S+)/);
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
