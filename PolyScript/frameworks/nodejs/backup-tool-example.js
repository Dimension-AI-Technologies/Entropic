#!/usr/bin/env node

/*
 * Example: Backup Tool using PolyScript Node.js Framework
 *
 * This demonstrates how the Node.js PolyScript framework eliminates boilerplate.
 * Shows both class-based and functional approaches with async/await support.
 *
 * Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
 */

const fs = require('fs').promises;
const path = require('path');
const { PolyScriptTool, runPolyScriptTool, polyscriptTool, PolyScriptError } = require('./polyscript-framework');

/**
 * Full-featured backup tool using class approach
 */
class BackupTool extends PolyScriptTool {
  constructor(sourcePath = '/source', destPath = '/dest', overwrite = false) {
    super();
    this.sourcePath = sourcePath;
    this.destPath = destPath;
    this.overwrite = overwrite;
  }

  get description() {
    return `PolyScript-compliant backup tool with zero boilerplate

Backs up directories with full PolyScript mode support.
Provides status checking, dry-run testing, dependency validation,
and live backup operations.`;
  }

  addArguments(yargs) {
    return yargs
      .option('source', {
        type: 'string',
        default: '/source',
        description: 'Source directory to backup'
      })
      .option('dest', {
        type: 'string', 
        default: '/dest',
        description: 'Destination directory'
      })
      .option('overwrite', {
        type: 'boolean',
        default: false,
        description: 'Overwrite existing destination'
      });
  }

  async status(context) {
    context.log('Checking backup status...');

    const sourceInfo = await this.getDirectoryInfo(this.sourcePath);
    const destInfo = await this.getDirectoryInfo(this.destPath);

    return {
      source: {
        path: this.sourcePath,
        exists: sourceInfo.exists,
        size_bytes: sourceInfo.size,
        file_count: sourceInfo.files
      },
      destination: {
        path: this.destPath,
        exists: destInfo.exists,
        size_bytes: destInfo.size,
        would_overwrite: destInfo.exists && !this.overwrite
      },
      backup_needed: sourceInfo.exists && (!destInfo.exists || this.overwrite)
    };
  }

  async test(context) {
    context.log('Planning backup operations...');

    const sourceInfo = await this.getDirectoryInfo(this.sourcePath);
    const destInfo = await this.getDirectoryInfo(this.destPath);

    if (!sourceInfo.exists) {
      context.output('Source directory does not exist', true);
      throw new PolyScriptError('Source directory does not exist');
    }

    const operations = [];

    if (destInfo.exists && !this.overwrite) {
      operations.push({
        operation: 'skip',
        reason: 'destination exists and overwrite not specified',
        source: this.sourcePath,
        destination: this.destPath
      });
    } else {
      operations.push({
        operation: 'backup',
        source: this.sourcePath,
        destination: this.destPath,
        file_count: sourceInfo.files,
        size_bytes: sourceInfo.size,
        would_overwrite: destInfo.exists
      });
    }

    return {
      planned_operations: operations,
      total_files: sourceInfo.files,
      total_size: sourceInfo.size,
      note: 'No changes made in test mode'
    };
  }

  async sandbox(context) {
    context.log('Testing backup environment...');

    const tests = {
      source_readable: await this.testSourceReadable(),
      destination_writable: await this.testDestinationWritable(),
      sufficient_space: await this.testSufficientSpace(),
      filesystem_access: await this.testFilesystemAccess()
    };

    const allPassed = Object.values(tests).every(status => status === 'passed');

    return {
      dependency_tests: tests,
      all_passed: allPassed
    };
  }

