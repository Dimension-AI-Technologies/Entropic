import fs from 'node:fs/promises';
import path from 'node:path';
import { Result, ResultUtils } from './Result.js';

export interface Todo {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  activeForm?: string;
  id?: string;
  created?: Date;
}

export class TodoManager {
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  // Read todos from file
  async readTodos(): Promise<Result<Todo[]>> {
    const fileExists = await this.fileExists();
    if (!fileExists) {
      return ResultUtils.ok([]);
    }

    const readResult = await ResultUtils.fromPromise(
      fs.readFile(this.filePath, 'utf-8')
    );
    if (!readResult.success) {
      return ResultUtils.fail(`Failed to read file: ${readResult.error}`, readResult.details);
    }
    
    // Handle empty file
    if (!readResult.value.trim()) {
      return ResultUtils.ok([]);
    }

    // Parse with protection against synchronous JSON.parse exceptions
    let parsed: any;
    try {
      parsed = JSON.parse(readResult.value);
    } catch (e: any) {
      return ResultUtils.fail(`Failed to parse JSON: ${e?.message || String(e)}`);
    }
    
    if (!Array.isArray(parsed)) {
      return ResultUtils.fail('File does not contain a valid todo array');
    }

    // Validate each todo
    for (const todo of parsed) {
      if (!this.isValidTodo(todo)) {
        return ResultUtils.fail('Invalid todo structure in file');
      }
    }

    return ResultUtils.ok(parsed);
  }

  // Write todos to file
  async writeTodos(todos: Todo[]): Promise<Result<void>> {
    // Validate all todos before writing
    for (const todo of todos) {
      if (!this.isValidTodo(todo)) {
        return ResultUtils.fail('Invalid todo structure');
      }
    }

    // Ensure directory exists
    const dir = path.dirname(this.filePath);
    const mkdirResult = await ResultUtils.fromPromise(
      fs.mkdir(dir, { recursive: true })
    );
    if (!mkdirResult.success) {
      return ResultUtils.fail(`Failed to create directory: ${mkdirResult.error}`, mkdirResult.details);
    }

    // Write with proper formatting
    const writeResult = await ResultUtils.fromPromise(
      fs.writeFile(this.filePath, JSON.stringify(todos, null, 2), 'utf-8')
    );
    if (!writeResult.success) {
      return ResultUtils.fail(`Failed to write file: ${writeResult.error}`, writeResult.details);
    }
    
    return ResultUtils.ok(undefined);
  }

  // Add a new todo
  async addTodo(todo: Todo): Promise<Result<Todo[]>> {
    const readResult = await this.readTodos();
    if (!ResultUtils.isSuccess(readResult)) {
      return readResult;
    }

    const todos = readResult.value;
    
    // Add created timestamp if not present
    const newTodo: Todo = {
      ...todo,
      created: todo.created || new Date(),
      id: todo.id || this.generateId()
    };

    todos.push(newTodo);

    const writeResult = await this.writeTodos(todos);
    if (!ResultUtils.isSuccess(writeResult)) {
      return ResultUtils.fail('Failed to save after adding todo');
    }

    return ResultUtils.ok(todos);
  }

  // Reorder todos
  async reorderTodos(fromIndex: number, toIndex: number): Promise<Result<Todo[]>> {
    const readResult = await this.readTodos();
    if (!ResultUtils.isSuccess(readResult)) {
      return readResult;
    }

    const todos = readResult.value;

    if (fromIndex < 0 || fromIndex >= todos.length) {
      return ResultUtils.fail(`Invalid fromIndex: ${fromIndex}`);
    }
    if (toIndex < 0 || toIndex >= todos.length) {
      return ResultUtils.fail(`Invalid toIndex: ${toIndex}`);
    }

    // Remove and reinsert
    const [movedTodo] = todos.splice(fromIndex, 1);
    todos.splice(toIndex, 0, movedTodo);

    const writeResult = await this.writeTodos(todos);
    if (!ResultUtils.isSuccess(writeResult)) {
      return ResultUtils.fail('Failed to save after reordering');
    }

    return ResultUtils.ok(todos);
  }

  // Rename a todo (update content)
  async renameTodo(index: number, newContent: string): Promise<Result<Todo[]>> {
    const readResult = await this.readTodos();
    if (!ResultUtils.isSuccess(readResult)) {
      return readResult;
    }

    const todos = readResult.value;

    if (index < 0 || index >= todos.length) {
      return ResultUtils.fail(`Invalid index: ${index}`);
    }

    if (!newContent || !newContent.trim()) {
      return ResultUtils.fail('Content cannot be empty');
    }

    todos[index] = {
      ...todos[index],
      content: newContent.trim()
    };

    const writeResult = await this.writeTodos(todos);
    if (!ResultUtils.isSuccess(writeResult)) {
      return ResultUtils.fail('Failed to save after renaming');
    }

    return ResultUtils.ok(todos);
  }

  // Delete a todo
  async deleteTodo(index: number): Promise<Result<Todo[]>> {
    const readResult = await this.readTodos();
    if (!ResultUtils.isSuccess(readResult)) {
      return readResult;
    }

    const todos = readResult.value;

    if (index < 0 || index >= todos.length) {
      return ResultUtils.fail(`Invalid index: ${index}`);
    }

    todos.splice(index, 1);

    const writeResult = await this.writeTodos(todos);
    if (!ResultUtils.isSuccess(writeResult)) {
      return ResultUtils.fail('Failed to save after deleting');
    }

    return ResultUtils.ok(todos);
  }

  // Delete the entire file
  async deleteFile(): Promise<Result<void>> {
    const exists = await this.fileExists();
    if (!exists) {
      return ResultUtils.ok(undefined);
    }

    const unlinkResult = await ResultUtils.fromPromise(fs.unlink(this.filePath));
    if (!unlinkResult.success) {
      return ResultUtils.fail(`Failed to delete file: ${unlinkResult.error}`, unlinkResult.details);
    }
    
    return ResultUtils.ok(undefined);
  }

  // Helper methods
  private async fileExists(): Promise<boolean> {
    const accessResult = await ResultUtils.fromPromise(fs.access(this.filePath));
    return accessResult.success;
  }

  private isValidTodo(todo: any): todo is Todo {
    return (
      todo &&
      typeof todo === 'object' &&
      typeof todo.content === 'string' &&
      ['pending', 'in_progress', 'completed'].includes(todo.status)
    );
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
