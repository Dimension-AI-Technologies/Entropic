import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { IChatRepository, PromptEntry, Conversation, ChatStatistics } from '../models/Chat.js';
import { AsyncResult, Ok, Err, ResultUtils } from '../utils/Result.js';
import { PathUtils } from '../utils/PathUtils.js';
import { loadPromptsFromFile } from './chat/parseJsonl';

/**
 * FileSystem implementation of IChatRepository
 * Accesses the ~/.claude/projects/[project]/*.jsonl files where Claude stores conversation history
 * 
 * JSONL file format: Each line is a JSON object representing a prompt entry
 */
export class FileSystemChatRepository implements IChatRepository {
  private readonly projectsDir: string;

  constructor() {
    this.projectsDir = path.join(os.homedir(), '.claude', 'projects');
  }

  /**
   * Get all prompts for a specific project
   */
  async getProjectPrompts(projectPath: string): AsyncResult<PromptEntry[]> {
    // Use PathUtils to find the project directory
    const findResult = await PathUtils.findProjectDirectory(projectPath);
    
    if (!findResult.success || !findResult.value.found || !findResult.value.projectDir) {
      return Ok([]); // No prompts if project not found
    }
    
    const projectDir = findResult.value.projectDir;
    const prompts: PromptEntry[] = [];
    
    // Check if directory exists
    const dirExists = await this.directoryExists(projectDir);
    if (!dirExists) {
      return Ok([]);
    }
    
    // Get all JSONL files in the project directory
    const filesResult = await ResultUtils.fromPromise(fs.readdir(projectDir));
    if (!filesResult.success) {
      return Err(`Failed to read project directory: ${filesResult.error}`);
    }
    
    const jsonlFiles = filesResult.value.filter(file => file.endsWith('.jsonl')).sort();
    
    // Process all JSONL files
    for (const file of jsonlFiles) {
      const filePath = path.join(projectDir, file);
      const filePromptsResult = await loadPromptsFromFile(filePath);
      
      if (filePromptsResult.success) {
        prompts.push(...filePromptsResult.value);
      }
    }
    
    // Sort by timestamp
    prompts.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    return Ok(prompts);
  }

  /**
   * Get conversation for a project
   */
  async getConversation(projectPath: string): AsyncResult<Conversation> {
    const promptsResult = await this.getProjectPrompts(projectPath);
    
    if (!promptsResult.success) {
      return Err(promptsResult.error);
    }
    
    const prompts = promptsResult.value;
    
    const conversation: Conversation = {
      projectPath,
      prompts,
      startTime: prompts.length > 0 ? new Date(prompts[0].timestamp) : undefined,
      endTime: prompts.length > 0 ? new Date(prompts[prompts.length - 1].timestamp) : undefined,
      messageCount: prompts.length
    };
    
    return Ok(conversation);
  }

  /**
   * Get prompts for a specific session across all projects
   */
  async getSessionPrompts(sessionId: string): AsyncResult<PromptEntry[]> {
    const allPrompts: PromptEntry[] = [];
    
    // Check if projects directory exists
    const dirExists = await this.directoryExists(this.projectsDir);
    if (!dirExists) {
      return Ok([]);
    }
    
    // Get all project directories
    const projectDirsResult = await ResultUtils.fromPromise(fs.readdir(this.projectsDir));
    if (!projectDirsResult.success) {
      return Err(`Failed to read projects directory: ${projectDirsResult.error}`);
    }
    
    for (const projectDir of projectDirsResult.value) {
      const projectPath = path.join(this.projectsDir, projectDir);
      const statsResult = await ResultUtils.fromPromise(fs.stat(projectPath));
      
      if (!statsResult.success) {
        continue; // Skip if can't stat the path
      }
      
      if (statsResult.value.isDirectory()) {
        // Get JSONL files in this project
        const filesResult = await ResultUtils.fromPromise(fs.readdir(projectPath));
        if (!filesResult.success) {
          continue; // Skip if can't read directory
        }
        
        const jsonlFiles = filesResult.value.filter(file => file.endsWith('.jsonl'));
        
        for (const file of jsonlFiles) {
          const filePath = path.join(projectPath, file);
          const filePromptsResult = await loadPromptsFromFile(filePath);
          
          if (filePromptsResult.success) {
            const sessionPrompts = filePromptsResult.value.filter(p => p.sessionId === sessionId);
            allPrompts.push(...sessionPrompts);
          }
        }
      }
    }
    
    // Sort by timestamp
    allPrompts.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    return Ok(allPrompts);
  }

