import type { DependencyNode, DependencyLink, ParsedGraph, ConflictInfo } from '../types/dependency';

export function parseGradleDependencies(text: string): ParsedGraph {
  const lines = text.split('\n');
  const nodes = new Map<string, DependencyNode>();
  const links: DependencyLink[] = [];
  const linkSet = new Set<string>();
  const conflictMap = new Map<string, Set<string>>();

  const stack: { id: string; level: number }[] = [];

  // Target: runtime classpath + AGP internal pre-compile classpath
  const TARGET_CONFIGS = new Set(['debugRuntimeClasspath', 'releaseRuntimeClasspath']);
  let inTargetConfig = false;
  let isAgpInternal = false;

  for (const line of lines) {
    // Detect standard configuration headers like "debugRuntimeClasspath - Runtime classpath of /debug."
    const configMatch = line.match(/^(\S+)\s+-\s+/);
    if (configMatch) {
      inTargetConfig = TARGET_CONFIGS.has(configMatch[1]);
      isAgpInternal = false;
      stack.length = 0;
      continue;
    }

    // Detect AGP internal configuration headers like "_agp_internal_javaPreCompileDebug_kaptClasspath"
    if (/^_agp_internal_javaPreCompile/.test(line)) {
      inTargetConfig = true;
      isAgpInternal = true;
      stack.length = 0;
      continue;
    }

    if (!inTargetConfig) continue;
    const parsed = parseLine(line);
    if (!parsed) continue;

    const { name, version, declaredVersion, level, isConstraint } = parsed;
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
        declaredVersion: declaredVersion || '',
        group,
        type: name.startsWith('project ') ? 'project' : 'external',
        level,
        children: [],
        parents: [],
        hasConflict: false,
        isAgpInternal: isAgpInternal,
      });
    }

    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    if (!isConstraint && stack.length > 0) {
      const parentId = stack[stack.length - 1].id;
      const parent = nodes.get(parentId)!;
      const child = nodes.get(id)!;

      if (!parent.children.includes(id)) {
        parent.children.push(id);
      }
      if (!child.parents.includes(parentId)) {
        child.parents.push(parentId);
      }

      const linkKey = `${parentId}->${id}`;
      if (!linkSet.has(linkKey)) {
        linkSet.add(linkKey);
        links.push({ source: parentId, target: id });
      }
    }

    if (!isConstraint) {
      stack.push({ id, level });
    }
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

function parseLine(line: string): { name: string; version: string; declaredVersion: string; level: number; isConstraint: boolean } | null {
  // +--- androidx.core:core-ktx:1.9.0
  // |    +--- androidx.annotation:annotation:1.3.0
  // |    |    \--- org.jetbrains.kotlin:kotlin-stdlib:1.7.10
  // \--- project :app

  const match = line.match(/[+\\]---\s+(.*)$/);
  if (!match) return null;

  const rawContent = match[1].trim();
  const isConstraint = /\(c\)$/.test(rawContent);
  const content = rawContent.replace(/\s+\((?:n|\*|c)\)$/, '').trim();
  const level = line.search(/[+\\]---/);

  // group:name:version 或 group:name:version -> resolvedVersion
  // 也支持 group:name -> resolvedVersion (无显式版本号)
  // 版本部分可能是 {strictly X.Y.Z} 等约束格式
  const versionMatch = content.match(/^([^\s:]+):([^\s:]+)(?::(\{[^}]+\}|[^\s]+?))?(?:\s+->\s+(\S+))?$/);
  if (versionMatch) {
    let declaredVersion = versionMatch[3] || '';
    let resolvedVersion = versionMatch[4] || versionMatch[3] || '';

    // Clean up constraint syntax like {strictly 1.8.0}
    const declaredConstraintMatch = declaredVersion.match(/\{\w+\s+([^}]+)\}/);
    if (declaredConstraintMatch) {
      declaredVersion = declaredConstraintMatch[1];
    }
    const constraintMatch = resolvedVersion.match(/\{\w+\s+([^}]+)\}/);
    if (constraintMatch) {
      resolvedVersion = constraintMatch[1];
    }

    return {
      name: `${versionMatch[1]}:${versionMatch[2]}`,
      version: resolvedVersion,
      declaredVersion,
      level: Math.floor(level / 5),
      isConstraint,
    };
  }

  // project :app 或 project ModuleName (无冒号)
  const projectMatch = content.match(/^project\s+(:?\S+)/);
  if (projectMatch) {
    const projectName = projectMatch[1].startsWith(':') ? projectMatch[1] : `:${projectMatch[1]}`;
    return {
      name: `project ${projectName}`,
      version: '',
      declaredVersion: '',
      level: Math.floor(level / 5),
      isConstraint,
    };
  }

  return null;
}
