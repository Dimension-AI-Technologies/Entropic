# PolyScript Design Compliance Checklist

## Core Requirements

### 1. CRUD Operations
- [ ] Implements `create(resource, options, context)` method
- [ ] Implements `read(resource, options, context)` method  
- [ ] Implements `update(resource, options, context)` method
- [ ] Implements `delete(resource, options, context)` method
- [ ] Operations accept optional resource parameter
- [ ] Operations return data structures (not strings)

### 2. Execution Modes
- [ ] Supports `simulate` mode (dry-run, no side effects)
- [ ] Supports `sandbox` mode (validate prerequisites)
- [ ] Supports `live` mode (actual execution)
- [ ] Default mode is `live`
- [ ] Mode wrapping handled by framework, NOT in business logic

### 3. Rebadging
- [ ] Code-based rebadging only (decorators/attributes)
- [ ] NO YAML configuration files
- [ ] Rebadging maps domain names to CRUD+mode
- [ ] Framework resolves rebadged commands to operations

### 4. Context Object
- [ ] Provides `operation` property
- [ ] Provides `mode` property
- [ ] Provides `resource` property
- [ ] Provides `can_mutate()` method
- [ ] Provides `is_safe_mode()` method
- [ ] Provides `log(message, level)` method
- [ ] Provides `confirm(prompt)` method
- [ ] Provides `output(data)` method

### 5. Command Line Interface
- [ ] Supports `--mode` flag (simulate/sandbox/live)
- [ ] Supports `--json` flag for JSON output
- [ ] Supports `--verbose` flag for debug output
- [ ] Supports `--force` flag to skip confirmations
- [ ] Commands: create, read, update, delete, list (alias for read)

### 6. JSON Output Format
```json
{
  "polyscript": "1.0",
  "operation": "create|read|update|delete",
  "mode": "simulate|sandbox|live",
  "tool": "ToolName",
  "status": "success|error",
  "data": {},
  "errors": []  // optional
}
```

### 7. Mode Behavior

#### Simulate Mode
- [ ] Shows planned actions without execution
- [ ] Returns action descriptions
- [ ] No side effects
- [ ] Read operations can execute normally

#### Sandbox Mode  
- [ ] Tests prerequisites and permissions
- [ ] Returns validation results
- [ ] No mutations allowed
- [ ] Can call optional `validate_*` methods

#### Live Mode
- [ ] Executes actual operations
- [ ] Requests confirmation for update/delete (unless --force)
- [ ] Returns operation results

### 8. Anti-Patterns to Avoid
- [ ] NO mode checking in business logic (`if context.mode == "simulate"`)
- [ ] NO multiple implementations per operation 
- [ ] NO hardcoded command names
- [ ] NO YAML dependency
- [ ] NO complex agent discovery

### 9. Framework Responsibilities
- [ ] Parse CLI arguments into operation + mode + resource
- [ ] Route to appropriate CRUD method
- [ ] Apply mode-specific wrapping
- [ ] Handle JSON output formatting
- [ ] Process standard flags
- [ ] Manage confirmations

### 10. Developer Responsibilities  
- [ ] Implement only the 4 CRUD methods
- [ ] Return data structures (dicts/objects)
- [ ] Use context helper methods
- [ ] Add rebadging decorators as needed