import type { IpcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { Ok, Err, ResultUtils } from '../../utils/Result.js';
import { PathUtils } from '../../utils/PathUtils.js';

export function registerChatIpc(ipcMain: IpcMain) {
  ipcMain.handle('get-project-prompts', async (_event: any, projectPath: string) => {
    console.log(`Getting project prompts for: ${projectPath}`);
    const findResult = await PathUtils.findProjectDirectory(projectPath);
    if (!findResult.success || !findResult.value.found || !findResult.value.projectDir) {
      console.log(`No project directory found for: ${projectPath}`);
      return Ok([]);
    }
    const projectDir = findResult.value.projectDir;
    console.log(`Found project directory: ${projectDir}`);
    console.log(`Looking for JSONL files in: ${projectDir}`);
    const filesResult = await ResultUtils.fromPromise(fs.readdir(projectDir));
    if (!filesResult.success) {
      const errorMsg = `Error reading project directory: ${filesResult.error}`;
      console.error(errorMsg);
      return Err(errorMsg, filesResult.details);
    }
    const jsonlFiles = filesResult.value.filter((file) => file.endsWith('.jsonl')).sort();
    console.log(`Found ${jsonlFiles.length} JSONL files`);
    const prompts: any[] = [];
    let totalLines = 0;
    const fileErrors: string[] = [];
    for (let i = 0; i < jsonlFiles.length; i++) {
      const file = jsonlFiles[i];
      const filePath = path.join(projectDir, file);
      const contentResult = await ResultUtils.fromPromise(fs.readFile(filePath, 'utf-8'));
      if (!contentResult.success) {
        const errorMsg = `Error reading file ${file}: ${contentResult.error}`;
        console.error(errorMsg);
        fileErrors.push(errorMsg);
        continue;
      }
      const lines = contentResult.value.split('\n').filter((line) => line.trim());
      totalLines += lines.length;
      for (let j = 0; j < lines.length; j++) {
        const line = lines[j];
        const parseResult = await ResultUtils.fromPromise(Promise.resolve(JSON.parse(line)));
        if (parseResult.success) {
          const entry = parseResult.value;
          if ((entry.type === 'user' && entry.message?.role === 'user') ||
              (entry.type === 'assistant' && entry.message?.role === 'assistant')) {
            prompts.push({
              timestamp: entry.timestamp || new Date().toISOString(),
              message: {
                role: entry.message.role,
                content: entry.message.content
                  ? entry.message.content.length > 1000
                    ? entry.message.content.substring(0, 1000) + '...'
                    : entry.message.content
                  : '',
              },
              sessionId: entry.sessionId || 'unknown',
              uuid: entry.uuid || `${file}-${j}-${Date.now()}`,
            });
          }
        }
      }
    }
    console.log(`Extracted ${prompts.length} prompts from ${totalLines} total lines`);
    if (fileErrors.length > 0 && prompts.length === 0) {
      return Err(`Failed to read any prompts: ${fileErrors.join('; ')}`);
    }
    return Ok(prompts);
  });
}

