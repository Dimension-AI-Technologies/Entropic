# PolyScript Frameworks

This directory contains the complete PolyScript framework implementations for all supported languages.

## Available Frameworks

### Core Languages (Production Ready)

- **[python/](python/)** - Click-based framework with decorator pattern
- **[csharp/](csharp/)** - Spectre.Console framework with interfaces
- **[fsharp/](fsharp/)** - Argu-based framework with computation expressions
- **[rust/](rust/)** - clap-based framework with traits and derive macros
- **[go/](go/)** - cobra-based framework with struct interfaces
- **[nodejs/](nodejs/)** - yargs-based framework with classes and functions
- **[ruby/](ruby/)** - thor-based framework with metaprogramming

### Experimental

- **[experimental/](experimental/)** - PowerShell prototypes and other experiments

## Framework Structure

Each framework directory contains:
- **Framework implementation** - The core PolyScript framework for that language
- **Example implementation** - A complete working example (backup tool)
- **Documentation** - Usage examples and getting started guide

## Getting Started

1. Choose your preferred language from the directories above
2. Copy both the framework file and example to your project
3. Modify the example to implement your specific tool logic
4. Run with standard PolyScript modes: `status`, `test`, `sandbox`, `live`

## Consistency Guarantee

All frameworks provide:
- Identical CLI interface patterns
- Same four execution modes
- Standard flags (`--json`, `--verbose`, `--force`)
- Compatible JSON output format
- Consistent error handling

## Language-Specific Benefits

Each framework uses the best CLI library and patterns for its language:
- **Python**: Click's decorator elegance
- **C#**: Spectre.Console's rich console features
- **F#**: Functional programming with Argu
- **Rust**: Zero-cost abstractions with clap
- **Go**: Simple interfaces with cobra
- **Node.js**: Async/await with yargs
- **Ruby**: Metaprogramming with thor

Choose the language that best fits your team's expertise and project requirements.