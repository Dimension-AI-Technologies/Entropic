# PolyScript Developer Guide

**Complete guide for contributing to and extending the PolyScript framework**

## Table of Contents

1. [Getting Started with Development](#getting-started-with-development)
2. [Framework Architecture](#framework-architecture)
3. [Creating New Language Frameworks](#creating-new-language-frameworks)
4. [Contributing to Existing Frameworks](#contributing-to-existing-frameworks)
5. [Testing and Quality Assurance](#testing-and-quality-assurance)
6. [Documentation Standards](#documentation-standards)
7. [Release Process](#release-process)
8. [Troubleshooting Development Issues](#troubleshooting-development-issues)

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

## Framework Architecture

### Core Design Principles

**Behavioral Consistency**: All frameworks provide identical user experience  
**Language Optimization**: Each framework uses the best CLI library for its language  
**Zero Boilerplate**: Business logic only, no CLI infrastructure code  
**Data-Driven Output**: Structured, machine-readable results  

### Framework Components

Every PolyScript framework must implement:

1. **CLI Argument Parser**: Handle standard and custom arguments
2. **Mode Router**: Route execution to appropriate business logic methods
3. **Context Provider**: Give business logic access to execution context
4. **Output Formatter**: Handle both JSON and console output
5. **Error Handler**: Consistent error reporting and exit codes

### Interface Requirements

```python
# Conceptual interface (adapt syntax for each language)
class PolyScriptFramework:
    # Tool lifecycle
    def register_tool(tool_class): pass
    def execute_tool(args): pass
    
    # Mode execution
    def execute_status(tool, context): pass
    def execute_test(tool, context): pass
    def execute_sandbox(tool, context): pass
    def execute_live(tool, context): pass
    
    # Output handling
    def format_json_output(data): pass
    def format_console_output(data): pass
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
    """Base class for PolyScript tools"""
    
    def description(self):
        raise NotImplementedError("Subclasses must implement description()")
    
    def add_arguments(self, parser):
        # Override to add tool-specific arguments
        pass
    
    def status(self, context):
        raise NotImplementedError("Subclasses must implement status()")
    
    def test(self, context):
        raise NotImplementedError("Subclasses must implement test()")
    
    def sandbox(self, context):
        raise NotImplementedError("Subclasses must implement sandbox()")
    
    def live(self, context):
        raise NotImplementedError("Subclasses must implement live()")

def run_polyscript_tool(tool_class):
    """Main entry point for PolyScript tools"""
    
    # Set up CLI parser with standard arguments
    parser = setup_argument_parser()
    parser = tool_class().add_arguments(parser)
    args = parser.parse_args()
    
    # Create context
    context = PolyScriptContext(
        mode=args.mode,
        verbose=args.verbose,
        force=args.force,
        json_output=args.json,
        tool_name=tool_class.__name__
    )
    
    # Execute appropriate mode
    tool = tool_class()
    try:
        result = execute_mode(tool, context)
        context.output_data['data'] = result or {}
        context.finalize_output()
        return 0
    except Exception as e:
        handle_error(context, e)
        return 1

def setup_argument_parser():
    """Set up argument parser with standard PolyScript arguments"""
    # Language-specific implementation
    pass

def execute_mode(tool, context):
    """Route to appropriate mode method"""
    mode_map = {
        'status': tool.status,
        'test': tool.test,
        'sandbox': tool.sandbox,
        'live': tool.live
    }
    
    method = mode_map.get(context.mode)
    if not method:
        raise ValueError(f"Unknown mode: {context.mode}")
    
    return method(context)
```

#### Step 4: Create Example Tool

Create a working backup tool example that demonstrates all framework features:

```python
class BackupTool(PolyScriptTool):
    def description(self):
        return "Example backup tool demonstrating PolyScript framework"
    
    def add_arguments(self, parser):
        parser.add_argument('source', help='Source directory')
        parser.add_argument('dest', help='Destination directory')
        parser.add_argument('--overwrite', action='store_true',
                          help='Overwrite existing destination')
        return parser
    
    def status(self, context):
        # Implement status checking
        return {
            "operational": True,
            "source_exists": os.path.exists(context.args.source),
            "destination_exists": os.path.exists(context.args.dest)
        }
    
    def test(self, context):
        # Implement dry-run logic
        operations = self._plan_backup_operations(context)
        return {
            "planned_operations": operations,
            "estimated_duration": self._estimate_duration(operations),
            "note": "No changes made in test mode"
        }
    
    def sandbox(self, context):
        # Implement dependency checking
        tests = {
            "source_readable": self._test_source_access(context),
            "destination_writable": self._test_dest_access(context),
            "sufficient_space": self._test_disk_space(context)
        }
        return {
            "dependency_tests": tests,
            "all_passed": all(test == "passed" for test in tests.values())
        }
    
    def live(self, context):
        # Implement actual backup
        if not context.force and self._needs_confirmation(context):
            if not context.confirm("Execute backup?"):
                return {"status": "cancelled"}
        
        results = self._execute_backup(context)
        return {
            "operation": "backup_completed",
            "files_copied": results['files'],
            "bytes_copied": results['bytes']
        }
    
    # Helper methods for business logic
    def _plan_backup_operations(self, context): pass
    def _estimate_duration(self, operations): pass
    def _test_source_access(self, context): pass
    def _test_dest_access(self, context): pass
    def _test_disk_space(self, context): pass
    def _needs_confirmation(self, context): pass
    def _execute_backup(self, context): pass

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
        context.mode = 'test'
        context.verbose = False
        context.force = False
        context.json_output = True
        return context
    
    def test_framework_initialization(self):
        """Test framework initializes correctly"""
        self.assertIsNotNone(self.tool)
        self.assertIsInstance(self.tool.description(), str)
    
    def test_all_modes_implemented(self):
        """Test all required modes are implemented"""
        modes = ['status', 'test', 'sandbox', 'live']
        for mode in modes:
            with self.subTest(mode=mode):
                method = getattr(self.tool, mode)
                self.assertTrue(callable(method))
    
    def test_json_output_structure(self):
        """Test JSON output follows PolyScript v1.0 spec"""
        result = self.tool.status(self.context)
        
        # Test would run tool and parse JSON output
        # Verify required fields are present
        pass
    
    def test_error_handling(self):
        """Test framework handles errors consistently"""
        # Test various error conditions
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
// Go example: Use interfaces and structs
type PolyScriptTool interface {
    Description() string
    Status(*PolyScriptContext) (interface{}, error)
    Test(*PolyScriptContext) (interface{}, error)
    Sandbox(*PolyScriptContext) (interface{}, error)
    Live(*PolyScriptContext) (interface{}, error)
}

// Implement with structs
type BackupTool struct {
    sourcePath string
    destPath   string
}

func (t *BackupTool) Status(ctx *PolyScriptContext) (interface{}, error) {
    return map[string]interface{}{
        "operational": true,
        "source_exists": fileExists(t.sourcePath),
    }, nil
}
```

#### Dynamic Languages (Python, JavaScript, Ruby)

```python
# Python example: Use classes and decorators
@polyscript_tool
class BackupTool:
    def __init__(self, source=None, dest=None):
        self.source = source
        self.dest = dest
    
    def status(self, context):
        return {
            "operational": True,
            "source_exists": os.path.exists(self.source)
        }

# JavaScript example: Use classes or functions
class BackupTool extends PolyScriptTool {
    async status(context) {
        return {
            operational: true,
            source_exists: await fs.pathExists(this.sourcePath)
        };
    }
}
```

#### Functional Languages (F#, Haskell)

```fsharp
// F# example: Use computation expressions or records
type PolyScriptTool = {
    Description: string
    Status: PolyScriptContext -> Result<obj, string>
    Test: PolyScriptContext -> Result<obj, string>
    Sandbox: PolyScriptContext -> Result<obj, string>
    Live: PolyScriptContext -> Result<obj, string>
}

let backupTool = {
    Description = "Backup tool using F# PolyScript framework"
    Status = fun context ->
        Ok (dict [
            "operational", box true
            "source_exists", box (File.Exists context.Args.Source)
        ])
    // ... other modes
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
    """Benchmark framework performance"""
    
    results = {
        'status': [],
        'test': [], 
        'sandbox': [],
        'startup': []
    }
    
    for mode in ['status', 'test', 'sandbox']:
        times = []
        for _ in range(iterations):
            start = time.time()
            result = subprocess.run([tool_path, mode, '--json'], 
                                  capture_output=True)
            end = time.time()
            
            if result.returncode == 0:
                times.append((end - start) * 1000)  # Convert to ms
        
        results[mode] = {
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
def sandbox(self, context):
    """
    Test environment and dependencies for the tool.
    
    This method should validate that all prerequisites for the tool
    are available and working correctly. It should test:
    - Required dependencies (libraries, services, etc.)
    - File system permissions
    - Network connectivity (if needed)
    - Available disk space
    - Any other environmental requirements
    
    The method should be safe to run and not modify any system state.
    
    Args:
        context (PolyScriptContext): Execution context containing:
            - mode: Always 'sandbox' for this method
            - verbose: Whether to provide detailed output
            - force: Ignored in sandbox mode
            - json_output: Whether output should be JSON formatted
    
    Returns:
        dict: Sandbox test results with structure:
            {
                "dependency_tests": {
                    "test_name": "passed|failed|error"
                },
                "all_passed": bool,
                "failed_tests": [list of failed test names],
                "details": {additional test details}
            }
    
    Example:
        >>> tool = MyTool()
        >>> context = PolyScriptContext('sandbox', verbose=True)
        >>> result = tool.sandbox(context)
        >>> print(result['all_passed'])
        True
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

**Ready to contribute?** Pick an area that interests you and start with a small improvement. The PolyScript community welcomes contributors at all levels! 🚀