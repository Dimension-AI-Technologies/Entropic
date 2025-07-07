# .NET Solution Upgrade Prompt

## Objective
Systematically upgrade .NET solutions to modern formats and latest package versions while maintaining build integrity and fixing any breaking changes.

## Prerequisites
- SequentialThinking MCP Server for analysis and planning
- Context7 MCP Server for breaking change resolution
- Access to `dotnet outdated` tool

## Phase 1: Solution Format Modernization (.NET 8+)

### 1.1 Discovery and Analysis
Use SequentialThinking to:
1. **Identify all solution files**: Find all `.sln` files in the repository
2. **Analyze solution structure**: Document current solution organization and project relationships
3. **Plan naming strategy**: Design systematic naming convention for `.slnx` files
4. **Assess migration complexity**: Identify potential issues with solution format upgrade

### 1.2 Solution File Upgrade
For each `.sln` file found:
1. **Convert to .slnx format**:
   ```bash
   dotnet sln <solution>.sln migrate
   ```
2. **Rename systematically**:
   - Master solution: `{SolutionName}.slnx`
   - Component solutions: `{SolutionName}.{Component}.slnx`
   - Sub-component solutions: `{SolutionName}.{Component}.{SubComponent}.slnx`
3. **Verify conversion**: Ensure all projects are correctly referenced
4. **Delete original .sln files** after successful migration

### 1.3 Build Verification
1. **Test master solution**: `dotnet build {SolutionName}.slnx`
2. **Verify zero errors**: Address any compiler errors from format conversion
3. **Document changes**: Record any issues encountered and resolutions

## Phase 2: Package Upgrade (All .NET Versions)

### 2.1 Package Analysis
Use SequentialThinking to:
1. **Inventory solutions**: List all `.slnx` and `.sln` files to upgrade
2. **Plan upgrade sequence**: Determine optimal order (dependencies first)
3. **Identify risk packages**: Flag packages known for breaking changes

### 2.2 Package Upgrades
For each solution file:
1. **Run outdated analysis**:
   ```bash
   dotnet outdated --upgrade {solution-file}
   ```
2. **Review upgrade recommendations**: Use SequentialThinking to assess impact
3. **Apply upgrades**: Execute the recommended package updates
4. **Build and test**: `dotnet build {solution-file}`

### 2.3 Breaking Change Resolution
When build errors occur:
1. **Use Context7 MCP**: Leverage Context7 for intelligent breaking change analysis
2. **Fix compilation errors**: Address API changes, deprecated methods, etc.
3. **Verify functionality**: Ensure upgrades don't break existing behavior
4. **Document fixes**: Record breaking changes and their resolutions

## Phase 3: Continuous Integration

### 3.1 Iterative Process
1. **Upgrade in batches**: Don't upgrade all packages simultaneously
2. **Test after each batch**: Verify builds remain clean
3. **Address issues immediately**: Fix breaking changes before proceeding
4. **Document progress**: Track completed upgrades and remaining work

### 3.2 Final Verification
1. **Build all solutions**: Ensure every `.slnx`/`.sln` compiles cleanly
2. **Run tests**: Execute test suites to verify functionality
3. **Performance check**: Verify no significant performance regressions
4. **Documentation update**: Update project documentation with new versions

## Execution Strategy

### Sequential Thinking Usage
Create SequentialThinking sessions for:
- **Initial analysis**: `upgrade-analysis-{timestamp}.md`
- **Migration planning**: `migration-plan-{timestamp}.md`
- **Package upgrade strategy**: `package-strategy-{timestamp}.md`
- **Breaking change resolution**: `breaking-changes-{timestamp}.md`

### Error Handling
1. **Rollback strategy**: Keep backups of working package versions
2. **Incremental approach**: Upgrade one major component at a time
3. **Context7 integration**: Use for complex breaking change scenarios
4. **Documentation**: Record all issues and their resolutions

## Success Criteria
- [ ] All `.sln` files converted to `.slnx` (for .NET 8+)
- [ ] Systematic naming convention applied
- [ ] All packages upgraded to latest compatible versions
- [ ] Zero compilation errors across all solutions
- [ ] All tests passing
- [ ] Performance maintained or improved
- [ ] Documentation updated with new versions

## Output Requirements
1. **Migration Report**: Document all solution format changes
2. **Package Upgrade Log**: List all package version changes
3. **Breaking Changes Summary**: Document all fixes applied
4. **Final Verification Report**: Confirm all solutions build cleanly
5. **Updated Documentation**: Reflect new package versions and requirements

## Example Execution
```bash
# Phase 1: Convert solutions (if .NET 8+)
dotnet sln MyProject.sln migrate
mv MyProject.slnx MyProject.Core.slnx

# Phase 2: Upgrade packages
dotnet outdated --upgrade MyProject.Core.slnx
dotnet build MyProject.Core.slnx

# Phase 3: Fix any breaking changes with Context7 assistance
# ... resolve compilation errors ...

# Final verification
dotnet build MyProject.Core.slnx
```

## Notes
- Use SequentialThinking for complex decision-making and planning
- Leverage Context7 for breaking change analysis and resolution
- Maintain incremental approach to minimize risk
- Document everything for future reference and team knowledge