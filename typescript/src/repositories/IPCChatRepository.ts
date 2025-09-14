import { IChatRepository, PromptEntry, Conversation, ChatStatistics } from '../models/Chat';
import { AsyncResult, Ok, Err } from '../utils/Result';

/**
 * IPC-based implementation of IChatRepository
 * Delegates all filesystem operations to the main process via IPC
 */
export class IPCChatRepository implements IChatRepository {
  /**
   * Get all prompts for a specific project via IPC
   */
  async getProjectPrompts(projectPath: string): AsyncResult<PromptEntry[]> {
    try {
      const result = await window.electronAPI.getProjectPrompts(projectPath);
      
      if (!result.success || !result.value) {
        return Err(result.error || 'Failed to get project prompts');
      }
      
      return Ok(result.value);
    } catch (error) {
      return Err(`Failed to get project prompts via IPC: ${error instanceof Error ? error.message : String(error)}`);
    }
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
    // This would require a new IPC handler to get session prompts across all projects
    // For now, return an error
    return Err('Getting session prompts across all projects via IPC is not yet implemented');
  }

  /**
   * Get all available conversations across all projects
   */
  async getAllConversations(): AsyncResult<Conversation[]> {
    try {
      // Get all projects first
      const projects = await window.electronAPI.getTodos();
      const conversations: Conversation[] = [];
      
      // Get prompts for each project
      for (const project of projects) {
        const conversationResult = await this.getConversation(project.path);
        if (conversationResult.success && conversationResult.value.messageCount > 0) {
          conversations.push(conversationResult.value);
        }
      }
      
      return Ok(conversations);
    } catch (error) {
      return Err(`Failed to get all conversations via IPC: ${error instanceof Error ? error.message : String(error)}`);
    }
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
    try {
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
        } else {
          return Err(promptsResult.error);
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
        } else {
          return Err(conversationsResult.error);
        }
      }
      
      // Sort by timestamp
      results.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      return Ok(results);
    } catch (error) {
      return Err(`Failed to search prompts via IPC: ${error instanceof Error ? error.message : String(error)}`);
    }
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
    // Return a placeholder path since this is handled by IPC
    return '~/.claude/projects';
  }
}

// Global electronAPI type is declared in src/types/index.ts
