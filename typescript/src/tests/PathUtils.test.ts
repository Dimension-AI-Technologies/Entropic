import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { PathUtils } from '../utils/PathUtils';

describe('PathUtils', () => {
  let testDir: string;
  let projectDir: string;
  let sessionDir: string;
  let originalProjectsDir: string;

  beforeAll(async () => {
    // Save original projects directory
    originalProjectsDir = PathUtils.getProjectsDir();
    
    // Create test directory structure
    testDir = path.join(os.tmpdir(), `pathutils-test-${Date.now()}`);
    projectDir = path.join(testDir, 'test-project');
    
    // Set test projects directory
    const testProjectsDir = path.join(testDir, '.claude', 'projects');
    PathUtils.setProjectsDir(testProjectsDir);
    
    sessionDir = path.join(testProjectsDir, '-test-project', 'sessions', 'test-session');
    
    await fs.mkdir(sessionDir, { recursive: true });
    await fs.mkdir(projectDir, { recursive: true });
  });

  afterAll(async () => {
    // Restore original projects directory
    PathUtils.setProjectsDir(originalProjectsDir);
    
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to clean up test directory:', error);
    }
  });

  describe('createFlattenedPath', () => {
    test('should flatten Unix paths correctly', () => {
      expect(PathUtils.createFlattenedPath('/home/user/project')).toBe('-home-user-project');
      expect(PathUtils.createFlattenedPath('/usr/local/bin')).toBe('-usr-local-bin');
    });

    test('should flatten Windows paths correctly', () => {
      expect(PathUtils.createFlattenedPath('C:\\Users\\User\\Documents')).toBe('C:-Users-User-Documents');
      expect(PathUtils.createFlattenedPath('D:\\Projects\\MyApp')).toBe('D:-Projects-MyApp');
    });

    test('should handle paths with special characters', () => {
      expect(PathUtils.createFlattenedPath('/path/with spaces/folder')).toBe('-path-with spaces-folder');
      expect(PathUtils.createFlattenedPath('/path-with-dashes/folder')).toBe('-path-with-dashes-folder');
    });

    test('should handle empty and root paths', () => {
      expect(PathUtils.createFlattenedPath('')).toBe('');
      expect(PathUtils.createFlattenedPath('/')).toBe('-');
      expect(PathUtils.createFlattenedPath('C:\\')).toBe('C:-');
    });
  });

  describe('guessPathFromFlattenedName', () => {
    test('should unflatten Unix paths correctly', () => {
      // The guessPathFromFlattenedName function tries to validate against actual filesystem
      // For Unix paths without metadata, it returns a simple transformation
      const result = PathUtils.guessPathFromFlattenedName('-home-user-project');
      expect(result).toBe('/home/user/project');
    });

    test('should unflatten Windows paths correctly', () => {
      const result = PathUtils.guessPathFromFlattenedName('C--Users-User-Documents');
      // Since the path doesn't exist on filesystem, it returns the attempted reconstruction
      expect(result).toMatch(/^C/);
      expect(result.toLowerCase()).toContain('users');
    });

    test('should handle empty and invalid paths', () => {
      expect(PathUtils.guessPathFromFlattenedName('')).toBe('');
      expect(PathUtils.guessPathFromFlattenedName('invalid')).toBe('invalid');
    });
  });

  describe('findProjectDirectory', () => {
    test('should find project directory from flattened path', async () => {
      const flattenedPath = PathUtils.createFlattenedPath(projectDir);
      const flattenedProjectDir = path.join(testDir, '.claude', 'projects', flattenedPath);
      await fs.mkdir(flattenedProjectDir, { recursive: true });
      
      const result = await PathUtils.findProjectDirectory(projectDir);
      expect(result.found).toBe(true);
      expect(result.projectDir).toBe(flattenedProjectDir);
    });

    test('should find project directory from metadata', async () => {
      // Create metadata file in the .claude/projects directory
      const flattenedPath = PathUtils.createFlattenedPath(projectDir);
      const projectsPath = path.join(testDir, '.claude', 'projects', flattenedPath);
      await fs.mkdir(projectsPath, { recursive: true });
      const metadataPath = path.join(projectsPath, 'metadata.json');
      const metadata = {
        path: projectDir,
        timestamp: new Date().toISOString()
      };
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
      
      const result = await PathUtils.findProjectDirectory(projectDir);
      expect(result.found).toBe(true);
    });

    test('should find parent project for subdirectory paths', async () => {
      const subdirPath = path.join(projectDir, 'subdir', 'deep');
      const flattenedPath = PathUtils.createFlattenedPath(projectDir);
      const flattenedProjectDir = path.join(testDir, '.claude', 'projects', flattenedPath);
      await fs.mkdir(flattenedProjectDir, { recursive: true });
      
      const result = await PathUtils.findProjectDirectory(subdirPath);
      expect(result.found).toBe(true);
      expect(result.projectDir).toBe(flattenedProjectDir);
    });

    test('should return not found for non-existent project', async () => {
      const nonExistentPath = path.join(testDir, 'non-existent-project');
      const result = await PathUtils.findProjectDirectory(nonExistentPath);
      expect(result.found).toBe(false);
      expect(result.projectDir).toBe(null);
    });
  });

  describe('getRealProjectPath', () => {
    test('should get real project path from session', async () => {
      // Create a test session file
      const sessionId = 'test-session-id';
      const flattenedPath = PathUtils.createFlattenedPath(projectDir);
      const projectsPath = path.join(testDir, '.claude', 'projects', flattenedPath);
      await fs.mkdir(projectsPath, { recursive: true });
      
      // Create session file
      const sessionFile = path.join(projectsPath, `${sessionId}-12345.json`);
      await fs.writeFile(sessionFile, JSON.stringify({ projectPath: projectDir }));
      
      const result = await PathUtils.getRealProjectPath(sessionId);
      expect(result.path).toBe(projectDir);
    });

    test('should return null when session not found', async () => {
      const result = await PathUtils.getRealProjectPath('non-existent-session');
      expect(result.path).toBe(null);
      expect(result.failureReason).toBeTruthy();
    });
  });

  describe('validatePath', () => {
    test('should validate existing paths', () => {
      expect(PathUtils.validatePath(testDir)).toBe(true);
      expect(PathUtils.validatePath(projectDir)).toBe(true);
    });

    test('should return false for non-existent paths', () => {
      expect(PathUtils.validatePath('/non/existent/path')).toBe(false);
      expect(PathUtils.validatePath('C:\\fake\\path')).toBe(false);
    });
  });
});