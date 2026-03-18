import fs from 'node:fs';
import path from 'node:fs';
import os from 'node:fs';
import { ITodoRepository, Todo, Session } from '../models/Todo.js';
import { AsyncResult, Ok, Err, ResultUtils } from '../utils/Result.js';
import { PathUtils } from '../utils/PathUtils.js';

/**
 * FileSystem implementation of ITodoRepository
 * Accesses the ~/.claude/todos/ directory where Claude Code stores session files
 * 
 * File naming pattern: {sessionId}-agent-{sessionId}.json
 * Each file contains an array of todos for that session
 */
export class FileSystemTodoRepository implements ITodoRepository {
  private readonly todosDir: string;

  constructor() {
    this.todosDir = path.join(os.homedir(), '.claude', 'todos');
  }

  /**
   * Get all sessions from the ~/.claude/todos/ directory
   */
  async getAllSessions(): AsyncResult<Session[]> {
    // Check if todos directory exists
    const dirExists = await this.directoryExists(this.todosDir);
    if (!dirExists) {
      return Ok([]);
    }

    const filesResult = await ResultUtils.fromPromise(fs.readdir(this.todosDir));
    if (!filesResult.success) {
      return Err(`Failed to read todos directory: ${filesResult.error}`);
    }

    const sessionFiles = filesResult.value.filter(file => 
      file.endsWith('-agent.json') || 
      file.match(/^[0-9a-f-]+-agent-[0-9a-f-]+\.json$/)
    );

    const sessions: Session[] = [];
    
    for (const filename of sessionFiles) {
      const filePath = path.join(this.todosDir, filename);
      const sessionId = this.extractSessionIdFromFilename(filename);
      
      if (!sessionId) continue;

      const statsResult = await ResultUtils.fromPromise(fs.stat(filePath));
      if (!statsResult.success) {
        console.warn(`Failed to stat session file ${filename}:`, statsResult.error);
        continue;
      }

      const todosResult = await this.loadTodosFromFile(filePath);
      
      if (!todosResult.success) {
        console.warn(`Failed to load todos from ${filename}:`, todosResult.error);
        continue;
      }

      // Try to reconstruct project path from session data
      const projectPath = await this.guessProjectPathForSession(sessionId);

      const session: Session = {
        id: sessionId,
        todos: todosResult.value,
        lastModified: statsResult.value.mtime,
        created: statsResult.value.birthtime,
        filePath: filePath,
        projectPath: projectPath || undefined
      };

      sessions.push(session);
    }

    // Sort by last modified (most recent first)
    sessions.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
    
    return Ok(sessions);
  }

  /**
   * Get a specific session by ID
   */
  async getSession(sessionId: string): AsyncResult<Session | null> {
    const filename = await this.findSessionFilename(sessionId);
    if (!filename) {
      return Ok(null);
    }

    const filePath = path.join(this.todosDir, filename);
    const statsResult = await ResultUtils.fromPromise(fs.stat(filePath));
    if (!statsResult.success) {
      return Err(`Failed to stat session file: ${statsResult.error}`);
    }

    const todosResult = await this.loadTodosFromFile(filePath);
    
    if (!todosResult.success) {
      return Err(`Failed to load todos for session ${sessionId}: ${todosResult.error}`);
    }

    const projectPath = await this.guessProjectPathForSession(sessionId);

    const session: Session = {
      id: sessionId,
      todos: todosResult.value,
      lastModified: statsResult.value.mtime,
      created: statsResult.value.birthtime,
      filePath: filePath,
      projectPath: projectPath || undefined
    };

    return Ok(session);
  }

  /**
   * Get sessions for a specific project path
   */
  async getSessionsForProject(projectPath: string): AsyncResult<Session[]> {
    const allSessionsResult = await this.getAllSessions();
    if (!allSessionsResult.success) {
      return allSessionsResult;
    }

    // Filter sessions by project path
    const projectSessions = allSessionsResult.value.filter(session => 
      session.projectPath === projectPath
    );

    return Ok(projectSessions);
  }

  /**
   * Get all todos from all sessions
   */
  async getAllTodos(): AsyncResult<Todo[]> {
    const sessionsResult = await this.getAllSessions();
    if (!sessionsResult.success) {
      return Err(sessionsResult.error);
    }

    const allTodos: Todo[] = [];
    for (const session of sessionsResult.value) {
      allTodos.push(...session.todos);
    }

    return Ok(allTodos);
  }

