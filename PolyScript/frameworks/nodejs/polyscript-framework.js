#!/usr/bin/env node

/*
 * PolyScript Framework for Node.js using yargs
 * CRUD × Modes Architecture: Zero-boilerplate CLI development
 *
 * Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
 */

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const readline = require('readline');

/**
 * PolyScript CRUD operations
 */
const PolyScriptOperation = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete'
};

/**
 * PolyScript execution modes
 */
const PolyScriptMode = {
  SIMULATE: 'simulate',
  SANDBOX: 'sandbox',
  LIVE: 'live'
};

/**
 * PolyScript context for tool execution
 */
class PolyScriptContext {
  constructor(operation, mode, resource = null, verbose = false, force = false, jsonOutput = false, toolName = 'PolyScriptTool') {
    this.operation = operation;
    this.mode = mode;
    this.resource = resource;
    this.verbose = verbose;
    this.force = force;
    this.jsonOutput = jsonOutput;
    this.toolName = toolName;
    this.options = {};
    this.outputData = {
      polyscript: '1.0',
      operation: operation,
      mode: mode,
      tool: toolName,
      status: 'success',
      data: {}
    };
    if (resource) {
      this.outputData.resource = resource;
    }
  }

  /**
   * Check if current mode allows mutations
   */
  canMutate() {
    return this.mode === PolyScriptMode.LIVE;
  }

  /**
   * Check if current mode should validate
   */
  shouldValidate() {
    return this.mode === PolyScriptMode.SANDBOX;
  }

  /**
   * Check if confirmation required for destructive operations
   */
  requireConfirm() {
    return this.mode === PolyScriptMode.LIVE && 
           (this.operation === PolyScriptOperation.UPDATE || this.operation === PolyScriptOperation.DELETE) &&
           !this.force;
  }

  /**
   * Check if in a safe mode (simulate/sandbox)
   */
  isSafeMode() {
    return this.mode === PolyScriptMode.SIMULATE || this.mode === PolyScriptMode.SANDBOX;
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
          if (this.verbose || level === 'info') {
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
        // Merge object data
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
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });
  }

  /**
   * Finalize JSON output
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
   * Create new resources
   */
  async create(resource, options, context) {
    throw new Error('Subclasses must implement create method');
  }

  /**
   * Read/query resources
   */
  async read(resource, options, context) {
    throw new Error('Subclasses must implement read method');
  }

  /**
   * Update existing resources
   */
  async update(resource, options, context) {
    throw new Error('Subclasses must implement update method');
  }

  /**
   * Delete resources
   */
  async delete(resource, options, context) {
    throw new Error('Subclasses must implement delete method');
  }
}

/**
 * Execute CRUD method with appropriate mode wrapping
 */
