import { describe, it, expect, beforeEach } from '@jest/globals';
import { ChatHistoryViewModel } from '../viewmodels/ChatHistoryViewModel';
import { IChatRepository, PromptEntry, Conversation, ChatStatistics } from '../models/Chat';
import { AsyncResult, Ok, Err } from '../utils/Result';

// Simple in-memory chat repository for testing
class InMemoryChatRepository implements IChatRepository {
  private conversations: Map<string, PromptEntry[]> = new Map();

  constructor(initialData?: Map<string, PromptEntry[]>) {
    if (initialData) {
      this.conversations = new Map(initialData);
    } else {
      this.conversations = new Map();
      // Add default test data only if no initial data was explicitly provided
      this.addDefaultTestData();
    }
  }

  private addDefaultTestData(): void {
    const entropicPrompts: PromptEntry[] = [
      {
        timestamp: '2024-01-15T10:30:00Z',
        message: { role: 'user', content: 'Implement MVVM architecture for todo management' },
        sessionId: 'session-abc-123',
        uuid: 'uuid-1'
      },
      {
        timestamp: '2024-01-15T10:31:00Z',
        message: { role: 'assistant', content: 'I\'ll help you implement MVVM architecture. Let\'s start by creating ViewModels...' },
        sessionId: 'session-abc-123',
        uuid: 'uuid-2'
      },
      {
        timestamp: '2024-01-15T11:00:00Z',
        message: { role: 'user', content: 'Add unit tests for the ViewModels' },
        sessionId: 'session-def-456',
        uuid: 'uuid-3'
      },
      {
        timestamp: '2024-01-15T11:01:00Z',
        message: { role: 'assistant', content: 'Let\'s create comprehensive unit tests for your ViewModels...' },
        sessionId: 'session-def-456',
        uuid: 'uuid-4'
      },
      {
        timestamp: '2024-01-15T14:00:00Z',
        message: { role: 'user', content: 'Help me refactor this code for better maintainability' },
        sessionId: 'session-ghi-789',
        uuid: 'uuid-5'
      }
    ];

    const macronPrompts: PromptEntry[] = [
      {
        timestamp: '2024-01-13T11:20:00Z',
        message: { role: 'user', content: 'Implement GARCH model estimation in F#' },
        sessionId: 'session-jkl-012',
        uuid: 'uuid-6'
      },
      {
        timestamp: '2024-01-13T11:21:00Z',
        message: { role: 'assistant', content: 'I\'ll help you implement GARCH model estimation. F# is excellent for this...' },
        sessionId: 'session-jkl-012',
        uuid: 'uuid-7'
      }
    ];

    this.conversations.set('/Users/doowell2/Source/repos/DT/Entropic', entropicPrompts);
    this.conversations.set('/Users/doowell2/Source/repos/DT/MacroN', macronPrompts);
  }

  async getProjectPrompts(projectPath: string): AsyncResult<PromptEntry[]> {
    const prompts = this.conversations.get(projectPath) || [];
    return Ok([...prompts]);
  }

  async getConversation(projectPath: string): AsyncResult<Conversation> {
    const prompts = this.conversations.get(projectPath) || [];
    const conversation: Conversation = {
      projectPath,
      prompts: [...prompts],
      messageCount: prompts.length,
      startTime: prompts.length > 0 ? new Date(prompts[0].timestamp) : undefined,
      endTime: prompts.length > 0 ? new Date(prompts[prompts.length - 1].timestamp) : undefined
    };
    return Ok(conversation);
  }

  async getSessionPrompts(sessionId: string): AsyncResult<PromptEntry[]> {
    const allPrompts: PromptEntry[] = [];
    for (const prompts of this.conversations.values()) {
      allPrompts.push(...prompts.filter(p => p.sessionId === sessionId));
    }
    return Ok([...allPrompts]);
  }

  async getAllConversations(): AsyncResult<Conversation[]> {
    const conversations: Conversation[] = [];
    for (const [projectPath, prompts] of this.conversations.entries()) {
      const conversation: Conversation = {
        projectPath,
        prompts: [...prompts],
        messageCount: prompts.length,
        startTime: prompts.length > 0 ? new Date(prompts[0].timestamp) : undefined,
        endTime: prompts.length > 0 ? new Date(prompts[prompts.length - 1].timestamp) : undefined
      };
      conversations.push(conversation);
    }
    return Ok(conversations);
  }

