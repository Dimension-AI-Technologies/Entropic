import { describe, it, expect } from '@jest/globals';
import { FileSystemProjectRepository } from '../repositories/FileSystemProjectRepository.js';
import path from 'node:path';
import os from 'node:os';

describe('FileSystemProjectRepository', () => {
  const projectsDir = path.join(os.homedir(), '.claude', 'projects');
  let repository: FileSystemProjectRepository;

  beforeEach(() => {
    repository = new FileSystemProjectRepository(projectsDir);
  });

  describe('getAllProjects', () => {
    it('should load projects from the actual filesystem', async () => {
      const result = await repository.getAllProjects();

      expect(result.success).toBe(true);
      
      if (result.success) {
        // We expect at least some projects based on the log showing 12 directories
        expect(result.value.length).toBeGreaterThan(0);
        
        // Verify project structure
        result.value.forEach(project => {
          expect(project).toHaveProperty('id');
          expect(project).toHaveProperty('path');
          expect(project).toHaveProperty('flattenedDir');
          expect(project).toHaveProperty('pathExists');
          expect(project).toHaveProperty('lastModified');
          expect(project.id).toBe(project.flattenedDir);
        });

        console.log(`Loaded ${result.value.length} projects from filesystem`);
        console.log('Sample projects:');
        result.value.slice(0, 3).forEach(p => {
          console.log(`  - ${p.id} -> ${p.path} (exists: ${p.pathExists})`);
        });
      }
    });

    it('should handle non-existent projects directory gracefully', async () => {
      const nonExistentRepo = new FileSystemProjectRepository('/non/existent/path');
      const result = await nonExistentRepo.getAllProjects();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual([]);
      }
    });

    it('should filter existing vs non-existing projects correctly', async () => {
      const result = await repository.getAllProjects();

      expect(result.success).toBe(true);
      
      if (result.success) {
        const existingProjects = result.value.filter(p => p.pathExists);
        const nonExistingProjects = result.value.filter(p => !p.pathExists);

        console.log(`Existing projects: ${existingProjects.length}`);
        console.log(`Non-existing projects: ${nonExistingProjects.length}`);

        // We expect some projects to exist and some not to exist (based on the log)
        expect(existingProjects.length).toBeGreaterThan(0);
        
        // Log some examples
        if (existingProjects.length > 0) {
          console.log('Sample existing project:', existingProjects[0].path);
        }
        if (nonExistingProjects.length > 0) {
          console.log('Sample non-existing project:', nonExistingProjects[0].path);
        }
      }
    });
  });

  describe('getProject', () => {
    it('should find existing project by ID', async () => {
      // First get all projects to find a real ID
      const allResult = await repository.getAllProjects();
      expect(allResult.success).toBe(true);
      
      if (allResult.success && allResult.value.length > 0) {
        const firstProjectId = allResult.value[0].id;
        
        const result = await repository.getProject(firstProjectId);
        expect(result.success).toBe(true);
        
        if (result.success) {
          expect(result.value).not.toBeNull();
          expect(result.value?.id).toBe(firstProjectId);
        }
      }
    });

    it('should return null for non-existent project ID', async () => {
      const result = await repository.getProject('definitely-does-not-exist');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeNull();
      }
    });
  });

  describe('projectExists', () => {
    it('should correctly check project existence', async () => {
      // Test with a project we know exists from the log
      const existsResult = await repository.projectExists('-Users-doowell2-Source-repos-DT-Entropic');
      expect(existsResult.success).toBe(true);
      
      // Test with a project we know doesn't exist
      const notExistsResult = await repository.projectExists('definitely-does-not-exist');
      expect(notExistsResult.success).toBe(true);
      if (notExistsResult.success) {
        expect(notExistsResult.value).toBe(false);
      }
    });
  });

  describe('utility methods', () => {
    it('should provide correct projects directory path', () => {
      const projectsPath = repository.getProjectsDirectory();
      expect(projectsPath).toBe(projectsDir);
    });

    it('should build correct project paths', () => {
      const projectPath = repository.getProjectPath('test-project');
      expect(projectPath).toBe(path.join(projectsDir, 'test-project'));
    });

    it('should check accessibility', async () => {
      const result = await repository.isAccessible();
      expect(result.success).toBe(true);
      // The result value depends on whether the directory exists
      if (result.success) {
        console.log(`Projects directory accessible: ${result.value}`);
      }
    });
  });

  describe('integration with current filesystem state', () => {
    it('should match expected project count from log file', async () => {
      const result = await repository.getAllProjects();
      
      expect(result.success).toBe(true);
      if (result.success) {
        // Based on the log, we expect 12 project directories
        expect(result.value.length).toBe(12);
        
        console.log(`\nProject Loading Verification:`);
        console.log(`Expected: 12 projects (from log)`);
        console.log(`Actual: ${result.value.length} projects`);
        console.log(`Match: ${result.value.length === 12 ? '✅' : '❌'}`);
      }
    });

    it('should identify projects with rich history correctly', async () => {
      const result = await repository.getAllProjects();
      
      expect(result.success).toBe(true);
      if (result.success) {
        // Look for projects that should have rich history
        const entropicProject = result.value.find(p => 
          p.id === '-Users-doowell2-Source-repos-DT-Entropic'
        );
        
        if (entropicProject) {
          console.log(`\nEntropic Project Analysis:`);
          console.log(`ID: ${entropicProject.id}`);
          console.log(`Path: ${entropicProject.path}`);
          console.log(`Exists: ${entropicProject.pathExists ? '✅' : '⚠️'}`);
          console.log(`Last Modified: ${entropicProject.lastModified.toISOString()}`);
          
          // This project should exist and have recent activity
          expect(entropicProject.pathExists).toBe(true);
          expect(entropicProject.lastModified.getTime()).toBeGreaterThan(
            new Date('2025-01-01').getTime()
          );
        }
      }
    });
  });
});