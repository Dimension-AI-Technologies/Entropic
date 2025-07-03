# PolyScript Developer Guide

**Complete guide for implementing and extending the PolyScript CRUD × Modes framework**

## Table of Contents

1. [Getting Started with Development](#getting-started-with-development)
2. [CRUD × Modes Architecture](#crud-modes-architecture)
3. [Framework Implementation](#framework-implementation)
4. [Creating New Language Frameworks](#creating-new-language-frameworks)
5. [Contributing to Existing Frameworks](#contributing-to-existing-frameworks)
6. [Testing and Quality Assurance](#testing-and-quality-assurance)
7. [Documentation Standards](#documentation-standards)
8. [Release Process](#release-process)
9. [Troubleshooting Development Issues](#troubleshooting-development-issues)

## Getting Started with Development

### Development Environment Setup

```bash
# Clone the repository
git clone https://github.com/your-org/polyscript
cd polyscript

# Install development dependencies
pip install -r requirements-dev.txt  # For Python development
npm install                          # For Node.js development
go mod download                      # For Go development

# Run the validator
python tools/polyscript_validator.py examples/backup_tool/backup_tool.py
```

### Repository Structure

```
PolyScript/
├── design/                    # Design documents and specifications
├── frameworks/               # Language-specific implementations
│   ├── python/              # Python framework (Click)
│   ├── csharp/              # C# framework (Spectre.Console)
│   ├── fsharp/              # F# framework (Argu)
│   ├── rust/                # Rust framework (clap)
│   ├── go/                  # Go framework (cobra)
│   ├── nodejs/              # Node.js framework (yargs)
│   ├── ruby/                # Ruby framework (thor)
│   └── experimental/        # Experimental frameworks
├── schema/                   # JSON schema and behavioral contracts
├── tools/                    # Validation and generation tools
├── examples/                 # Cross-language example implementations
└── archive/                  # Historical documentation
```

### Development Workflow

1. **Pick an Area**: Framework improvement, new language, tooling, documentation
2. **Read Specifications**: Understand design principles in `design/`
3. **Study Examples**: Look at existing implementations in `frameworks/`
4. **Create Branch**: `git checkout -b feature/your-feature`
5. **Implement Changes**: Follow coding standards and patterns
6. **Test Thoroughly**: Use validator and write tests
7. **Document Changes**: Update relevant documentation
8. **Submit PR**: Include tests, examples, and documentation

## CRUD × Modes Architecture

### Core Design Principles

**CRUD × Modes Multiplication**: Write 4 operations, get 12 behaviors automatically
**Behavioral Consistency**: All frameworks provide identical user experience  
**Language Optimization**: Each framework uses the best CLI library for its language  
**Zero Boilerplate**: Developers write only CRUD business logic  
**Data-Driven Output**: Structured, machine-readable results  

### The Multiplication Effect

```
         | Simulate | Sandbox | Live
---------|----------|---------|------
Create   |    ✓     |    ✓    |  ✓
Read     |    -     |    ✓    |  ✓
Update   |    ✓     |    ✓    |  ✓  
Delete   |    ✓     |    ✓    |  ✓
```

**4 methods × 3 modes = 12 behaviors**

## Framework Implementation

### Framework Components

Every PolyScript framework must implement:

1. **Operation Parser**: Parse CRUD operation from CLI
2. **Mode Parser**: Extract execution mode from --mode flag
3. **Operation Router**: Route to appropriate CRUD method
4. **Mode Wrapper**: Apply mode-specific behavior
5. **Context Provider**: Give business logic access to operation context
6. **Output Formatter**: Handle both JSON and console output
7. **Error Handler**: Consistent error reporting and exit codes

### Interface Requirements

```python
# Conceptual interface (adapt syntax for each language)
class PolyScriptFramework:
    # Tool lifecycle
    def register_tool(tool_class): pass
    def parse_arguments(args): pass
    def execute_tool(operation, resource, mode, options): pass
    
    # Operation routing
    def route_operation(tool, operation, resource, options, context): pass
    
    # Mode wrapping
    def simulate_wrapper(method, resource, options, context): pass
    def sandbox_wrapper(method, resource, options, context): pass
    def live_wrapper(method, resource, options, context): pass
    
    # Output handling
    def format_json_output(operation, mode, data): pass
    def format_console_output(operation, mode, data): pass
    def handle_errors(exception): pass
```

## Creating New Language Frameworks

### Language Selection Criteria

Consider adding a framework for a language if:
- ✅ Has a mature CLI argument parsing library
- ✅ Supports structured data (JSON/objects)
- ✅ Has error handling and exit code support
- ✅ Is commonly used for CLI tool development
- ✅ Has an active community and ecosystem

### Implementation Steps

#### Step 1: Research CLI Libraries

Identify the best CLI library for your target language:

**Evaluation Criteria**:
- Argument parsing capabilities
- Subcommand support
- Flag handling (boolean, string, numeric)
- Help text generation
- Error handling
- Community adoption
- Documentation quality

**Examples**:
- **Python**: Click (decorator-based), argparse (stdlib), typer (modern)
- **JavaScript**: yargs (feature-rich), commander (simple), oclif (enterprise)
- **Go**: cobra (powerful), flag (stdlib), urfave/cli (simple)
- **Rust**: clap (derive macros), structopt (deprecated), argh (simple)

#### Step 2: Create Framework Structure

```
frameworks/new-language/
├── polyscript_framework.ext        # Main framework implementation
├── example_tool.ext                # Working example tool
├── README.md                       # Usage documentation
└── test_framework.ext              # Framework tests
```

#### Step 3: Implement Core Framework

**Template for new framework**:

```python
# Example: Python framework template
class PolyScriptContext:
    def __init__(self, mode, verbose, force, json_output, tool_name):
        self.mode = mode
        self.verbose = verbose
        self.force = force
        self.json_output = json_output
        self.tool_name = tool_name
        self.output_data = {
            "polyscript": "1.0",
            "mode": mode,
            "tool": tool_name,
            "status": "success",
            "data": {}
        }
    
    def log(self, message, level='info'):
        # Handle logging based on verbosity and output mode
        pass
    
    def output(self, data, is_error=False):
        # Handle data output for JSON/console modes
        pass
    
    def confirm(self, message):
        # Handle user confirmation with --force bypass
        pass
    
    def finalize_output(self):
        # Complete and output final JSON if needed
        pass

class PolyScriptTool:
    """Base class for PolyScript CRUD tools"""
    
    def description(self):
        raise NotImplementedError("Subclasses must implement description()")
    
    def add_arguments(self, parser):
        # Override to add tool-specific arguments
        pass
    
    def create(self, resource, options, context):
        raise NotImplementedError("Subclasses must implement create()")
    
    def read(self, resource, options, context):
        raise NotImplementedError("Subclasses must implement read()")
    
    def update(self, resource, options, context):
        raise NotImplementedError("Subclasses must implement update()")
    
    def delete(self, resource, options, context):
        raise NotImplementedError("Subclasses must implement delete()")

def run_polyscript_tool(tool_class):
    """Main entry point for PolyScript CRUD tools"""
    
    # Set up CLI parser with CRUD operations
    parser = setup_argument_parser()
    parser = tool_class().add_arguments(parser)
    args = parser.parse_args()
    
    # Parse operation and resource
    operation = args.operation
    resource = args.resource
    if operation == 'list':
        operation = 'read'
        resource = 'list'
    
    # Create context
    context = PolyScriptContext(
        operation=operation,
        mode=args.mode,
        resource=resource,
        verbose=args.verbose,
        force=args.force,
        json_output=args.json,
        tool_name=tool_class.__name__
    )
    
    # Get CRUD method
    tool = tool_class()
    crud_method = getattr(tool, operation)
    
    # Parse additional options
    options = parse_additional_options(args)
    
    try:
        # Apply mode wrapper
        if context.mode == 'simulate' and operation != 'read':
            result = simulate_wrapper(crud_method, resource, options, context)
        elif context.mode == 'sandbox':
            result = sandbox_wrapper(crud_method, resource, options, context)
        else:
            result = live_wrapper(crud_method, resource, options, context)
        
        context.output_data['data'] = result or {}
        context.finalize_output()
        return 0
    except Exception as e:
        handle_error(context, e)
        return 1

def setup_argument_parser():
    """Set up argument parser with CRUD operations and modes"""
    # Language-specific implementation
    # Must support:
    # - operation: create/read/update/delete/list
    # - resource: what to operate on
    # - --mode: simulate/sandbox/live
    # - --json, --verbose, --force
    pass

def simulate_wrapper(method, resource, options, context):
    """Wrap CRUD method for simulation"""
    # Set simulation flag
    context._simulating = True
    
    # Run method in planning mode
    planned = method(resource, options, context)
    
    # Return simulation result
    return {
        "would_execute": context.operation,
        "resource": resource,
        "planned_changes": planned,
        "message": f"Would {context.operation} {resource}"
    }

def sandbox_wrapper(method, resource, options, context):
    """Wrap CRUD method for sandbox validation"""
    # Test prerequisites
    tests = validate_prerequisites(context.operation, resource, options)
    
    return {
        "operation": context.operation,
        "resource": resource,
        "tests": tests,
        "prerequisites_met": all(tests.values())
    }

def live_wrapper(method, resource, options, context):
    """Wrap CRUD method for live execution"""
    # Confirm destructive operations
    if context.operation in ['delete', 'update'] and not context.force:
        if not context.confirm(f"Really {context.operation} {resource}?"):
            return {"cancelled": True}
    
    # Execute method
    return method(resource, options, context)
```

#### Step 4: Create Example Tool

Create a working backup tool example that demonstrates all framework features:

```python
class BackupTool(PolyScriptTool):
    def description(self):
        return "Example backup tool demonstrating PolyScript CRUD × Modes framework"
    
    def add_arguments(self, parser):
        # Add tool-specific options
        parser.add_argument('--source', help='Source directory for backups')
        parser.add_argument('--dest', help='Destination directory')
        parser.add_argument('--overwrite', action='store_true',
                          help='Overwrite existing backups')
        parser.add_argument('--schedule', help='Backup schedule (cron format)')
        return parser
    
    def create(self, resource, options, context):
        """Create a new backup"""
        # In simulate mode, framework ensures no side effects
        backup_id = f"backup-{resource}-{timestamp}"
        
        # Plan the backup creation
        plan = {
            "backup_id": backup_id,
            "source": options.get('source', '/data'),
            "destination": f"/backups/{backup_id}",
            "size_estimate": self._estimate_size(options['source'])
        }
        
        # In live mode, actually create
        if not context._simulating:
            self._create_backup(plan)
        
        return {
            "created": backup_id,
            "location": plan['destination'],
            "schedule": options.get('schedule', 'manual')
        }
    
    def read(self, resource, options, context):
        """Read backup information"""
        if resource == 'list':
            # List all backups
            backups = self._list_backups()
            return {
                "backups": backups,
                "count": len(backups),
                "total_size": sum(b['size'] for b in backups)
            }
        else:
            # Read specific backup
            backup = self._get_backup(resource)
            return {
                "backup_id": resource,
                "exists": backup is not None,
                "data": backup
            }
    
    def update(self, resource, options, context):
        """Update backup configuration"""
        backup = self._get_backup(resource)
        if not backup:
            raise ValueError(f"Backup '{resource}' not found")
        
        # Plan changes
        changes = {}
        if 'schedule' in options:
            changes['schedule'] = options['schedule']
        if 'retention' in options:
            changes['retention'] = options['retention']
        
        # In live mode, apply changes
        if not context._simulating:
            self._update_backup(resource, changes)
        
        return {
            "updated": resource,
            "changes": changes,
            "previous": {k: backup.get(k) for k in changes}
        }
    
    def delete(self, resource, options, context):
        """Delete a backup"""
        backup = self._get_backup(resource)
        if not backup:
            raise ValueError(f"Backup '{resource}' not found")
        
        # In live mode, actually delete
        if not context._simulating:
            archived = not options.get('permanent', False)
            if archived:
                self._archive_backup(resource)
            else:
                self._delete_backup(resource)
        
        return {
            "deleted": resource,
            "archived": not options.get('permanent', False),
            "size_freed": backup['size']
        }
    
    # Helper methods for business logic
    def _estimate_size(self, path): pass
    def _create_backup(self, plan): pass
    def _list_backups(self): pass
    def _get_backup(self, backup_id): pass
    def _update_backup(self, backup_id, changes): pass
    def _archive_backup(self, backup_id): pass
    def _delete_backup(self, backup_id): pass

# Entry point
if __name__ == "__main__":
    sys.exit(run_polyscript_tool(BackupTool))
```

#### Step 5: Write Tests

```python
import unittest
from unittest.mock import Mock, patch

class TestNewLanguageFramework(unittest.TestCase):
    def setUp(self):
        self.tool = BackupTool()
        self.context = self._create_test_context()
    
    def _create_test_context(self):
        context = Mock()
        context.operation = 'create'
        context.mode = 'simulate'
        context.resource = 'test-backup'
        context.verbose = False
        context.force = False
        context.json_output = True
        context._simulating = True
        return context
    
    def test_framework_initialization(self):
        """Test framework initializes correctly"""
        self.assertIsNotNone(self.tool)
        self.assertIsInstance(self.tool.description(), str)
    
    def test_all_crud_operations_implemented(self):
        """Test all required CRUD operations are implemented"""
        operations = ['create', 'read', 'update', 'delete']
        for op in operations:
            with self.subTest(operation=op):
                method = getattr(self.tool, op)
                self.assertTrue(callable(method))
    
    def test_crud_method_signatures(self):
        """Test CRUD methods have correct signatures"""
        import inspect
        
        for op in ['create', 'read', 'update', 'delete']:
            method = getattr(self.tool, op)
            sig = inspect.signature(method)
            params = list(sig.parameters.keys())
            
            # Should have: self, resource, options, context
            self.assertEqual(len(params), 4)
            self.assertEqual(params[1], 'resource')
            self.assertEqual(params[2], 'options')
            self.assertEqual(params[3], 'context')
    
    def test_simulate_mode_no_side_effects(self):
        """Test simulate mode doesn't modify system"""
        self.context.mode = 'simulate'
        self.context._simulating = True
        
        # Create shouldn't actually create
        result = self.tool.create('test', {}, self.context)
        self.assertIn('created', result)
        # Verify no actual backup was created
    
    def test_json_output_structure(self):
        """Test JSON output follows PolyScript v1.0 spec"""
        # Would test actual JSON output from framework
        # Required fields: polyscript, operation, mode, tool, status, data
        pass

class TestCLIIntegration(unittest.TestCase):
    def test_command_line_interface(self):
        """Test CLI interface works correctly"""
        # Test running tool from command line
        pass
    
    def test_standard_flags(self):
        """Test --json, --verbose, --force flags work"""
        pass

if __name__ == '__main__':
    unittest.main()
```

#### Step 6: Documentation

Create comprehensive documentation:

**README.md**:
```markdown
# PolyScript Framework for [Language]

Zero-boilerplate CLI development using [CLI Library].

## Quick Start

```[language]
// Example tool implementation
class MyTool extends PolyScriptTool {
    description() { return "My awesome tool"; }
    
    status(context) {
        return { operational: true };
    }
    
    // ... other modes
}

MyTool.run();
```

## Installation

```bash
# Installation instructions
```

## Features

- ✅ Zero boilerplate
- ✅ Four standard modes
- ✅ JSON output support
- ✅ Built-in error handling
- ✅ [Language-specific benefits]

## Language-Specific Advantages

- **[Advantage 1]**: Description
- **[Advantage 2]**: Description
- **[Performance]**: Benchmarks or characteristics

## Examples

See `example_tool.[ext]` for a complete working example.
```

#### Step 7: Testing and Validation

```bash
# Run the PolyScript validator
python ../../tools/polyscript_validator.py example_tool.ext

# Run framework tests
[language-specific test command]

# Run integration tests
python ../../tools/test_suite/test_integration.py new-language
```

### Language-Specific Implementation Notes

#### Strongly Typed Languages (Go, Rust, C#, F#)

```go
// Go example: Use interfaces for CRUD operations
type PolyScriptTool interface {
    Description() string
    Create(resource string, options map[string]interface{}, ctx *PolyScriptContext) (interface{}, error)
    Read(resource string, options map[string]interface{}, ctx *PolyScriptContext) (interface{}, error)
    Update(resource string, options map[string]interface{}, ctx *PolyScriptContext) (interface{}, error)
    Delete(resource string, options map[string]interface{}, ctx *PolyScriptContext) (interface{}, error)
}

// Implement with structs
type BackupTool struct {
    backupDir string
}

func (t *BackupTool) Create(resource string, options map[string]interface{}, ctx *PolyScriptContext) (interface{}, error) {
    backupID := fmt.Sprintf("backup-%s-%d", resource, time.Now().Unix())
    
    // Plan the backup
    plan := map[string]interface{}{
        "created": backupID,
        "source": options["source"],
        "destination": filepath.Join(t.backupDir, backupID),
    }
    
    // In live mode, actually create
    if !ctx.IsSimulating() {
        err := t.createBackup(plan)
        if err != nil {
            return nil, err
        }
    }
    
    return plan, nil
}
```

#### Dynamic Languages (Python, JavaScript, Ruby)

```python
# Python example: Use classes with CRUD methods
@polyscript_tool
class BackupTool:
    def create(self, resource, options, context):
        backup_id = f"backup-{resource}-{int(time.time())}"
        return {
            "created": backup_id,
            "location": f"/backups/{backup_id}"
        }
    
    def read(self, resource, options, context):
        if resource == "list":
            return {"backups": self.list_backups()}
        return {"backup": self.get_backup(resource)}
    
    def update(self, resource, options, context):
        return {
            "updated": resource,
            "changes": options
        }
    
    def delete(self, resource, options, context):
        return {"deleted": resource}

# JavaScript example: CRUD with async/await
class BackupTool extends PolyScriptTool {
    async create(resource, options, context) {
        const backupId = `backup-${resource}-${Date.now()}`;
        return {
            created: backupId,
            location: `/backups/${backupId}`
        };
    }
    
    async read(resource, options, context) {
        if (resource === 'list') {
            return { backups: await this.listBackups() };
        }
        return { backup: await this.getBackup(resource) };
    }
    
    async update(resource, options, context) {
        return {
            updated: resource,
            changes: options
        };
    }
    
    async delete(resource, options, context) {
        return { deleted: resource };
    }
}
```

#### Functional Languages (F#, Haskell)

```fsharp
// F# example: CRUD operations with functional style
type PolyScriptTool = {
    Description: string
    Create: string -> Map<string,obj> -> PolyScriptContext -> Result<obj, string>
    Read: string -> Map<string,obj> -> PolyScriptContext -> Result<obj, string>
    Update: string -> Map<string,obj> -> PolyScriptContext -> Result<obj, string>
    Delete: string -> Map<string,obj> -> PolyScriptContext -> Result<obj, string>
}

let backupTool = {
    Description = "Backup tool using F# PolyScript CRUD framework"
    
    Create = fun resource options context ->
        let backupId = sprintf "backup-%s-%d" resource (DateTime.Now.Ticks)
        Ok (dict [
            "created", box backupId
            "location", box (sprintf "/backups/%s" backupId)
        ])
    
    Read = fun resource options context ->
        match resource with
        | "list" -> Ok (dict ["backups", box (listBackups())])
        | _ -> Ok (dict ["backup", box (getBackup resource)])
    
    Update = fun resource options context ->
        Ok (dict [
            "updated", box resource
            "changes", box options
        ])
    
    Delete = fun resource options context ->
        Ok (dict ["deleted", box resource])
}
```

## Contributing to Existing Frameworks

### Improvement Areas

**Performance Optimization**:
- Faster argument parsing
- Reduced memory usage
- Startup time improvements
- Better caching strategies

**Feature Enhancements**:
- Better error messages
- Additional output formats
- Enhanced validation
- Improved help text

**Bug Fixes**:
- Edge case handling
- Cross-platform compatibility
- Memory leaks
- Error handling improvements

### Contribution Process

1. **Identify Issue**: Find bug reports, feature requests, or performance issues
2. **Discuss Changes**: Open issue or comment on existing issue
3. **Create Branch**: `git checkout -b fix/issue-description`
4. **Implement Fix**: Make minimal, focused changes
5. **Add Tests**: Ensure changes are tested
6. **Update Documentation**: Update relevant docs
7. **Test Thoroughly**: Run all tests and validation
8. **Submit PR**: Include clear description and test results

### Testing Existing Frameworks

```bash
# Run comprehensive test suite
./run_framework_tests.sh python
./run_framework_tests.sh go
./run_framework_tests.sh rust

# Test specific scenarios
python tools/polyscript_validator.py frameworks/python/example_tool.py
python tools/polyscript_validator.py frameworks/go/example_tool.go

# Performance testing
./benchmark_frameworks.sh

# Cross-platform testing
./test_platforms.sh  # Linux, macOS, Windows
```

### Code Quality Standards

**Code Style**:
- Follow language-specific conventions
- Use consistent naming patterns
- Add appropriate comments
- Keep functions focused and small

**Error Handling**:
- Use language-native error patterns
- Provide clear error messages
- Handle edge cases gracefully
- Include context in error reports

**Performance**:
- Optimize for startup time
- Minimize memory allocation
- Use efficient data structures
- Cache expensive operations

## Testing and Quality Assurance

### Testing Strategy

**Unit Tests**:
- Test individual framework components
- Mock external dependencies
- Test error conditions
- Verify output formats

**Integration Tests**:
- Test complete tool workflows
- Test CLI interface
- Test JSON output validation
- Test cross-platform compatibility

**Validation Tests**:
- Run PolyScript validator
- Test compliance with specifications
- Verify behavioral consistency
- Test example tools

### Automated Testing

```yaml
# GitHub Actions example
name: PolyScript Tests

on: [push, pull_request]

jobs:
  test-frameworks:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        language: [python, go, rust, nodejs]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup ${{ matrix.language }}
      uses: actions/setup-${{ matrix.language }}@v3
      with:
        ${{ matrix.language }}-version: latest
    
    - name: Install dependencies
      run: |
        cd frameworks/${{ matrix.language }}
        ./install_deps.sh
    
    - name: Run framework tests
      run: |
        cd frameworks/${{ matrix.language }}
        ./run_tests.sh
    
    - name: Validate with PolyScript validator
      run: |
        python tools/polyscript_validator.py \
          frameworks/${{ matrix.language }}/example_tool.*
    
    - name: Run integration tests
      run: |
        python tools/test_suite/test_integration.py ${{ matrix.language }}
```

### Performance Testing

```python
#!/usr/bin/env python3
"""
Performance testing for PolyScript frameworks
"""
import time
import subprocess
import statistics

def benchmark_framework(language, tool_path, iterations=10):
    """Benchmark CRUD × Modes framework performance"""
    
    results = {
        'operations': {},
        'modes': {},
        'startup': []
    }
    
    # Test each operation × mode combination
    operations = ['create', 'read', 'update', 'delete']
    modes = ['simulate', 'sandbox', 'live']
    
    for operation in operations:
        results['operations'][operation] = {}
        for mode in modes:
            # Skip read × simulate (not supported)
            if operation == 'read' and mode == 'simulate':
                continue
                
            times = []
            for _ in range(iterations):
                start = time.time()
                cmd = [tool_path, operation, 'test-resource', 
                       '--mode', mode, '--json']
                if mode == 'live':
                    cmd.append('--force')  # Skip confirmations
                    
                result = subprocess.run(cmd, capture_output=True)
                end = time.time()
                
                if result.returncode == 0:
                    times.append((end - start) * 1000)  # Convert to ms
            
            if times:
                results['operations'][operation][mode] = {
                    'mean': statistics.mean(times),
                    'median': statistics.median(times),
                    'stdev': statistics.stdev(times) if len(times) > 1 else 0
                }
    
    # Test startup time (just help output)
    startup_times = []
    for _ in range(iterations):
        start = time.time()
        subprocess.run([tool_path, '--help'], capture_output=True)
        end = time.time()
        startup_times.append((end - start) * 1000)
    
    results['startup'] = {
        'mean': statistics.mean(startup_times),
        'median': statistics.median(startup_times),
        'stdev': statistics.stdev(startup_times)
    }
    
    return results

def main():
    frameworks = {
        'python': 'frameworks/python/example_tool.py',
        'go': 'frameworks/go/example_tool',  # Compiled binary
        'rust': 'frameworks/rust/target/release/example_tool',
        'nodejs': 'frameworks/nodejs/example_tool.js'
    }
    
    print("PolyScript Framework Performance Benchmark")
    print("=" * 50)
    
    for language, tool_path in frameworks.items():
        print(f"\nTesting {language}...")
        results = benchmark_framework(language, tool_path)
        
        print(f"  Startup: {results['startup']['mean']:.1f}ms")
        print(f"  Status:  {results['status']['mean']:.1f}ms")
        print(f"  Test:    {results['test']['mean']:.1f}ms")
        print(f"  Sandbox: {results['sandbox']['mean']:.1f}ms")

if __name__ == '__main__':
    main()
```

## Documentation Standards

### Documentation Requirements

All contributions must include:

1. **Code Documentation**: Inline comments and docstrings
2. **API Documentation**: Public interface documentation
3. **Usage Examples**: Working code examples
4. **README Updates**: Keep framework READMEs current
5. **CHANGELOG Entries**: Document changes and improvements

### Documentation Format

**Code Comments**:
```python
def execute_mode(tool, mode, context):
    """
    Execute a PolyScript mode on the given tool.
    
    Args:
        tool: PolyScript tool instance
        mode: Execution mode ('status', 'test', 'sandbox', 'live')
        context: PolyScriptContext with execution parameters
    
    Returns:
        dict: Mode-specific result data
    
    Raises:
        PolyScriptError: If mode execution fails
        ValueError: If mode is invalid
    """
```

**README Structure**:
```markdown
# Framework Name

Brief description and key benefits.

## Quick Start

Minimal example showing basic usage.

## Installation

Step-by-step installation instructions.

## Features

- Feature list with checkmarks
- Language-specific advantages

## Usage

### Basic Usage
### Advanced Usage
### Configuration Options

## Examples

Link to working examples.

## Performance

Performance characteristics and benchmarks.

## Contributing

How to contribute to this framework.

## License

License information.
```

### Example Documentation

**Method Documentation**:
```python
def create(self, resource, options, context):
    """
    Create a new resource.
    
    This method implements the 'C' in CRUD. It should:
    - Validate inputs
    - Plan the creation (useful for simulate mode)
    - Create the resource (in live mode only)
    - Return details about what was created
    
    The framework handles mode-specific behavior:
    - simulate: Shows what would be created without side effects
    - sandbox: Tests if creation is possible
    - live: Actually creates the resource
    
    Args:
        resource (str): The resource to create (name/type/identifier)
        options (dict): Creation parameters specific to your tool
        context (PolyScriptContext): Execution context containing:
            - operation: 'create'
            - mode: Current execution mode
            - _simulating: True if in simulate mode
            - can_mutate(): False in simulate/sandbox
            - require_confirm(): True for destructive ops
    
    Returns:
        dict: Creation result with details like:
            {
                "created": "resource-id",
                "location": "/path/to/resource",
                "metadata": {...}
            }
    
    Example:
        >>> tool = MyTool()
        >>> result = tool.create('daily-backup', 
                                {'source': '/data'}, context)
        >>> print(result['created'])
        'backup-daily-20240101'
    """
```

## Release Process

### Version Management

PolyScript uses semantic versioning:
- **Major**: Breaking changes to framework interfaces
- **Minor**: New features, new language frameworks
- **Patch**: Bug fixes, documentation improvements

### Release Checklist

**Pre-Release**:
- [ ] All tests pass on all platforms
- [ ] Documentation is up to date
- [ ] Examples work with new changes
- [ ] Performance regressions are addressed
- [ ] CHANGELOG is updated

**Release Process**:
1. Create release branch: `git checkout -b release/v1.2.0`
2. Update version numbers in all frameworks
3. Update documentation with new features
4. Run comprehensive test suite
5. Create release PR and get approval
6. Merge to main branch
7. Tag release: `git tag v1.2.0`
8. Push tags: `git push --tags`
9. Create GitHub release with changelog
10. Update package repositories (PyPI, npm, etc.)

**Post-Release**:
- [ ] Announce release in community channels
- [ ] Update dependent projects
- [ ] Monitor for issues and bug reports
- [ ] Plan next release features

### Continuous Integration

```yaml
# CI pipeline for releases
name: Release Pipeline

on:
  push:
    tags: ['v*']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Run full test suite
      run: ./run_all_tests.sh
  
  build-packages:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - name: Build distribution packages
      run: |
        # Build packages for each language
        ./build_packages.sh
    
    - name: Upload to package repositories
      run: |
        # Upload to PyPI, npm, crates.io, etc.
        ./upload_packages.sh
  
  create-release:
    needs: [test, build-packages]
    runs-on: ubuntu-latest
    steps:
    - name: Create GitHub release
      uses: actions/create-release@v1
      with:
        tag_name: ${{ github.ref }}
        release_name: Release ${{ github.ref }}
        body_path: CHANGELOG.md
```

## Troubleshooting Development Issues

### Common Development Problems

**Framework Not Loading**:
```bash
# Check import paths
python -c "import sys; print(sys.path)"

# Verify framework syntax
python -m py_compile polyscript_framework.py

# Test basic functionality
python polyscript_framework.py --help
```

**JSON Output Issues**:
```bash
# Test JSON parsing
python -c "import json; print(json.loads(open('output.json').read()))"

# Validate against schema
python tools/validate_json_schema.py output.json schema/polyscript-v1.0.json
```

**Performance Problems**:
```bash
# Profile framework performance
python -m cProfile polyscript_tool.py status

# Memory profiling
python -m memory_profiler polyscript_tool.py
```

**Cross-Platform Issues**:
```bash
# Test on different platforms
docker run --rm -v $(pwd):/app ubuntu:latest python /app/tool.py status
docker run --rm -v $(pwd):/app alpine:latest python /app/tool.py status

# Windows testing (use PowerShell)
python tool.py status
```

### Debug Mode

Enable framework debugging:

```python
# Add to framework for debug support
import os
import logging

if os.environ.get('POLYSCRIPT_DEBUG'):
    logging.basicConfig(level=logging.DEBUG)
    logger = logging.getLogger('polyscript')
    
    def debug_execute_mode(tool, mode, context):
        logger.debug(f"Executing {mode} mode on {tool.__class__.__name__}")
        logger.debug(f"Context: verbose={context.verbose}, force={context.force}")
        
        try:
            result = original_execute_mode(tool, mode, context)
            logger.debug(f"Result: {result}")
            return result
        except Exception as e:
            logger.exception(f"Error in {mode} mode: {e}")
            raise
```

Usage:
```bash
# Enable debug mode
export POLYSCRIPT_DEBUG=1
python my_tool.py status --verbose
```

### Getting Help

**Community Resources**:
- GitHub Issues: Bug reports and feature requests
- Discussions: Architecture and design questions
- Documentation: Technical guides and examples

**Development Resources**:
- **Code Examples**: See `examples/` directory
- **Test Cases**: See `tools/test_suite/`
- **Framework Templates**: See `frameworks/*/`
- **Design Documents**: See `design/`

**Contributing Guidelines**:
1. Start with small improvements
2. Follow existing patterns and conventions
3. Include comprehensive tests
4. Update documentation
5. Be patient with review process

---

## Summary: Building CRUD × Modes Frameworks

The key to implementing PolyScript is understanding the **multiplication effect**:

1. **Developers write**: 4 CRUD methods
2. **Framework provides**: 3 execution modes
3. **Users get**: 12 different behaviors

When building or extending a framework:
- Focus on clean separation between operations and modes
- Let the framework handle mode-specific behavior
- Ensure CRUD methods are pure business logic
- Test all 12 operation × mode combinations

**Ready to contribute?** Pick a language that needs a framework or improve an existing one. The PolyScript community welcomes contributors at all levels! 🚀