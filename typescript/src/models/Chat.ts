import { AsyncResult } from '../utils/Result';

/**
 * Chat message domain model based on Claude's conversation structure
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

/**
 * Prompt entry as stored in JSONL files
 */
export interface PromptEntry {
  timestamp: string;
  message: ChatMessage;
  sessionId: string;
  uuid: string;
}

/**
 * Conversation represents a collection of prompts for a project
 */
export interface Conversation {
  projectPath: string;
  prompts: PromptEntry[];
  startTime?: Date;
  endTime?: Date;
  messageCount: number;
}

/**
 * Statistics about chat history
 */
export interface ChatStatistics {
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  systemMessages: number;
  averageMessageLength: number;
  sessionsCount: number;
  dateRange: {
    earliest: Date | null;
    latest: Date | null;
  };
}

/**
 * Repository interface for chat/prompt data access
 * Abstracts the ~/.claude/projects/*/. jsonl files
 */
export interface IChatRepository {
  /**
   * Get all prompts for a specific project
   */
  getProjectPrompts(projectPath: string): AsyncResult<PromptEntry[]>;
  
  /**
   * Get conversation for a project (prompts organized as conversation)
   */
  getConversation(projectPath: string): AsyncResult<Conversation>;
  
  /**
   * Get prompts for a specific session
   */
  getSessionPrompts(sessionId: string): AsyncResult<PromptEntry[]>;
  
  /**
   * Get all available conversations across all projects
   */
  getAllConversations(): AsyncResult<Conversation[]>;
  
  /**
   * Get chat statistics for a project
   */
  getChatStatistics(projectPath: string): AsyncResult<ChatStatistics>;
  
  /**
   * Search prompts by content
   */
  searchPrompts(query: string, projectPath?: string): AsyncResult<PromptEntry[]>;
  
  /**
   * Check if project has any prompts
   */
  hasPrompts(projectPath: string): AsyncResult<boolean>;
  
  /**
   * Get the projects directory path
   */
  getProjectsDirectoryPath(): string;
}