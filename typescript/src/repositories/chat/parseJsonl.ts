import fs from 'node:fs/promises';
import { Ok, Err, ResultUtils, type AsyncResult } from '../../utils/Result.js';
import type { PromptEntry } from '../../models/Chat.js';

export async function loadPromptsFromFile(filePath: string): AsyncResult<PromptEntry[]> {
  const contentResult = await ResultUtils.fromPromise(fs.readFile(filePath, 'utf-8'));
  if (!contentResult.success) {
    return Err(`Failed to read file ${filePath}: ${contentResult.error}`);
  }

  const lines = contentResult.value.trim().split('\n').filter((line) => line.trim());
  const prompts: PromptEntry[] = [];

  for (const line of lines) {
    const parseResult = await ResultUtils.fromPromise(Promise.resolve(JSON.parse(line)));
    if (parseResult.success) {
      const parsed = parseResult.value;
      if (parsed && parsed.timestamp && parsed.message && parsed.sessionId) {
        prompts.push({
          timestamp: parsed.timestamp,
          message: {
            role: parsed.message.role || 'user',
            content: String(parsed.message.content || ''),
            timestamp: parsed.message.timestamp ? new Date(parsed.message.timestamp) : undefined,
          },
          sessionId: parsed.sessionId,
          uuid: parsed.uuid || `generated-${Date.now()}-${Math.random()}`,
        });
      }
    } else {
      console.warn(`Skipping invalid JSONL line in ${filePath}:`, parseResult.error);
    }
  }

  return Ok(prompts);
}

