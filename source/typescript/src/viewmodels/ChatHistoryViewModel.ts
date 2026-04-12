// EXEMPTION: exceptions - ViewModel getters and utilities don't need Result<T>
import { IChatRepository, PromptEntry, Conversation, ChatStatistics } from '../models/Chat';
import { AsyncResult, Ok, Err } from '../utils/Result';

/**
 * ViewModel for Chat/Prompt History management
 * Orchestrates chat data and provides UI-friendly methods
 */
export class ChatHistoryViewModel {
  private prompts: PromptEntry[] = [];
  private conversations: Conversation[] = [];
  private currentProjectPath: string | null = null;
  private loading = false;
  private error: string | null = null;
  private sortOrder: 'asc' | 'desc' = 'asc';

  constructor(private chatRepository: IChatRepository) {}

  /**
   * Load prompts for a specific project
   */
  async loadProjectPrompts(projectPath: string): AsyncResult<PromptEntry[]> {
    this.loading = true;
    this.error = null;
    this.currentProjectPath = projectPath;

    const result = await this.chatRepository.getProjectPrompts(projectPath);
    
    if (result.success) {
      this.prompts = this.sortPrompts(result.value);
      this.loading = false;
      return Ok(this.prompts);
    } else {
      this.error = result.error;
      this.loading = false;
      this.prompts = [];
      return result;
    }
  }

  /**
   * Load all conversations across all projects
   */
  async loadAllConversations(): AsyncResult<Conversation[]> {
    this.loading = true;
    this.error = null;

    const result = await this.chatRepository.getAllConversations();
    
    if (result.success) {
      this.conversations = result.value;
      this.loading = false;
      return Ok(this.conversations);
    } else {
      this.error = result.error;
      this.loading = false;
      return result;
    }
  }

  /**
   * Get all loaded prompts
   * @no-result-needed Simple getter returning cached data
   */
  getPrompts(): PromptEntry[] { // EXEMPTION: simple getter returning cached data
    return [...this.prompts]; // Return copy to prevent mutation
  }

  /**
   * Get prompts filtered by role
   */
  getPromptsByRole(role: 'user' | 'assistant' | 'system'): PromptEntry[] {
    return this.prompts.filter(p => p.message.role === role);
  }

  /**
   * Get prompts filtered by session
   */
  getPromptsBySession(sessionId: string): PromptEntry[] {
    return this.prompts.filter(p => p.sessionId === sessionId);
  }

  /**
   * Get prompts sorted by date
   */
  getPromptsSortedByDate(order: 'asc' | 'desc'): PromptEntry[] {
    const sorted = [...this.prompts];
    sorted.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return order === 'asc' ? timeA - timeB : timeB - timeA;
    });
    return sorted;
  }

  /**
   * Get current conversation
   * @no-result-needed Simple getter returning cached data
   */
  getCurrentConversation(): Conversation | null { // EXEMPTION: simple getter returning computed data
    if (!this.currentProjectPath || this.prompts.length === 0) {
      return null;
    }

    return {
      projectPath: this.currentProjectPath,
      prompts: [...this.prompts],
      startTime: new Date(this.prompts[0].timestamp),
      endTime: new Date(this.prompts[this.prompts.length - 1].timestamp),
      messageCount: this.prompts.length
    };
  }

  /**
   * Get all loaded conversations
   */
  getAllConversations(): Conversation[] {
    return [...this.conversations];
  }

  /**
   * Get conversation for specific project
   */
  getConversationForProject(projectPath: string): Conversation | null {
    return this.conversations.find(c => c.projectPath === projectPath) || null;
  }

  /**
   * Search prompts by content
   */
  async searchPrompts(query: string): AsyncResult<PromptEntry[]> {
    const result = await this.chatRepository.searchPrompts(query);
    
    if (result.success) {
      return Ok(result.value);
    } else {
      this.error = result.error;
      return result;
    }
  }

  /**
   * Search prompts within a specific project
   */
  async searchPromptsInProject(query: string, projectPath: string): AsyncResult<PromptEntry[]> {
    const result = await this.chatRepository.searchPrompts(query, projectPath);
    
    if (result.success) {
      return Ok(result.value);
    } else {
      this.error = result.error;
      return result;
    }
  }

  /**
   * Get chat statistics for current project
   */
  async getStatistics(): AsyncResult<ChatStatistics> {
    if (!this.currentProjectPath) {
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

    const result = await this.chatRepository.getChatStatistics(this.currentProjectPath);
    if (!result.success) {
      this.error = result.error;
    }
    return result;
  }

  /**
   * Check if a project has prompts
   */
  async projectHasPrompts(projectPath: string): AsyncResult<boolean> {
    const result = await this.chatRepository.hasPrompts(projectPath);
    if (!result.success) {
      this.error = result.error;
    }
    return result;
  }

  /**
   * Get count of unique sessions in current prompts
   */
  getUniqueSessionCount(): number {
    const sessions = new Set(this.prompts.map(p => p.sessionId));
    return sessions.size;
  }

  /**
   * Get total prompt count
   */
  getPromptCount(): number {
    return this.prompts.length;
  }

  /**
   * Get current sort order
   */
  getSortOrder(): 'asc' | 'desc' {
    return this.sortOrder;
  }

  /**
   * Set sort order and re-sort prompts
   */
  setSortOrder(order: 'asc' | 'desc'): void {
    this.sortOrder = order;
    this.prompts = this.sortPrompts(this.prompts);
  }

  /**
   * Check if currently loading
   */
  isLoading(): boolean {
    return this.loading;
  }

  /**
   * Check if there's an error
   */
  hasError(): boolean {
    return this.error !== null;
  }

  /**
   * Get current error (if any)
   */
  getError(): string | null {
    return this.error;
  }

  /**
   * Clear current error
   */
  clearError(): void {
    this.error = null;
  }

  /**
   * Refresh current project prompts
   */
  async refresh(): AsyncResult<PromptEntry[]> {
    if (!this.currentProjectPath) {
      return Err('No project loaded to refresh');
    }
    return this.loadProjectPrompts(this.currentProjectPath);
  }

  // Private helper methods

  /**
   * @no-result-needed Pure function that cannot fail
   */
  private sortPrompts(prompts: PromptEntry[]): PromptEntry[] { // EXEMPTION: simple array sorting utility
    const sorted = [...prompts];
    sorted.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return this.sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });
    return sorted;
  }
}