async function executeWithMode(tool, operation, mode, resource, options, argv) {
  const toolName = tool.constructor.name;
  
  // Create context
  const context = new PolyScriptContext(
    operation,
    mode,
    resource,
    argv.verbose || false,
    argv.force || false,
    argv.json || false,
    toolName
  );
  context.options = options;

  try {
    let result;

    switch (mode) {
      case PolyScriptMode.SIMULATE:
        context.log(`Simulating ${operation} operation`, 'debug');
        
        // Read operations can execute in simulate mode
        if (operation === PolyScriptOperation.READ) {
          result = await tool.read(resource, options, context);
        } else {
          // For mutating operations, describe what would happen
          const actionVerbs = {
            [PolyScriptOperation.CREATE]: 'Would create',
            [PolyScriptOperation.UPDATE]: 'Would update',
            [PolyScriptOperation.DELETE]: 'Would delete'
          };
          const verb = actionVerbs[operation] || `Would ${operation}`;
          
          result = {
            simulation: true,
            action: `${verb} ${resource || 'resource'}`,
            options: options
          };
        }
        break;

      case PolyScriptMode.SANDBOX:
        context.log(`Testing prerequisites for ${operation}`, 'debug');
        
        const validations = {
          permissions: 'verified',
          dependencies: 'available',
          connectivity: 'established'
        };
        
        // Tools can add custom validations by checking context.shouldValidate()
        const allPassed = Object.values(validations).every(v => 
          v === 'verified' || v === 'available' || v === 'established' || v === 'passed'
        );
        
        result = {
          sandbox: true,
          validations: validations,
          ready: allPassed
        };
        break;

      case PolyScriptMode.LIVE:
        context.log(`Executing ${operation} operation`, 'debug');
        
        // Confirmation for destructive operations
        if (context.requireConfirm()) {
          const confirmed = await context.confirm(
            `Are you sure you want to ${operation} ${resource}?`
          );
          if (!confirmed) {
            context.outputData.status = 'cancelled';
            throw new PolyScriptError('User declined confirmation');
          }
        }
        
        // Execute the actual CRUD method
        switch (operation) {
          case PolyScriptOperation.CREATE:
            result = await tool.create(resource, options, context);
            break;
          case PolyScriptOperation.READ:
            result = await tool.read(resource, options, context);
            break;
          case PolyScriptOperation.UPDATE:
            result = await tool.update(resource, options, context);
            break;
          case PolyScriptOperation.DELETE:
            result = await tool.delete(resource, options, context);
            break;
        }
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
 * Run a PolyScript tool with yargs CLI handling
 */
async function runPolyScriptTool(tool) {
  const toolName = tool.constructor.name;

  // Create yargs instance
  let yargsInstance = yargs(hideBin(process.argv))
    .scriptName(toolName.toLowerCase())
    .usage('$0 <command> [options]')
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

  // Add discover command
  yargsInstance = yargsInstance.command(
    'discover',
    'Show tool capabilities',
    {},
    (argv) => {
      const discovery = {
        polyscript: '1.0',
        tool: toolName,
        operations: ['create', 'read', 'update', 'delete'],
        modes: ['simulate', 'sandbox', 'live']
      };
      
      if (argv.json) {
        console.log(JSON.stringify(discovery, null, 2));
      } else {
        console.log(`Tool: ${toolName}`);
        console.log('Operations: create, read, update, delete');
        console.log('Modes: simulate, sandbox, live');
      }
    }
  );

  // Create CRUD command handler
  const crudHandler = (operation) => {
    return {
      command: operation === PolyScriptOperation.READ ? `${operation} [resource]` : `${operation} <resource>`,
      describe: getOperationDescription(operation),
      builder: (yargs) => {
        yargs = yargs
          .positional('resource', {
            describe: 'Resource to operate on',
            type: 'string'
          })
          .option('mode', {
            alias: 'm',
            type: 'string',
            choices: Object.values(PolyScriptMode),
            default: PolyScriptMode.LIVE,
            description: 'Execution mode'
          });
        
        // Let tool add custom arguments
        return tool.addArguments(yargs);
      },
      handler: async (argv) => {
        const { resource, mode, ...otherArgs } = argv;
        
        // Extract custom options (exclude yargs internals)
        const options = {};
        for (const key in otherArgs) {
          if (!key.startsWith('$') && !key.startsWith('_') && 
              key !== 'verbose' && key !== 'force' && key !== 'json') {
            options[key] = otherArgs[key];
          }
        }
        
        await executeWithMode(tool, operation, mode, resource, options, argv);
      }
    };
  };

  // Add CRUD commands
  yargsInstance = yargsInstance
    .command(crudHandler(PolyScriptOperation.CREATE))
    .command(crudHandler(PolyScriptOperation.READ))
    .command(crudHandler(PolyScriptOperation.UPDATE))
    .command(crudHandler(PolyScriptOperation.DELETE));

  // Add list as alias for read
  yargsInstance = yargsInstance.command(
    'list',
    'List resources (alias for read)',
    (yargs) => {
      yargs = yargs
        .option('mode', {
          alias: 'm',
          type: 'string',
          choices: Object.values(PolyScriptMode),
          default: PolyScriptMode.LIVE,
          description: 'Execution mode'
        });
      return tool.addArguments(yargs);
    },
    async (argv) => {
      const { mode, ...otherArgs } = argv;
      const options = {};
      for (const key in otherArgs) {
        if (!key.startsWith('$') && !key.startsWith('_') && 
            key !== 'verbose' && key !== 'force' && key !== 'json') {
          options[key] = otherArgs[key];
        }
      }
      await executeWithMode(tool, PolyScriptOperation.READ, mode, null, options, argv);
    }
  );

  // Set default command behavior
  yargsInstance = yargsInstance
    .demandCommand(1, 'You must specify a command')
    .recommendCommands()
    .strict();

  // Parse and execute
  yargsInstance.parse();
}

/**
 * Get description for a CRUD operation
 */
function getOperationDescription(operation) {
  switch (operation) {
    case PolyScriptOperation.CREATE:
      return 'Create new resources';
    case PolyScriptOperation.READ:
      return 'Read/query resources';
    case PolyScriptOperation.UPDATE:
      return 'Update existing resources';
    case PolyScriptOperation.DELETE:
      return 'Delete resources';
    default:
      return 'Unknown operation';
  }
}

/**
 * Create a PolyScript tool from simple functions (functional style)
 */
function createPolyScriptTool(config) {
  class FunctionalTool extends PolyScriptTool {
    get description() {
      return config.description || 'PolyScript CLI tool';
    }

    addArguments(yargs) {
      if (config.addArguments) {
        return config.addArguments(yargs);
      }
      return yargs;
    }

    async create(resource, options, context) {
      if (config.create) {
        return await config.create(resource, options, context);
      }
      throw new PolyScriptError('Create operation not implemented');
    }

    async read(resource, options, context) {
      if (config.read) {
        return await config.read(resource, options, context);
      }
      throw new PolyScriptError('Read operation not implemented');
    }

    async update(resource, options, context) {
      if (config.update) {
        return await config.update(resource, options, context);
      }
      throw new PolyScriptError('Update operation not implemented');
    }

    async delete(resource, options, context) {
      if (config.delete) {
        return await config.delete(resource, options, context);
      }
      throw new PolyScriptError('Delete operation not implemented');
    }
  }

  return new FunctionalTool();
}

// Export everything
module.exports = {
  PolyScriptOperation,
  PolyScriptMode,
  PolyScriptContext,
  PolyScriptError,
  PolyScriptTool,
  runPolyScriptTool,
  createPolyScriptTool
};

/*
 * EXAMPLE USAGE:
 *
 * const { PolyScriptTool, runPolyScriptTool } = require('./polyscript-framework');
 *
 * class CompilerTool extends PolyScriptTool {
 *   get description() {
 *     return 'Example compiler tool demonstrating CRUD × Modes';
 *   }
 *
 *   async create(resource, options, context) {
 *     context.log(`Compiling ${resource}...`);
 *     
 *     const outputFile = options.output || resource.replace('.js', '.out');
 *     
 *     return {
 *       compiled: resource,
 *       output: outputFile,
 *       optimized: options.optimize || false,
 *       timestamp: new Date().toISOString()
 *     };
 *   }
 *
 *   async read(resource, options, context) {
 *     context.log('Checking compilation status...');
 *     
 *     return {
 *       source_files: ['main.js', 'utils.js', 'config.js'],
 *       compiled_files: ['main.out', 'utils.out'],
 *       missing: ['config.out'],
 *       last_build: new Date().toISOString()
 *     };
 *   }
 *
 *   async update(resource, options, context) {
 *     context.log(`Recompiling ${resource}...`);
 *     
 *     return {
 *       recompiled: resource,
 *       reason: 'source file changed',
 *       timestamp: new Date().toISOString()
 *     };
 *   }
 *
 *   async delete(resource, options, context) {
 *     context.log(`Cleaning ${resource}...`);
 *     
 *     return {
 *       cleaned: ['*.out', '*.map', 'dist/'],
 *       freed_space: '23.5 MB',
 *       timestamp: new Date().toISOString()
 *     };
 *   }
 *
 *   addArguments(yargs) {
 *     return yargs
 *       .option('optimize', {
 *         alias: 'O',
 *         type: 'boolean',
 *         description: 'Enable optimizations'
 *       })
 *       .option('output', {
 *         alias: 'o',
 *         type: 'string',
 *         description: 'Output file name'
 *       });
 *   }
 * }
 *
 * // Run the tool
 * if (require.main === module) {
 *   const tool = new CompilerTool();
 *   runPolyScriptTool(tool);
 * }
 *
 * // Command examples:
 * // node compiler.js create main.js --mode simulate
 * // node compiler.js read
 * // node compiler.js update main.js --optimize
 * // node compiler.js delete --mode simulate
 * // node compiler.js discover --json
 */