  async live(context) {
    context.log('Preparing backup execution...');

    const sourceInfo = await this.getDirectoryInfo(this.sourcePath);
    if (!sourceInfo.exists) {
      context.output('Source directory does not exist', true);
      throw new PolyScriptError('Source directory does not exist');
    }

    const destInfo = await this.getDirectoryInfo(this.destPath);
    if (destInfo.exists && !this.overwrite) {
      if (!await context.confirm(`Destination ${this.destPath} exists. Overwrite?`)) {
        return { status: 'cancelled' };
      }
    }

    context.log(`Starting backup from ${this.sourcePath} to ${this.destPath}`);

    try {
      // Simulate backup operation
      // In real implementation: 
      // if (destInfo.exists) await fs.rm(this.destPath, { recursive: true });
      // await fs.cp(this.sourcePath, this.destPath, { recursive: true });

      // For demo, just simulate with delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      context.log('Backup operation completed (simulated)');

      const resultInfo = await this.getDirectoryInfo(this.destPath);

      return {
        operation: 'backup_completed',
        source: this.sourcePath,
        destination: this.destPath,
        files_copied: resultInfo.files,
        bytes_copied: resultInfo.size
      };

    } catch (error) {
      throw new PolyScriptError(`Backup failed: ${error.message}`);
    }
  }

  // Helper methods - pure business logic
  async getDirectoryInfo(dirPath) {
    try {
      const stat = await fs.stat(dirPath);
      if (!stat.isDirectory()) {
        return { exists: false, size: 0, files: 0 };
      }

      let totalSize = 0;
      let fileCount = 0;

      const items = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item.name);
        
        if (item.isFile()) {
          fileCount++;
          try {
            const fileStat = await fs.stat(itemPath);
            totalSize += fileStat.size;
          } catch (error) {
            // Skip files we can't access
          }
        } else if (item.isDirectory()) {
          const subInfo = await this.getDirectoryInfo(itemPath);
          totalSize += subInfo.size;
          fileCount += subInfo.files;
        }
      }

      return { exists: true, size: totalSize, files: fileCount };

    } catch (error) {
      return { exists: false, size: 0, files: 0 };
    }
  }

  async testSourceReadable() {
    try {
      await fs.access(this.sourcePath, fs.constants.R_OK);
      return 'passed';
    } catch (error) {
      return 'failed';
    }
  }

  async testDestinationWritable() {
    try {
      const destDir = path.dirname(this.destPath);
      await fs.access(destDir, fs.constants.W_OK);
      return 'passed';
    } catch (error) {
      return 'failed';
    }
  }

  async testSufficientSpace() {
    try {
      const sourceInfo = await this.getDirectoryInfo(this.sourcePath);
      if (!sourceInfo.exists) return 'unknown';

      // Simplified space check - in real implementation, check disk space
      const destDir = path.dirname(this.destPath);
      await fs.access(destDir);
      
      // Assume sufficient space for demo
      return sourceInfo.size < 1000000000 ? 'passed' : 'failed';
    } catch (error) {
      return 'error';
    }
  }

  async testFilesystemAccess() {
    try {
      const tempFile = path.join(require('os').tmpdir(), '.polyscript_test');
      await fs.writeFile(tempFile, 'test');
      await fs.unlink(tempFile);
      return 'passed';
    } catch (error) {
      return 'failed';
    }
  }
}

/**
 * Simple tool using functional approach
 */
const SimpleTool = polyscriptTool('Simple backup tool demonstrating functional approach', {
  status: async (context) => {
    context.log('Simple status check...');
    return {
      operational: true,
      ready: true
    };
  },

  test: async (context) => {
    context.log('Simple test mode...');
    return {
      would_backup: ['file1', 'file2'],
      note: 'No changes made in test mode'
    };
  },

  sandbox: async (context) => {
    context.log('Simple sandbox test...');
    return {
      environment: 'ok',
      all_passed: true
    };
  },

  live: async (context) => {
    context.log('Simple live execution...');
    if (await context.confirm('Execute backup?')) {
      return {
        backup_completed: true,
        files_backed_up: 42
      };
    }
    return { status: 'cancelled' };
  },

  addArguments: (yargs) => {
    return yargs.option('simple', {
      type: 'boolean',
      description: 'Simple mode flag'
    });
  }
});

/**
 * Async/await demonstration tool
 */
class AsyncTool extends PolyScriptTool {
  get description() {
    return 'Tool demonstrating async/await patterns';
  }

