# PolyScript Design Document

> One Standard, Many Languages - A behavioral standard for CLI tools

## Table of Contents
1. [Introduction](#introduction)
2. [Background & Problem Statement](#background--problem-statement)
3. [Design Philosophy](#design-philosophy)
4. [Core Concepts](#core-concepts)
5. [The Standard](#the-standard)
6. [Why "PolyScript"?](#why-polyscript)
7. [Industry Precedents](#industry-precedents)
8. [Design Decisions](#design-decisions)
9. [Future Vision](#future-vision)

## Introduction

PolyScript is a behavioral standard for command-line interface (CLI) tools that ensures consistency across different programming languages while allowing each language to use its natural idioms. It defines what scripts should do, not how they should do it.

## Background & Problem Statement

### The Challenge We Discovered

While working on various utility scripts across our organization, we encountered recurring problems:
- Different scripts in different languages (Python, PowerShell, F#, etc.)
- Each with different CLI interfaces and behaviors
- No consistency across tools
- Duplicated effort implementing common patterns
- Users had to learn different interfaces for similar tools

### Common Patterns Emerged

We noticed our scripts needed similar functionality:
- **Operations**: Create, Read, Update, Delete (CRUD)
- **Execution Modes**: 
  - `status` - Show current state
  - `test` - Simulate changes
  - `sandbox` - Test resources/connectivity
  - `live` - Actually execute changes

### Initial Investigation

We examined existing scripts and found:
- Each implemented similar patterns differently
- No shared vocabulary or conventions
- Testing and validation were inconsistent
- Documentation varied wildly

This led to the fundamental question: **Can we standardize CLI tool behavior across languages?**

## Design Philosophy

### Core Principles

1. **Behavioral Contract, Not Code Contract**
   - Define what tools should do, not how they implement it
   - Languages use their natural idioms and strengths

2. **Pragmatic Over Perfect**
   - 80% consistency is better than 100% conformity
   - Real-world usability trumps theoretical purity

3. **Declarative Over Imperative**
   - Describe desired outcomes
   - Let implementations handle details

4. **Respect Language Ecosystems**
   - Don't fight language conventions
   - Use native argument parsing libraries
   - Follow community standards

## Core Concepts

### The Three Layers

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Declaration   │────▶│    PolyScript    │────▶│ Implementation  │
│  (YAML Spec)    │     │    Standard      │     │ (Any Language)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘

polyscript.yaml         Behavioral Contract      script.py/.ps1/.fsx
```

### Standard Modes

Every PolyScript-compliant tool supports four execution modes:

1. **Status Mode** (default)
   - Read-only operation
   - Shows current state
   - No side effects
   - Safe to run anytime

2. **Test Mode**
   - Simulates all operations
   - Shows what would happen
   - No actual changes made
   - Validates configuration

3. **Sandbox Mode**
   - Tests external dependencies
   - Verifies connectivity
   - Downloads to temporary locations
   - Validates resources exist

4. **Live Mode**
   - Executes actual changes
   - Modifies system state
   - Should respect --force flag
   - Returns success/failure clearly

### Standard Operations (Optional)

Tools may implement relevant CRUD operations:
- **Create/Add** - Add new resources
- **Read/List** - Display existing resources
- **Update/Modify** - Change existing resources
- **Delete/Remove** - Remove resources
- **Verify** - Check configuration validity
- **Migrate** - Transform between versions

## The Standard

### Required Elements

All PolyScript-compliant scripts MUST:

1. **Support Standard Modes**
   ```bash
   script --mode status    # Show current state (default)
   script --mode test      # Simulate changes
   script --mode sandbox   # Test resources
   script --mode live      # Execute changes
   ```

2. **Use Consistent Flags**
   - `--verbose/-v` - Detailed output
   - `--force/-f` - Skip confirmations
   - `--json` - JSON output for automation

3. **Return Standard Exit Codes**
   - `0` - Success
   - `1` - Failure
   - JSON to stdout when --json specified
   - Errors to stderr

4. **Provide Clear Help**
   - `--help` must document all modes
   - Examples should be included
   - Purpose should be clear

### Optional Elements

Scripts MAY also:
- Support `--dry-run` as alias for `--mode test`
- Provide `--output FORMAT` for multiple output formats
- Include `--quiet/-q` for minimal output
- Add domain-specific flags as needed

## Why "PolyScript"?

### Name Selection Process

We evaluated several names against 10 criteria:
- Clarity, Searchability, Professionalism
- Memorability, Brevity, Tech Appeal
- Trademark Risk, Pronunciation
- Future-proof, Descriptiveness

### Final Scores (out of 50)

1. **PolyScript** - 48/50 ⭐ SELECTED
2. ScriptSpec - 46/50
3. UniScript - 43/50
4. OmniScript - 42/50
5. MetaScript - 42/50

### Why PolyScript Won

- **Perfect meaning**: "Poly" (many) + "Script" immediately conveys multi-language support
- **No trademark issues**: Clean and available
- **Professional**: Sounds like a serious developer tool
- **Searchable**: "PolyScript framework" is unique
- **Technical accuracy**: "Polyglot" already used in programming
- **Great tagline**: "PolyScript: One Standard, Many Languages"

## Industry Precedents

PolyScript follows proven architectural patterns:

### Similar Successful Approaches

1. **Terraform** (HashiCorp)
   - HCL defines desired state
   - Providers implement in any language
   - Standard CLI interface across providers

2. **Kubernetes**
   - YAML manifests declare desired state
   - Controllers can be written in any language
   - kubectl provides consistent interface

3. **GitHub Actions**
   - YAML workflow definitions
   - Actions implemented in any language
   - Standard inputs/outputs contract

4. **NixOS**
   - Nix expressions declare configuration
   - Builders can be any executable
   - Consistent interface regardless of implementation

### The Common Pattern

All successful cross-language tools share:
```
Declaration → Protocol/Interface → Implementation
```

PolyScript applies this proven pattern to CLI tools.

## Design Decisions

### Why Not a Library?

We considered creating language-specific libraries but rejected this because:
- Maintenance burden across languages
- Version synchronization challenges
- Limits language-specific optimizations
- Forces unnatural patterns in some languages

### Why Not Code Generation?

Code generation was appealing but ultimately rejected:
- Generated code is hard to debug
- Customization becomes difficult
- Loses language-specific benefits
- Additional build step complexity

### Why Behavioral Standards?

Behavioral standards won because:
- No runtime dependencies
- Languages use native features
- Easy to test compliance
- Simple to understand
- Proven pattern in industry

### Why These Specific Modes?

The four modes emerged from analyzing common script patterns:
- **Status**: Universal need to check current state
- **Test**: Critical for safety in production
- **Sandbox**: Validates external dependencies
- **Live**: The actual work

These cover 95% of script use cases while remaining simple.

## Future Vision

### Near Term (2024)
- Validation tools for compliance testing
- Language-specific templates
- CI/CD integration helpers
- Community-contributed examples

### Medium Term (2025)
- PolyScript registry for discovering tools
- Automated documentation generation
- IDE plugins for PolyScript development
- Certification program

### Long Term (2026+)
- AI-assisted script generation from specs
- Cross-language testing frameworks
- PolyScript as a recognized standard
- Integration with major cloud providers

### The LLM Connection

As noted in the cross-platform development paper, LLMs change everything:
- PolyScript specs become prompts
- "Generate a PolyScript-compliant tool that..."
- Validation ensures AI follows standards
- Natural language becomes the new "source code"

## Conclusion

PolyScript represents a pragmatic approach to multi-language CLI standardization:
- Learn from history (don't repeat failures)
- Follow proven patterns (declaration → implementation)
- Embrace language differences
- Focus on user experience
- Prepare for an AI-assisted future

By defining behavior instead of implementation, PolyScript enables:
- Consistent user experience across tools
- Rapid development with templates
- Easy validation and testing
- Future-proof design for AI generation

The goal isn't perfection—it's practical standardization that makes developers' and users' lives easier.

---

*Consolidated from: CROSS_LANGUAGE_CLI_FRAMEWORK.md, NAMING_ANALYSIS.md, and PolyScript_Framework.md on 2025-01-02*