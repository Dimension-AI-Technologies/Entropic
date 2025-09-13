import { IChatRepository, PromptEntry, Conversation, ChatStatistics, ChatMessage } from '../models/Chat';
import { AsyncResult, Ok, Err } from '../utils/Result';

/**
 * Mock implementation of IChatRepository for testing
 * Uses authentic-looking sample data based on real Claude conversation patterns
 */
export class MockChatRepository implements IChatRepository {
  private prompts: Map<string, PromptEntry[]> = new Map();
  private readonly delay: number;

  constructor(initialPrompts?: Map<string, PromptEntry[]>, delayMs: number = 10) {
    this.delay = delayMs;
    
    if (initialPrompts) {
      this.prompts = new Map(initialPrompts);
    } else {
      // Initialize with authentic sample data
      this.initializeWithSampleData();
    }
  }

  async getProjectPrompts(projectPath: string): AsyncResult<PromptEntry[]> {
    await this.simulateDelay();
    const prompts = this.prompts.get(projectPath) || [];
    return Ok([...prompts]); // Return copy to prevent mutation
  }

  async getConversation(projectPath: string): AsyncResult<Conversation> {
    await this.simulateDelay();
    const prompts = this.prompts.get(projectPath) || [];
    
    const conversation: Conversation = {
      projectPath,
      prompts: [...prompts],
      startTime: prompts.length > 0 ? new Date(prompts[0].timestamp) : undefined,
      endTime: prompts.length > 0 ? new Date(prompts[prompts.length - 1].timestamp) : undefined,
      messageCount: prompts.length
    };
    
    return Ok(conversation);
  }

  async getSessionPrompts(sessionId: string): AsyncResult<PromptEntry[]> {
    await this.simulateDelay();
    const allPrompts: PromptEntry[] = [];
    
    for (const projectPrompts of this.prompts.values()) {
      const sessionPrompts = projectPrompts.filter(p => p.sessionId === sessionId);
      allPrompts.push(...sessionPrompts);
    }
    
    // Sort by timestamp
    allPrompts.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    return Ok(allPrompts);
  }

  async getAllConversations(): AsyncResult<Conversation[]> {
    await this.simulateDelay();
    const conversations: Conversation[] = [];
    
    for (const [projectPath, prompts] of this.prompts.entries()) {
      conversations.push({
        projectPath,
        prompts: [...prompts],
        startTime: prompts.length > 0 ? new Date(prompts[0].timestamp) : undefined,
        endTime: prompts.length > 0 ? new Date(prompts[prompts.length - 1].timestamp) : undefined,
        messageCount: prompts.length
      });
    }
    
    return Ok(conversations);
  }

  async getChatStatistics(projectPath: string): AsyncResult<ChatStatistics> {
    await this.simulateDelay();
    const prompts = this.prompts.get(projectPath) || [];
    
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

  async searchPrompts(query: string, projectPath?: string): AsyncResult<PromptEntry[]> {
    await this.simulateDelay();
    const lowerQuery = query.toLowerCase();
    const results: PromptEntry[] = [];
    
    const projectsToSearch = projectPath 
      ? [projectPath]
      : Array.from(this.prompts.keys());
    
    for (const path of projectsToSearch) {
      const prompts = this.prompts.get(path) || [];
      const matches = prompts.filter(p => 
        p.message.content.toLowerCase().includes(lowerQuery)
      );
      results.push(...matches);
    }
    
    // Sort by timestamp
    results.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    return Ok(results);
  }

  async hasPrompts(projectPath: string): AsyncResult<boolean> {
    await this.simulateDelay();
    const prompts = this.prompts.get(projectPath) || [];
    return Ok(prompts.length > 0);
  }

  getProjectsDirectoryPath(): string {
    return '/mock/projects/directory';
  }

  // Test helper methods

  /**
   * Add prompts for a project (test helper)
   */
  addProjectPrompts(projectPath: string, prompts: PromptEntry[]): void {
    const existing = this.prompts.get(projectPath) || [];
    this.prompts.set(projectPath, [...existing, ...prompts]);
  }

  /**
   * Clear all prompts (test helper)
   */
  clear(): void {
    this.prompts.clear();
  }

  /**
   * Get count of projects with prompts (test helper)
   */
  getProjectCount(): number {
    return this.prompts.size;
  }

  /**
   * Create authentic sample prompts based on real Claude conversation patterns
   */
  static createSamplePrompts(): Map<string, PromptEntry[]> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const samplePrompts = new Map<string, PromptEntry[]>();

    // Entropic project conversation
    samplePrompts.set('/Users/doowell2/Source/repos/DT/Entropic', [
      {
        timestamp: twoHoursAgo.toISOString(),
        message: {
          role: 'user',
          content: 'Help me refactor the TodoManager to use MVVM architecture'
        },
        sessionId: 'session-abc-123',
        uuid: 'uuid-1'
      },
      {
        timestamp: new Date(twoHoursAgo.getTime() + 1000).toISOString(),
        message: {
          role: 'assistant',
          content: 'I\'ll help you refactor the TodoManager to use MVVM architecture. Let\'s start by creating the Model, View, and ViewModel layers...'
        },
        sessionId: 'session-abc-123',
        uuid: 'uuid-2'
      },
      {
        timestamp: oneHourAgo.toISOString(),
        message: {
          role: 'user',
          content: 'Add unit tests for the TodosViewModel'
        },
        sessionId: 'session-abc-123',
        uuid: 'uuid-3'
      },
      {
        timestamp: new Date(oneHourAgo.getTime() + 2000).toISOString(),
        message: {
          role: 'assistant',
          content: 'I\'ll create comprehensive unit tests for the TodosViewModel using Jest and following TDD principles...'
        },
        sessionId: 'session-abc-123',
        uuid: 'uuid-4'
      }
    ]);

    // MacroN project conversation
    samplePrompts.set('/Users/doowell2/Source/repos/DT/MacroN', [
      {
        timestamp: oneDayAgo.toISOString(),
        message: {
          role: 'user',
          content: 'Update the F# GARCH model parameters'
        },
        sessionId: 'session-def-456',
        uuid: 'uuid-5'
      },
      {
        timestamp: new Date(oneDayAgo.getTime() + 1500).toISOString(),
        message: {
          role: 'assistant',
          content: 'I\'ll update the GARCH model parameters in your F# project. Let me examine the current implementation...'
        },
        sessionId: 'session-def-456',
        uuid: 'uuid-6'
      }
    ]);

    // Claude configuration project
    samplePrompts.set('/Users/doowell2/.claude', [
      {
        timestamp: now.toISOString(),
        message: {
          role: 'user',
          content: 'Show me my Claude configuration settings'
        },
        sessionId: 'session-ghi-789',
        uuid: 'uuid-7'
      },
      {
        timestamp: new Date(now.getTime() + 1000).toISOString(),
        message: {
          role: 'assistant',
          content: 'Here are your current Claude configuration settings from the .claude directory...'
        },
        sessionId: 'session-ghi-789',
        uuid: 'uuid-8'
      }
    ]);

    return samplePrompts;
  }

  private initializeWithSampleData(): void {
    this.prompts = MockChatRepository.createSamplePrompts();
  }

  private async simulateDelay(): Promise<void> {
    if (this.delay > 0) {
      return new Promise(resolve => setTimeout(resolve, this.delay));
    }
  }
}