  async getChatStatistics(projectPath: string): AsyncResult<ChatStatistics> {
    const prompts = this.conversations.get(projectPath) || [];
    const userMessages = prompts.filter(p => p.message.role === 'user').length;
    const assistantMessages = prompts.filter(p => p.message.role === 'assistant').length;
    const systemMessages = prompts.filter(p => p.message.role === 'system').length;

    const totalLength = prompts.reduce((sum, p) => sum + p.message.content.length, 0);
    const averageLength = prompts.length > 0 ? totalLength / prompts.length : 0;

    const uniqueSessions = new Set(prompts.map(p => p.sessionId)).size;

    const timestamps = prompts.map(p => new Date(p.timestamp));
    const earliest = timestamps.length > 0 ? new Date(Math.min(...timestamps.map(d => d.getTime()))) : null;
    const latest = timestamps.length > 0 ? new Date(Math.max(...timestamps.map(d => d.getTime()))) : null;

    const stats: ChatStatistics = {
      totalMessages: prompts.length,
      userMessages,
      assistantMessages,
      systemMessages,
      averageMessageLength: averageLength,
      sessionsCount: uniqueSessions,
      dateRange: { earliest, latest }
    };

    return Ok(stats);
  }

  async searchPrompts(query: string, projectPath?: string): AsyncResult<PromptEntry[]> {
    const searchIn = projectPath
      ? [this.conversations.get(projectPath) || []]
      : Array.from(this.conversations.values());

    const results: PromptEntry[] = [];
    for (const prompts of searchIn) {
      results.push(...prompts.filter(p =>
        p.message.content.toLowerCase().includes(query.toLowerCase())
      ));
    }

    return Ok([...results]);
  }

  async hasPrompts(projectPath: string): AsyncResult<boolean> {
    const prompts = this.conversations.get(projectPath) || [];
    return Ok(prompts.length > 0);
  }

  getProjectsDirectoryPath(): string {
    return '/tmp/test-projects';
  }

  // Test helper methods
  addProjectPrompts(projectPath: string, prompts: PromptEntry[]): void {
    const existing = this.conversations.get(projectPath) || [];
    this.conversations.set(projectPath, [...existing, ...prompts]);
  }

  clear(): void {
    this.conversations.clear();
  }
}

