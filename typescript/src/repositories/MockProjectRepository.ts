import { Project, IProjectRepository } from '../models/Project';
import { Result, AsyncResult, Ok, Err } from '../utils/Result';

/**
 * In-memory implementation of IProjectRepository for testing
 * Allows easy setup of test data and verification of behavior
 */
export class MockProjectRepository implements IProjectRepository {
  private projects: Map<string, Project> = new Map();
  
  /**
   * Constructor with optional initial projects
   */
  constructor(initialProjects: Project[] = []) {
    initialProjects.forEach(project => {
      this.projects.set(project.id, project);
    });
  }

  /**
   * Load all projects from in-memory storage
   */
  async getAllProjects(): AsyncResult<Project[]> {
    // Simulate async operation
    await this.delay(10);
    return Ok(Array.from(this.projects.values()));
  }

  /**
   * Get a specific project by ID
   */
  async getProject(id: string): AsyncResult<Project | null> {
    await this.delay(5);
    const project = this.projects.get(id) || null;
    return Ok(project);
  }

  /**
   * Check if a project exists
   */
  async projectExists(id: string): AsyncResult<boolean> {
    await this.delay(5);
    return Ok(this.projects.has(id));
  }

  // Test helper methods

  /**
   * Add a project to the mock repository
   */
  addProject(project: Project): void {
    this.projects.set(project.id, project);
  }

  /**
   * Remove a project from the mock repository
   */
  removeProject(id: string): void {
    this.projects.delete(id);
  }

  /**
   * Clear all projects
   */
  clear(): void {
    this.projects.clear();
  }

  /**
   * Get count of projects (test helper)
   */
  getCount(): number {
    return this.projects.size;
  }

  /**
   * Create sample test projects
   */
  static createSampleProjects(): Project[] {
    return [
      {
        id: '-Users-doowell2-Source-repos-DT-Entropic',
        path: '/Users/doowell2/Source/repos/DT/Entropic',
        flattenedDir: '-Users-doowell2-Source-repos-DT-Entropic',
        pathExists: true,
        lastModified: new Date('2025-01-01T10:00:00Z')
      },
      {
        id: '-Users-doowell2-Source-repos-DT-MacroN',
        path: '/Users/doowell2/Source/repos/DT/MacroN',
        flattenedDir: '-Users-doowell2-Source-repos-DT-MacroN',
        pathExists: true,
        lastModified: new Date('2025-01-02T10:00:00Z')
      },
      {
        id: '-Users-doowell2--claude',
        path: '/Users/doowell2/.claude',
        flattenedDir: '-Users-doowell2--claude',
        pathExists: true,
        lastModified: new Date('2025-01-03T10:00:00Z')
      },
      {
        id: 'test-project-alpha',
        path: 'test-project-alpha',
        flattenedDir: 'test-project-alpha',
        pathExists: false, // Simulates a renamed/moved project
        lastModified: new Date('2025-01-04T10:00:00Z')
      }
    ];
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}