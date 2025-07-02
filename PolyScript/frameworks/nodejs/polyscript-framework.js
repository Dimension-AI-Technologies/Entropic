#!/usr/bin/env node

/*
 * PolyScript Framework for Node.js using yargs
 *
 * A true zero-boilerplate framework for creating PolyScript-compliant CLI tools.
 * Developers write ONLY business logic - the framework handles everything else.
 *
 * Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
 */

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const readline = require('readline');

/**
 * PolyScript execution modes
 */
const PolyScriptMode = {
  STATUS: 'status',
  TEST: 'test',
  SANDBOX: 'sandbox',
  LIVE: 'live'
};

/**
 * PolyScript context for tool execution
 */
class PolyScriptContext {
  constructor(mode, verbose = false, force = false, jsonOutput = false, toolName = 'PolyScriptTool') {
    this.mode = mode;
    this.verbose = verbose;
    this.force = force;
    this.jsonOutput = jsonOutput;
    this.toolName = toolName;
    this.outputData = {
      polyscript: '1.0',
      mode: mode,
      tool: toolName,
      status: 'success',
      data: {}
    };
  }

  /**
   * Log a message at the specified level
   */
  log(message, level = 'info') {
    if (this.jsonOutput) {
      // Route to JSON data structure
      let key;
      switch (level) {
        case 'error':
        case 'critical':
          key = 'errors';
          break;
        case 'warning':
          key = 'warnings';
          break;
        case 'info':
        case 'debug':
          if (this.verbose) {
            key = 'messages';
          }
          break;
      }

      if (key) {
        if (!this.outputData[key]) {
          this.outputData[key] = [];
        }
        this.outputData[key].push(`${level.toUpperCase()}: ${message}`);
      }
    } else {
      // Direct console output
      switch (level) {
        case 'error':
        case 'critical':
          console.error(`Error: ${message}`);
          break;
        case 'warning':
          console.error(`Warning: ${message}`);
          break;
        case 'info':
          console.log(message);
          break;
        case 'debug':
          if (this.verbose) {
            console.log(message);
          }
          break;
      }
    }
  }

  /**
   * Output data in appropriate format
   */
  output(data, isError = false) {
    if (this.jsonOutput) {
      if (typeof data === 'string') {
        const key = isError ? 'errors' : 'messages';
        if (!this.outputData[key]) {
          this.outputData[key] = [];
        }
        this.outputData[key].push(data);
      } else if (typeof data === 'object' && data !== null) {
        // Merge object properties into data section
        Object.assign(this.outputData.data, data);
      }
    } else {
      if (isError) {
        console.error(`Error: ${data}`);
      } else if (typeof data === 'string') {
        console.log(data);
      } else {
        console.log(JSON.stringify(data, null, 2));
      }
    }
  }

  /**
   * Ask for user confirmation
   */
  async confirm(message) {
    if (this.force) {
      return true;
    }

    if (this.jsonOutput) {
      this.output({ confirmation_required: message }, true);
      return false;
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question(`${message} [y/N]: `, (answer) => {
        rl.close();
        resolve(answer.toLowerCase().trim() === 'y');
      });
    });
  }

  /**
   * Finalize output (called at the end to output JSON if needed)
   */
  finalizeOutput() {
    if (this.jsonOutput) {
      console.log(JSON.stringify(this.outputData, null, 2));
    }
  }
}

/**
 * PolyScript error class
 */
class PolyScriptError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PolyScriptError';
  }
}

/**
 * Base class for PolyScript tools
 */
class PolyScriptTool {
  /**
   * Tool description for help text
   */
  get description() {
    throw new Error('Subclasses must implement description getter');
  }

  /**
   * Add tool-specific arguments to yargs
   */
  addArguments(yargs) {
    return yargs;
  }

  /**
   * Execute status mode (show current state)
   */
  async status(context) {
    throw new Error('Subclasses must implement status method');
  }

