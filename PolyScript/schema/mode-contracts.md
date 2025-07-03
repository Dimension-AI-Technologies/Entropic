# PolyScript Mode Behavioral Contracts

## Overview

This document defines the behavioral contracts for the four PolyScript execution modes. All PolyScript-compliant tools must implement these contracts consistently across languages.

## Mode Contracts

### Status Mode
**Purpose**: Show current state without making changes  
**Contract**:
- MUST be read-only (no side effects)
- MUST return current operational state
- SHOULD include version/configuration information
- SHOULD return quickly (performance depends on implementation)
- MUST NOT require user interaction

**Typical Output**:
```json
{
  "operational": true,
  "last_check": "2024-01-01T12:00:00Z",
  "version": "1.0.0",
  "configuration": {...}
}
```

### Test Mode
**Purpose**: Simulate operations without executing them  
**Contract**:
- MUST be safe (no side effects)
- MUST show what would happen in live mode
- SHOULD validate inputs and prerequisites
- SHOULD estimate impact/duration
- MUST NOT require user interaction

**Typical Output**:
```json
{
  "planned_operations": [
    {"operation": "backup", "files": 100, "size_mb": 250}
  ],
  "estimated_operations": 100,
  "note": "No changes made in test mode"
}
```

### Sandbox Mode  
**Purpose**: Test dependencies and environment  
**Contract**:
- MUST validate all dependencies
- MUST test environment prerequisites
- SHOULD check permissions and access
- SHOULD verify external services
- MUST report all test results

**Typical Output**:
```json
{
  "dependency_tests": {
    "node": "passed",
    "disk_space": "passed", 
    "network": "failed"
  },
  "all_passed": false
}
```

### Live Mode
**Purpose**: Execute actual operations  
**Contract**:
- MUST perform real operations
- MUST respect --force flag for confirmations
- SHOULD provide progress feedback
- MUST handle errors gracefully
- SHOULD be atomic where possible

**Typical Output**:
```json
{
  "operation": "backup_completed",
  "files_processed": 100,
  "bytes_transferred": 262144000,
  "completed": true
}
```

## Standard Flags

All modes must support:
- `--json`: Output in PolyScript v1.0 JSON format
- `--verbose`: Include detailed logging
- `--force`: Skip confirmation prompts (live mode only)

## Error Handling

- Tools MUST exit with non-zero code on errors
- JSON output MUST include error details in `errors` array
- Console output SHOULD be user-friendly
- Errors MUST NOT expose sensitive information

## Cross-Language Consistency

The same tool implemented in different languages MUST:
- Accept identical command-line arguments
- Produce equivalent JSON output
- Follow the same behavioral contracts
- Handle errors consistently