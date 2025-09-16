import type { Project } from './domain';
import type { AsyncResult } from '../../utils/Result.js';

export interface ProviderPort {
  id: string; // 'claude' | 'codex' | ...
  fetchProjects(): AsyncResult<Project[]>;
  watchChanges(onChange: () => void): () => void; // returns unsubscribe
  collectDiagnostics(): AsyncResult<{ unknownCount: number; details: string }>;
  repairMetadata(dryRun: boolean): AsyncResult<{ planned: number; written: number; unknownCount: number }>;
}

export interface EventPort {
  dataChanged(): void;
}

export interface PersistencePort {
  get<T = unknown>(key: string, fallback?: T): T | undefined;
  set<T = unknown>(key: string, value: T): void;
}

