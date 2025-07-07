# Compiled Domain Driven Development

## The Problem

Domain Driven Development (DDD) models data and behaviour abstractly before implementation. You design in UML, generate code, develop, then repeat.

This breaks because:
- UML doesn't compile, so you can't validate designs
- Code generation fails silently 
- You're locked into languages with UML generators
- Teams fight over abstract models that may not work

## The Solution

Skip UML. Model domains directly in a compilable language. Use AI to generate and validate the models.

**Requirements:**
1. Universal systems language that compiles to libraries
2. AI agent that generates and compiles domain models  
3. FFI to expose models to any language

## Why Zig

Three languages work: C, Rust, Zig.

- **C:** Universal but primitive types
- **Rust:** Good types but complex for AI  
- **Zig:** Simple syntax, good types, universal compatibility

Zig wins because:
- 580-line grammar (easy for AI)
- Compiles domain models at build time
- Includes C compiler for seamless FFI
- Builds for any platform

## How It Works

1. **Describe domain to AI:** "Customer can be activated if pending"
2. **AI generates Zig code:**
```zig
const Customer = struct {
    status: CustomerStatus,
    pub fn activate(self: *Customer) !void {
        if (self.status != .Pending) return DomainError.InvalidStateTransition;
        self.status = .Active;
    }
};
```
3. **Compile immediately** to validate domain rules
4. **Export via FFI** to any language

## Results

Tested across 16 languages. Works even for unknown languages, proving the approach.

## Why This Matters

- No more broken UML pipelines
- Domain models that actually compile
- One library, any language
- AI does the hard work

Current solutions (Protocol Buffers, gRPC) only handle data. This handles full domain logic.

*Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>*