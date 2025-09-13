import { describe, it, expect, beforeEach } from '@jest/globals';
import { ChatHistoryViewModel } from '../viewmodels/ChatHistoryViewModel';
import { MockChatRepository } from '../repositories/MockChatRepository';
import { PromptEntry } from '../models/Chat';

describe('ChatHistoryViewModel', () => {
  let viewModel: ChatHistoryViewModel;
  let mockRepository: MockChatRepository;

  beforeEach(() => {
    mockRepository = new MockChatRepository();
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
      const emptyRepository = new MockChatRepository(new Map());
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
      
      const testRepo = new MockChatRepository(new Map([
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