  /**
   * Get all available conversations across all projects
   */
  async getAllConversations(): AsyncResult<Conversation[]> {
    const conversations: Conversation[] = [];
    
    // Check if projects directory exists
    const dirExists = await this.directoryExists(this.projectsDir);
    if (!dirExists) {
      return Ok([]);
    }
    
    // Get all project directories
    const projectDirsResult = await ResultUtils.fromPromise(fs.readdir(this.projectsDir));
    if (!projectDirsResult.success) {
      return Err(`Failed to read projects directory: ${projectDirsResult.error}`);
    }
    
    for (const projectDirName of projectDirsResult.value) {
      const projectPath = path.join(this.projectsDir, projectDirName);
      const statsResult = await ResultUtils.fromPromise(fs.stat(projectPath));
      
      if (!statsResult.success) {
        continue; // Skip if can't stat the path
      }
      
      if (statsResult.value.isDirectory()) {
        // Try to unflatten the path to get real project path
        const realPath = PathUtils.guessPathFromFlattenedName(projectDirName);
        const conversationResult = await this.getConversation(realPath);
        
        if (conversationResult.success && conversationResult.value.messageCount > 0) {
          conversations.push(conversationResult.value);
        }
      }
    }
    
    return Ok(conversations);
  }

  /**
   * Get chat statistics for a project
   */
  async getChatStatistics(projectPath: string): AsyncResult<ChatStatistics> {
    const promptsResult = await this.getProjectPrompts(projectPath);
    
    if (!promptsResult.success) {
      return Err(promptsResult.error);
    }
    
    const prompts = promptsResult.value;
    
    if (prompts.length === 0) {
      return Ok({
        totalMessages: 0,
        userMessages: 0,
        assistantMessages: 0,
        systemMessages: 0,
        averageMessageLength: 0,
        sessionsCount: 0,
        dateRange: {
          earliest: null,
          latest: null
        }
      });
    }
    
    const sessions = new Set(prompts.map(p => p.sessionId));
    const userMessages = prompts.filter(p => p.message.role === 'user');
    const assistantMessages = prompts.filter(p => p.message.role === 'assistant');
    const systemMessages = prompts.filter(p => p.message.role === 'system');
    
    const totalLength = prompts.reduce((sum, p) => sum + p.message.content.length, 0);
    const averageLength = Math.round(totalLength / prompts.length);
    
    const timestamps = prompts.map(p => new Date(p.timestamp).getTime());
    const earliest = new Date(Math.min(...timestamps));
    const latest = new Date(Math.max(...timestamps));
    
    return Ok({
      totalMessages: prompts.length,
      userMessages: userMessages.length,
      assistantMessages: assistantMessages.length,
      systemMessages: systemMessages.length,
      averageMessageLength: averageLength,
      sessionsCount: sessions.size,
      dateRange: {
        earliest,
        latest
      }
    });
  }

  /**
   * Search prompts by content
   */
  async searchPrompts(query: string, projectPath?: string): AsyncResult<PromptEntry[]> {
    const lowerQuery = query.toLowerCase();
    const results: PromptEntry[] = [];
    
    if (projectPath) {
      // Search in specific project
      const promptsResult = await this.getProjectPrompts(projectPath);
      if (promptsResult.success) {
        const matches = promptsResult.value.filter(p => 
          p.message.content.toLowerCase().includes(lowerQuery)
        );
        results.push(...matches);
      }
    } else {
      // Search across all projects
      const conversationsResult = await this.getAllConversations();
      if (conversationsResult.success) {
        for (const conversation of conversationsResult.value) {
          const matches = conversation.prompts.filter(p => 
            p.message.content.toLowerCase().includes(lowerQuery)
          );
          results.push(...matches);
        }
      }
    }
    
    // Sort by timestamp
    results.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    return Ok(results);
  }

  /**
   * Check if project has any prompts
   */
  async hasPrompts(projectPath: string): AsyncResult<boolean> {
    const promptsResult = await this.getProjectPrompts(projectPath);
    
    if (!promptsResult.success) {
      return Err(promptsResult.error);
    }
    
    return Ok(promptsResult.value.length > 0);
  }

  /**
   * Get the projects directory path
   */
  getProjectsDirectoryPath(): string {
    return this.projectsDir;
  }

  // Private helper methods

  private async directoryExists(dirPath: string): Promise<boolean> {
    const statsResult = await ResultUtils.fromPromise(fs.stat(dirPath));
    if (!statsResult.success) {
      return false;
    }
    return statsResult.value.isDirectory();
  }

  // JSONL parsing moved to ./chat/parseJsonl
}