describe('ChatHistoryViewModel', () => {
  let viewModel: ChatHistoryViewModel;
  let mockRepository: InMemoryChatRepository;

  beforeEach(() => {
    mockRepository = new InMemoryChatRepository();
    viewModel = new ChatHistoryViewModel(mockRepository);
  });

  describe('loadProjectPrompts', () => {
    it('should load prompts for a specific project', async () => {
      const projectPath = '/Users/doowell2/Source/repos/DT/Entropic';
      const result = await viewModel.loadProjectPrompts(projectPath);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(viewModel.getPrompts()).toHaveLength(result.value.length);
      }
    });

    it('should handle non-existent project gracefully', async () => {
      const result = await viewModel.loadProjectPrompts('/non/existent/project');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toHaveLength(0);
        expect(viewModel.getPrompts()).toHaveLength(0);
      }
    });

    it('should handle repository errors gracefully', async () => {
      mockRepository.getProjectPrompts = async () => ({
        success: false,
        error: 'Repository connection failed'
      });

      const result = await viewModel.loadProjectPrompts('/test/project');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Repository connection failed');
      expect(viewModel.hasError()).toBe(true);
      expect(viewModel.getError()).toBe('Repository connection failed');
    });

    it('should set loading state during operation', async () => {
      expect(viewModel.isLoading()).toBe(false);
      
      const loadPromise = viewModel.loadProjectPrompts('/test/project');
      expect(viewModel.isLoading()).toBe(true);
      
      await loadPromise;
      expect(viewModel.isLoading()).toBe(false);
    });

    it('should clear previous prompts when loading new project', async () => {
      await viewModel.loadProjectPrompts('/Users/doowell2/Source/repos/DT/Entropic');
      const firstCount = viewModel.getPrompts().length;
      expect(firstCount).toBeGreaterThan(0);
      
      await viewModel.loadProjectPrompts('/Users/doowell2/Source/repos/DT/MacroN');
      const secondPrompts = viewModel.getPrompts();
      
      // Should have different prompts now
      expect(secondPrompts.every(p => 
        p.message.content.includes('GARCH') || p.message.content.includes('F#')
      )).toBe(true);
    });
  });

  describe('conversation management', () => {
    beforeEach(async () => {
      await viewModel.loadProjectPrompts('/Users/doowell2/Source/repos/DT/Entropic');
    });

    it('should get current conversation', () => {
      const conversation = viewModel.getCurrentConversation();
      
      expect(conversation).not.toBeNull();
      expect(conversation?.projectPath).toBe('/Users/doowell2/Source/repos/DT/Entropic');
      expect(conversation?.messageCount).toBeGreaterThan(0);
    });

    it('should load all conversations', async () => {
      const result = await viewModel.loadAllConversations();
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(viewModel.getAllConversations()).toHaveLength(result.value.length);
      }
    });

    it('should get conversation for specific project', async () => {
      await viewModel.loadAllConversations();
      const conversation = viewModel.getConversationForProject('/Users/doowell2/Source/repos/DT/MacroN');
      
      expect(conversation).not.toBeNull();
      expect(conversation?.projectPath).toBe('/Users/doowell2/Source/repos/DT/MacroN');
    });
  });

  describe('prompt access methods', () => {
    beforeEach(async () => {
      await viewModel.loadProjectPrompts('/Users/doowell2/Source/repos/DT/Entropic');
    });

    it('should return immutable prompts array', () => {
      const prompts1 = viewModel.getPrompts();
      const prompts2 = viewModel.getPrompts();
      
      expect(prompts1).not.toBe(prompts2); // Different array references
      expect(prompts1).toEqual(prompts2); // Same content
    });

    it('should filter prompts by role', () => {
      const userPrompts = viewModel.getPromptsByRole('user');
      const assistantPrompts = viewModel.getPromptsByRole('assistant');
      
      expect(userPrompts.every(p => p.message.role === 'user')).toBe(true);
      expect(assistantPrompts.every(p => p.message.role === 'assistant')).toBe(true);
      expect(userPrompts.length).toBeGreaterThan(0);
      expect(assistantPrompts.length).toBeGreaterThan(0);
    });

    it('should filter prompts by session', () => {
      const sessionId = 'session-abc-123';
      const sessionPrompts = viewModel.getPromptsBySession(sessionId);
      
      expect(sessionPrompts.every(p => p.sessionId === sessionId)).toBe(true);
      expect(sessionPrompts.length).toBeGreaterThan(0);
    });

    it('should get prompts sorted by date', () => {
      const sortedAsc = viewModel.getPromptsSortedByDate('asc');
      const sortedDesc = viewModel.getPromptsSortedByDate('desc');
      
      // Check ascending order
      for (let i = 0; i < sortedAsc.length - 1; i++) {
        const time1 = new Date(sortedAsc[i].timestamp).getTime();
        const time2 = new Date(sortedAsc[i + 1].timestamp).getTime();
        expect(time1).toBeLessThanOrEqual(time2);
      }
      
      // Check descending order
      for (let i = 0; i < sortedDesc.length - 1; i++) {
        const time1 = new Date(sortedDesc[i].timestamp).getTime();
        const time2 = new Date(sortedDesc[i + 1].timestamp).getTime();
        expect(time1).toBeGreaterThanOrEqual(time2);
      }
    });
  });

  describe('search functionality', () => {
    beforeEach(async () => {
      await viewModel.loadAllConversations();
    });

    it('should search prompts by content', async () => {
      const result = await viewModel.searchPrompts('MVVM');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value.every(p => 
          p.message.content.toLowerCase().includes('mvvm')
        )).toBe(true);
      }
    });

    it('should search within specific project', async () => {
      const projectPath = '/Users/doowell2/Source/repos/DT/Entropic';
      const result = await viewModel.searchPromptsInProject('refactor', projectPath);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.every(p => 
          p.message.content.toLowerCase().includes('refactor')
        )).toBe(true);
      }
    });

    it('should handle empty search results', async () => {
      const result = await viewModel.searchPrompts('nonexistentterm12345');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toHaveLength(0);
      }
    });
  });

  describe('statistics', () => {
    beforeEach(async () => {
      await viewModel.loadProjectPrompts('/Users/doowell2/Source/repos/DT/Entropic');
    });

    it('should calculate chat statistics', async () => {
      const stats = await viewModel.getStatistics();
      
      expect(stats.success).toBe(true);
      if (stats.success) {
        expect(stats.value.totalMessages).toBeGreaterThan(0);
        expect(stats.value.userMessages).toBeGreaterThan(0);
        expect(stats.value.assistantMessages).toBeGreaterThan(0);
        expect(stats.value.averageMessageLength).toBeGreaterThan(0);
        expect(stats.value.sessionsCount).toBeGreaterThan(0);
        expect(stats.value.dateRange.earliest).not.toBeNull();
        expect(stats.value.dateRange.latest).not.toBeNull();
      }
    });

    it('should return empty statistics for project without prompts', async () => {
      await viewModel.loadProjectPrompts('/empty/project');
      const stats = await viewModel.getStatistics();
      
      expect(stats.success).toBe(true);
      if (stats.success) {
        expect(stats.value.totalMessages).toBe(0);
        expect(stats.value.userMessages).toBe(0);
        expect(stats.value.assistantMessages).toBe(0);
        expect(stats.value.averageMessageLength).toBe(0);
        expect(stats.value.sessionsCount).toBe(0);
      }
    });

    it('should count unique sessions', () => {
      const sessionCount = viewModel.getUniqueSessionCount();
      expect(sessionCount).toBeGreaterThan(0);
    });

    it('should get prompt count', () => {
      const count = viewModel.getPromptCount();
      expect(count).toBe(viewModel.getPrompts().length);
    });
  });

  describe('sorting and filtering', () => {
    beforeEach(async () => {
      await viewModel.loadProjectPrompts('/Users/doowell2/Source/repos/DT/Entropic');
    });

    it('should set and get sort order', () => {
      expect(viewModel.getSortOrder()).toBe('asc'); // Default
      
      viewModel.setSortOrder('desc');
      expect(viewModel.getSortOrder()).toBe('desc');
      
      const prompts = viewModel.getPrompts();
      // Should be sorted in descending order
      for (let i = 0; i < prompts.length - 1; i++) {
        const time1 = new Date(prompts[i].timestamp).getTime();
        const time2 = new Date(prompts[i + 1].timestamp).getTime();
        expect(time1).toBeGreaterThanOrEqual(time2);
      }
    });

    it('should check if project has prompts', async () => {
      const hasPrompts = await viewModel.projectHasPrompts('/Users/doowell2/Source/repos/DT/Entropic');
      
      expect(hasPrompts.success).toBe(true);
      if (hasPrompts.success) {
        expect(hasPrompts.value).toBe(true);
      }
    });
  });

  describe('error handling', () => {
    it('should track and clear errors', async () => {
      expect(viewModel.hasError()).toBe(false);
      expect(viewModel.getError()).toBe(null);
      
      // Force an error
      mockRepository.getProjectPrompts = async () => ({
        success: false,
        error: 'Test error'
      });

      await viewModel.loadProjectPrompts('/test');
      
      expect(viewModel.hasError()).toBe(true);
      expect(viewModel.getError()).toBe('Test error');
      
      // Clear error
      viewModel.clearError();
      expect(viewModel.hasError()).toBe(false);
      expect(viewModel.getError()).toBe(null);
    });
  });

  describe('refresh functionality', () => {
    it('should reload current project prompts', async () => {
      const projectPath = '/Users/doowell2/Source/repos/DT/Entropic';
      await viewModel.loadProjectPrompts(projectPath);
      const initialCount = viewModel.getPromptCount();
      
      // Add new prompts to repository
      mockRepository.addProjectPrompts(projectPath, [{
        timestamp: new Date().toISOString(),
        message: { role: 'user', content: 'New test prompt' },
        sessionId: 'new-session',
        uuid: 'new-uuid'
      }]);
      
      const result = await viewModel.refresh();
      
      expect(result.success).toBe(true);
      expect(viewModel.getPromptCount()).toBe(initialCount + 1);
    });
  });

  describe('edge cases', () => {
    it('should handle empty repository', async () => {
      const emptyRepository = new InMemoryChatRepository(new Map());
      const emptyViewModel = new ChatHistoryViewModel(emptyRepository);

      const result = await emptyViewModel.loadAllConversations();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toHaveLength(0);
      }
    });

    it('should handle prompts with same timestamp', async () => {
      const sameTime = new Date().toISOString();
      const prompts: PromptEntry[] = [
        {
          timestamp: sameTime,
          message: { role: 'user', content: 'First' },
          sessionId: 'session-1',
          uuid: 'uuid-1'
        },
        {
          timestamp: sameTime,
          message: { role: 'assistant', content: 'Second' },
          sessionId: 'session-1',
          uuid: 'uuid-2'
        }
      ];
      
      const testRepo = new InMemoryChatRepository(new Map([
        ['/test/project', prompts]
      ]));
      const testViewModel = new ChatHistoryViewModel(testRepo);
      
      await testViewModel.loadProjectPrompts('/test/project');
      
      expect(testViewModel.getPromptCount()).toBe(2);
      const sorted = testViewModel.getPromptsSortedByDate('asc');
      expect(sorted).toHaveLength(2);
    });
  });
});