  async status(context) {
    context.log('Async status check...');
    
    // Simulate async operations
    const promises = [
      this.checkService('database'),
      this.checkService('api'),
      this.checkService('cache')
    ];

    const results = await Promise.all(promises);
    
    return {
      services: results.reduce((acc, result, index) => {
        const services = ['database', 'api', 'cache'];
        acc[services[index]] = result;
        return acc;
      }, {}),
      all_healthy: results.every(r => r === 'healthy')
    };
  }

  async test(context) {
    context.log('Async test operations...');
    
    // Sequential async operations
    const steps = [];
    for (let i = 1; i <= 3; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      steps.push(`Step ${i} completed`);
      context.log(`Completed step ${i}`, 'debug');
    }

    return {
      test_steps: steps,
      duration_ms: 300
    };
  }

  async sandbox(context) {
    return { async_support: 'available' };
  }

  async live(context) {
    if (await context.confirm('Run async operations?')) {
      const startTime = Date.now();
      await new Promise(resolve => setTimeout(resolve, 500));
      const duration = Date.now() - startTime;
      
      return {
        operation: 'async_completed',
        duration_ms: duration
      };
    }
    return { status: 'cancelled' };
  }

  async checkService(serviceName) {
    // Simulate service check
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    return Math.random() > 0.1 ? 'healthy' : 'unhealthy';
  }
}

// Main execution - choose which tool to run
async function main() {
  const toolType = process.env.TOOL_TYPE || 'backup';
  
  let tool;
  switch (toolType) {
    case 'simple':
      tool = new SimpleTool();
      break;
    case 'async':
      tool = new AsyncTool();
      break;
    case 'backup':
    default:
      tool = new BackupTool();
      break;
  }

  await runPolyScriptTool(tool);
}

// Export for testing
module.exports = { BackupTool, SimpleTool, AsyncTool };

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

/*
 * PACKAGE.JSON:
 * {
 *   "name": "backup-tool",
 *   "version": "1.0.0",
 *   "description": "PolyScript-compliant backup tool",
 *   "main": "backup-tool-example.js",
 *   "bin": {
 *     "backup-tool": "./backup-tool-example.js"
 *   },
 *   "dependencies": {
 *     "yargs": "^17.7.2"
 *   },
 *   "engines": {
 *     "node": ">=14.0.0"
 *   }
 * }
 *
 * USAGE EXAMPLES:
 * npm install yargs
 * node backup-tool-example.js status
 * node backup-tool-example.js test --verbose
 * node backup-tool-example.js sandbox --json  
 * node backup-tool-example.js live --force
 * node backup-tool-example.js status --source /home/docs --dest /backup --overwrite
 * 
 * # Test different tools
 * TOOL_TYPE=simple node backup-tool-example.js status
 * TOOL_TYPE=async node backup-tool-example.js test --verbose
 *
 * # Global installation
 * npm install -g
 * backup-tool status --json
 *
 * The framework automatically provides:
 * - All CLI argument parsing and validation with yargs
 * - Command routing for the four PolyScript modes
 * - --json, --verbose, --force standard flags
 * - PolyScript v1.0 JSON output formatting
 * - Error handling and exit codes
 * - Help text generation
 * - Confirmation prompts
 * - npm distribution and installation
 *
 * BENEFITS OF NODE.JS APPROACH:
 * - ZERO boilerplate code
 * - Universal language knowledge (every dev knows JavaScript)
 * - Excellent async/await support
 * - Massive npm ecosystem for integrations
 * - Native JSON handling
 * - Cross-platform by default
 * - Easy distribution via npm
 * - Rich debugging and development tools
 * 
 * NODE.JS-SPECIFIC ADVANTAGES:
 * - Event-driven architecture
 * - Non-blocking I/O operations
 * - Huge ecosystem of packages
 * - Easy HTTP/API integration
 * - Built-in module system
 * - Great for automation and build tools
 * - TypeScript compatibility
 * - Excellent developer tooling
 */