# PolyScript Context

## Team Constraints

**Small team** (1-3 developers) needing **high productivity** for internal tooling and automation.

## Resource Limitations

- **Time**: Minutes to build tools, not hours
- **Expertise**: Varying language proficiency across team
- **Maintenance**: No bandwidth for framework maintenance
- **Documentation**: Minimal time for writing usage docs

## Tool Requirements

**Internal productivity tools** with these characteristics:
- Quick to build and modify
- Consistent interfaces for team adoption
- Machine-readable output for automation
- Reliable error handling without debugging
- Self-documenting through help text

## Multi-Language Reality

Team works across Python, C#, F#, Rust based on:
- Existing codebases
- Performance requirements  
- Library ecosystems
- Developer preferences

Need consistent patterns regardless of implementation language.

## Automation Context

Tools must integrate into:
- CI/CD pipelines
- Monitoring systems
- Deployment automation
- Development workflows

JSON output enables seamless tool chaining and system integration.

## Success Context

PolyScript succeeds when a developer can:
1. Choose any supported language
2. Write 5 lines of business logic
3. Get a production-ready CLI tool
4. Have it integrate with existing automation
5. Move on to the next problem