  /**
   * Execute test mode (simulate operations)
   */
  async test(context) {
    throw new Error('Subclasses must implement test method');
  }

  /**
   * Execute sandbox mode (test dependencies)
   */
  async sandbox(context) {
    throw new Error('Subclasses must implement sandbox method');
  }

  /**
   * Execute live mode (actual operations)
   */
  async live(context) {
    throw new Error('Subclasses must implement live method');
  }
}

/**
 * Run a PolyScript tool with yargs CLI handling
 */
async function runPolyScriptTool(tool) {
  const toolName = tool.constructor.name;

  // Create yargs instance
  let yargsInstance = yargs(hideBin(process.argv))
    .scriptName(toolName.toLowerCase())
    .description(tool.description)
    .help()
    .version('1.0.0');

  // Add global options
  yargsInstance = yargsInstance
    .option('verbose', {
      alias: 'v',
      type: 'boolean',
      description: 'Enable verbose output',
      global: true
    })
    .option('force', {
      alias: 'f',
      type: 'boolean',
      description: 'Skip confirmation prompts',
      global: true
    })
    .option('json', {
      type: 'boolean',
      description: 'Output in JSON format',
      global: true
    });

  // Let tool add custom arguments
  yargsInstance = tool.addArguments(yargsInstance);

  // Add mode commands
  const modeHandler = (mode) => {
    return {
      command: mode,
      describe: getModeDescription(mode),
      handler: async (argv) => {
        await executeMode(tool, mode, argv);
      }
    };
  };

  yargsInstance = yargsInstance
    .command(modeHandler(PolyScriptMode.STATUS))
    .command(modeHandler(PolyScriptMode.TEST))
    .command(modeHandler(PolyScriptMode.SANDBOX))
    .command(modeHandler(PolyScriptMode.LIVE))
    .command('$0', 'Default to status mode', {}, async (argv) => {
      await executeMode(tool, PolyScriptMode.STATUS, argv);
    });

  // Parse and execute
  yargsInstance.parse();
}

/**
 * Get description for a PolyScript mode
 */
function getModeDescription(mode) {
  switch (mode) {
    case PolyScriptMode.STATUS:
      return 'Show current state';
    case PolyScriptMode.TEST:
      return 'Simulate operations (dry-run)';
    case PolyScriptMode.SANDBOX:
      return 'Test dependencies and environment';
    case PolyScriptMode.LIVE:
      return 'Execute actual operations';
    default:
      return 'Unknown mode';
  }
}

/**
 * Execute a specific PolyScript mode
 */
async function executeMode(tool, mode, argv) {
  const toolName = tool.constructor.name;
  
  // Create context
  const context = new PolyScriptContext(
    mode,
    argv.verbose || false,
    argv.force || false,
    argv.json || false,
    toolName
  );

  context.log(`Executing ${mode} mode`, 'debug');

  try {
    // Execute appropriate method
    let result;
    switch (mode) {
      case PolyScriptMode.STATUS:
        result = await tool.status(context);
        break;
      case PolyScriptMode.TEST:
        result = await tool.test(context);
        break;
      case PolyScriptMode.SANDBOX:
        result = await tool.sandbox(context);
        break;
      case PolyScriptMode.LIVE:
        result = await tool.live(context);
        break;
      default:
        throw new PolyScriptError(`Unknown mode: ${mode}`);
    }

    // Handle result
    if (result !== undefined && result !== null) {
      context.output(result);
    }

    context.finalizeOutput();

  } catch (error) {
    context.outputData.status = 'error';
    context.output(error.message, true);
    
    if (context.verbose) {
      context.log(`Error details: ${error.stack}`, 'error');
    }

    context.finalizeOutput();
    process.exit(1);
  }
}

/**
 * Decorator function for creating PolyScript tools
 */
