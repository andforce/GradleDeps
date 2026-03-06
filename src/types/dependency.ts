export interface DependencyNode {
  id: string;
  name: string;
  version: string;
  group: string;
  type: 'external' | 'project';
  level: number;
  children: string[];
  parents: string[];
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
  nodes: string[];
}

export interface NodeDetails {
  node: DependencyNode;
  directChildren: number;
  transitiveCount: number;
  referencedBy: string[];
}
