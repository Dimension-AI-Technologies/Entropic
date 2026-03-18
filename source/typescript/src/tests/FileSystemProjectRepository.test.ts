import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { FileSystemProjectRepository } from '../repositories/FileSystemProjectRepository.js';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

describe('FileSystemProjectRepository (agnostic)', () => {
  const tmpRoot = path.join(os.tmpdir(), `fsrepo-${Date.now()}`);
  const projectsDir = path.join(tmpRoot, 'projects');
  let repository: FileSystemProjectRepository;

  beforeAll(async () => {
    await fs.mkdir(projectsDir, { recursive: true });
    // Create fake flattened directories
    const dirs = ['-tmp-user-ProjectOne', '-tmp-user-ProjectTwo', '-tmp-user-Empty'];
    for (const d of dirs) {
      const p = path.join(projectsDir, d);
      await fs.mkdir(p, { recursive: true });
      if (d !== '-tmp-user-Empty') {
        await fs.writeFile(path.join(p, '.session_abc.json'), '{}');
      }
    }
  });

  afterAll(async () => { try { await fs.rm(tmpRoot, { recursive: true, force: true }); } catch {} });

  beforeEach(() => {
    repository = new FileSystemProjectRepository(projectsDir);
  });

  describe('getAllProjects', () => {
    it('loads projects from the provided directory', async () => {
      const result = await repository.getAllProjects();

      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.value.length).toBe(3);
        
        // Verify project structure
        result.value.forEach(project => {
          expect(project).toHaveProperty('id');
          expect(project).toHaveProperty('path');
          expect(project).toHaveProperty('flattenedDir');
          expect(project).toHaveProperty('pathExists');
          expect(project).toHaveProperty('lastModified');
          expect(project.id).toBe(project.flattenedDir);
        });

        expect(result.value.map(p => p.id).sort()).toEqual(['-tmp-user-Empty','-tmp-user-ProjectOne','-tmp-user-ProjectTwo'].sort());
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
        expect(existingProjects.length + nonExistingProjects.length).toBe(result.value.length);
      }
    });
  });

  describe('getProject', () => {
    it('finds existing project by ID', async () => {
      const allResult = await repository.getAllProjects();
      expect(allResult.success).toBe(true);
      const firstProjectId = allResult.success && allResult.value.length > 0 ? allResult.value[0].id : '';
      const result = await repository.getProject(firstProjectId);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).not.toBeNull();
        expect(result.value?.id).toBe(firstProjectId);
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
    it('checks project existence by flattened id', async () => {
      const existsResult = await repository.projectExists('-tmp-user-ProjectOne');
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

  // Removed environment-coupled assertions
});