  /**
   * Get todos for a specific session
   */
  async getTodosForSession(sessionId: string): AsyncResult<Todo[]> {
    const sessionResult = await this.getSession(sessionId);
    if (!sessionResult.success) {
      return Err(sessionResult.error);
    }

    if (!sessionResult.value) {
      return Ok([]);
    }

    return Ok(sessionResult.value.todos);
  }

  /**
   * Save todos for a session
   */
  async saveTodosForSession(sessionId: string, todos: Todo[]): AsyncResult<void> {
    // Ensure todos directory exists
    const mkdirResult = await ResultUtils.fromPromise(
      fs.mkdir(this.todosDir, { recursive: true })
    );
    if (!mkdirResult.success) {
      return Err(`Failed to create todos directory: ${mkdirResult.error}`);
    }

    const filename = await this.findSessionFilename(sessionId) || 
                    `${sessionId}-agent-${sessionId}.json`;
    const filePath = path.join(this.todosDir, filename);

    const writeResult = await ResultUtils.fromPromise(
      fs.writeFile(filePath, JSON.stringify(todos, null, 2), 'utf-8')
    );
    if (!writeResult.success) {
      return Err(`Failed to write todos file: ${writeResult.error}`);
    }

    return Ok(undefined);
  }

  /**
   * Check if a session exists
   */
  async sessionExists(sessionId: string): AsyncResult<boolean> {
    const filename = await this.findSessionFilename(sessionId);
    return Ok(filename !== null);
  }

  /**
   * Get the todos directory path
   */
  getTodosDirectoryPath(): string {
    return this.todosDir;
  }

  // Private helper methods

  private async directoryExists(dirPath: string): Promise<boolean> {
    const statsResult = await ResultUtils.fromPromise(fs.stat(dirPath));
    if (!statsResult.success) {
      return false;
    }
    return statsResult.value.isDirectory();
  }

  private extractSessionIdFromFilename(filename: string): string | null {
    // Handle patterns: {sessionId}-agent-{sessionId}.json or {sessionId}-agent.json
    const match = filename.match(/^([0-9a-f-]+)-agent(?:-[0-9a-f-]+)?\.json$/);
    return match ? match[1] : null;
  }

  private async findSessionFilename(sessionId: string): Promise<string | null> {
    const filesResult = await ResultUtils.fromPromise(fs.readdir(this.todosDir));
    if (!filesResult.success) {
      return null;
    }
    
    // Look for exact match first
    const exactMatch = filesResult.value.find(file => 
      file === `${sessionId}-agent-${sessionId}.json` ||
      file === `${sessionId}-agent.json`
    );
    
    if (exactMatch) return exactMatch;

    // Look for partial match
    const partialMatch = filesResult.value.find(file => 
      file.startsWith(`${sessionId}-agent`)
    );
    
    return partialMatch || null;
  }

  private async loadTodosFromFile(filePath: string): AsyncResult<Todo[]> {
    const contentResult = await ResultUtils.fromPromise(fs.readFile(filePath, 'utf-8'));
    if (!contentResult.success) {
      return Err(`Failed to read file: ${contentResult.error}`);
    }
    
    if (!contentResult.value.trim()) {
      return Ok([]);
    }

    const parseResult = await ResultUtils.fromPromise(
      Promise.resolve(JSON.parse(contentResult.value))
    );
    if (!parseResult.success) {
      return Err(`Failed to parse JSON: ${parseResult.error}`);
    }
    
    if (!Array.isArray(parseResult.value)) {
      return Err('File does not contain a valid todo array');
    }

    // Validate and normalize todos
    const todos: Todo[] = parseResult.value.map((item: any) => ({
      content: String(item.content || ''),
      status: ['pending', 'in_progress', 'completed'].includes(item.status) 
              ? item.status 
              : 'pending',
      activeForm: item.activeForm || undefined,
      id: item.id || undefined,
      created: item.created ? new Date(item.created) : undefined,
      priority: ['low', 'medium', 'high'].includes(item.priority) 
               ? item.priority 
               : undefined
    }));

    return Ok(todos);
  }

  private async guessProjectPathForSession(sessionId: string): Promise<string | null> {
    // Use PathUtils to find the project directory for this session
    const result = await PathUtils.getRealProjectPath(sessionId);
    return result.success && result.value ? result.value.path : null;
  }
}