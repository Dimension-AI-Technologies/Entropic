# PolyScript Implementation Plan

## 1. 🔴 Audit Existing Frameworks Against Updated Design
### 1.1 🔴 Design Compliance Checklist
- 1.1.1 🔴 Create compliance checklist from Architecture.md
- 1.1.2 🔴 Define CRUD × Modes requirements
- 1.1.3 🔴 Document code-based rebadging patterns
- 1.1.4 🔴 List anti-patterns to remove

### 1.2 🔴 Python Framework Audit
- 1.2.1 🟢 Remove YAML dependency
- 1.2.2 🔴 Verify CRUD operations match spec
- 1.2.3 🔴 Verify mode wrapping matches spec
- 1.2.4 🔴 Remove discovery complexity
- 1.2.5 🔴 Fix any design deviations

### 1.3 🔴 C# Framework Audit
- 1.3.1 🔴 Remove YAML/YamlDotNet dependency
- 1.3.2 🔴 Verify CRUD operations match spec
- 1.3.3 🔴 Verify mode wrapping matches spec
- 1.3.4 🔴 Simplify discovery to basic JSON
- 1.3.5 🔴 Fix any design deviations

### 1.4 🔴 F# Framework Audit
- 1.4.1 🔴 Remove YAML dependency
- 1.4.2 🔴 Verify CRUD operations match spec
- 1.4.3 🔴 Verify mode wrapping matches spec
- 1.4.4 🔴 Simplify discovery
- 1.4.5 🔴 Fix any design deviations

### 1.5 🔴 Rust Framework Audit
- 1.5.1 🔴 Remove serde_yaml dependency
- 1.5.2 🔴 Verify CRUD operations match spec
- 1.5.3 🔴 Verify mode wrapping matches spec
- 1.5.4 🔴 Simplify discovery
- 1.5.5 🔴 Fix any design deviations

## 2. 🔴 Complete Remaining Frameworks (Following Audited Design)
### 2.1 🟡 Go Framework
- 2.1.1 🟡 Implement CRUD × Modes per spec
- 2.1.2 🔴 Add code-based rebadging
- 2.1.3 🔴 Create minimal example

### 2.2 🔴 Node.js Framework
- 2.2.1 🔴 Implement CRUD × Modes per spec
- 2.2.2 🔴 Add decorator rebadging
- 2.2.3 🔴 Create minimal example

### 2.3 🔴 Ruby Framework
- 2.3.1 🔴 Implement CRUD × Modes per spec
- 2.3.2 🔴 Add DSL rebadging
- 2.3.3 🔴 Create minimal example

### 2.4 🔴 PowerShell Framework
- 2.4.1 🔴 Implement CRUD × Modes per spec
- 2.4.2 🔴 Add attribute rebadging
- 2.4.3 🔴 Create minimal example

### 2.5 🔴 Haskell Framework
- 2.5.1 🔴 Implement CRUD × Modes per spec
- 2.5.2 🔴 Add type-based rebadging
- 2.5.3 🔴 Create minimal example

## 3. 🔴 Unified Examples & Documentation
### 3.1 🔴 Common Example
- 3.1.1 🔴 Design one example that works across all languages
- 3.1.2 🔴 Keep under 100 lines
- 3.1.3 🔴 Demonstrate all 12 behaviors

### 3.2 🔴 Core Documentation
- 3.2.1 🔴 5-minute quickstart
- 3.2.2 🔴 Language comparison table
- 3.2.3 🔴 Common pitfalls/anti-patterns

## 4. 🔴 Validation
### 4.1 🔴 Cross-Language Consistency
- 4.1.1 🔴 Same commands → same behavior
- 4.1.2 🔴 Same JSON output structure
- 4.1.3 🔴 Rebadging works identically

### 4.2 🔴 Design Compliance Testing
- 4.2.1 🔴 All 12 operation×mode combinations work
- 4.2.2 🔴 Context object provides correct helpers
- 4.2.3 🔴 No mode-checking in business logic