function polyscriptTool(description, methods) {
  return class extends PolyScriptTool {
    get description() {
      return description;
    }

    async status(context) {
      return methods.status ? await methods.status(context) : null;
    }

    async test(context) {
      return methods.test ? await methods.test(context) : null;
    }

    async sandbox(context) {
      return methods.sandbox ? await methods.sandbox(context) : null;
    }

    async live(context) {
      return methods.live ? await methods.live(context) : null;
    }

    addArguments(yargs) {
      return methods.addArguments ? methods.addArguments(yargs) : yargs;
    }
  };
}

// Example tool implementation
class ExampleTool extends PolyScriptTool {
  get description() {
    return 'Example PolyScript tool demonstrating the Node.js framework';
  }

  addArguments(yargs) {
    return yargs
      .option('target', {
        type: 'string',
        default: 'default',
        description: 'Target to operate on'
      })
      .option('count', {
        type: 'number',
        default: 1,
        description: 'Number of operations'
      });
  }

  async status(context) {
    context.log('Checking status...');
    return {
      operational: true,
      last_check: new Date().toISOString(),
      files_ready: 1234
    };
  }

  async test(context) {
    context.log('Running test mode...');
    return {
      planned_operations: [
        { operation: 'Operation 1', status: 'would execute' },
        { operation: 'Operation 2', status: 'would execute' }
      ],
      total_operations: 2,
      note: 'No changes made in test mode'
    };
  }

  async sandbox(context) {
    context.log('Testing environment...');
    const tests = {
      nodejs: 'available',
      filesystem: 'writable',
      network: 'accessible'
    };

    const allPassed = Object.values(tests).every(status => 
      ['available', 'writable', 'accessible'].includes(status)
    );

    return {
      dependency_tests: tests,
      all_passed: allPassed
    };
  }

  async live(context) {
    context.log('Executing live mode...');
    
    if (!await context.confirm('Execute operations?')) {
      return { status: 'cancelled' };
    }

    context.log('Executing operation 1...');
    context.log('Executing operation 2...');

    return {
      executed_operations: [
        { operation: 'Operation 1', status: 'completed' },
        { operation: 'Operation 2', status: 'completed' }
      ],
      total_completed: 2
    };
  }
}

// Export framework components
module.exports = {
  PolyScriptTool,
  PolyScriptContext,
  PolyScriptError,
  PolyScriptMode,
  runPolyScriptTool,
  polyscriptTool,
  ExampleTool
};

// If run directly, execute example tool
if (require.main === module) {
  const tool = new ExampleTool();
  runPolyScriptTool(tool);
}

/*
 * USAGE EXAMPLES:
 *
 * // Class-based approach
 * class BackupTool extends PolyScriptTool {
 *   get description() {
 *     return 'Backup tool with zero boilerplate';
 *   }
 *
 *   async status(context) {
 *     return { operational: true };
 *   }
 *
 *   async test(context) {
 *     return { would_backup: ['file1', 'file2'] };
 *   }
 *
 *   async sandbox(context) {
 *     return { environment: 'ok' };
 *   }
 *
 *   async live(context) {
 *     return { backup_completed: true };
 *   }
 * }
 *
 * runPolyScriptTool(new BackupTool());
 *
 * // Functional approach
 * const SimpleTool = polyscriptTool('Simple backup tool', {
 *   status: async (ctx) => ({ operational: true }),
 *   test: async (ctx) => ({ would_backup: ['file1'] }),
 *   sandbox: async (ctx) => ({ environment: 'ok' }),
 *   live: async (ctx) => ({ backup_completed: true })
 * });
 *
 * runPolyScriptTool(new SimpleTool());
 *
 * // Package.json
 * {
 *   "name": "backup-tool",
 *   "version": "1.0.0", 
 *   "dependencies": {
 *     "yargs": "^17.7.2"
 *   },
 *   "bin": {
 *     "backup-tool": "./backup-tool.js"
 *   }
 * }
 *
 * // Usage:
 * npm install yargs
 * node backup-tool.js status
 * node backup-tool.js test --verbose
 * node backup-tool.js sandbox --json
 * node backup-tool.js live --force
 */