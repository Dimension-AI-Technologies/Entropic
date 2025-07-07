# Prompt.Magic.md - Universal Magic String Elimination

## Objective
Transform magic strings into type-safe, refactor-friendly enum-based constants across any C# codebase using a systematic, frequency-driven approach.

## Overview
This prompt guides you through a comprehensive magic string elimination process that can be applied to any C# project. The approach prioritizes high-frequency strings, maintains backward compatibility, and establishes robust enum-based infrastructure for long-term maintainability.

## Phase 1: Discovery and Analysis

### 1.1 Automated String Frequency Analysis

**Step 1: Create Discovery Script**
Create `scripts/find-magic-strings.sh`:
```bash
#!/bin/bash
# find-magic-strings.sh - Automated Magic String Discovery

echo "=== Magic String Discovery Report ==="
echo "Generated: $(date)"
echo "Directory: $(pwd)"
echo ""

# Find all quoted strings in C# files, count occurrences, filter 4+ occurrences
echo "Finding strings with 4+ occurrences..."
find . -name "*.cs" -not -path "*/bin/*" -not -path "*/obj/*" -not -path "*/.git/*" \
  -exec grep -ho '"[^"]\{2,\}"' {} \; \
  | sort | uniq -c | sort -nr \
  | awk '$1 >= 4 {print $1 "\t" substr($0, index($0,$2))}' \
  > magic-strings-report.txt

echo "Results saved to magic-strings-report.txt"
echo ""
echo "=== Top 20 Most Frequent Strings ==="
head -20 magic-strings-report.txt
echo ""
echo "Total strings with 4+ occurrences: $(wc -l < magic-strings-report.txt)"
```

**Step 2: Create Categorization Script**
Create `scripts/categorize-strings.sh`:
```bash
#!/bin/bash
# categorize-strings.sh - Categorize discovered strings by domain

echo "=== String Categorization Analysis ==="

# Read the magic strings report
if [[ ! -f magic-strings-report.txt ]]; then
    echo "Run find-magic-strings.sh first to generate magic-strings-report.txt"
    exit 1
fi

# Categorize strings by patterns
echo "Categorizing strings by domain..."

echo "=== CURRENCIES (3-letter codes) ===" > categorized-strings.txt
grep -E '"\s*[A-Z]{3}\s*"' magic-strings-report.txt >> categorized-strings.txt
echo "" >> categorized-strings.txt

echo "=== DAY COUNTS (Act/360, 30/360, etc.) ===" >> categorized-strings.txt
grep -E '"[^"]*([Aa]ct|30|360|365)[^"]*"' magic-strings-report.txt >> categorized-strings.txt
echo "" >> categorized-strings.txt

echo "=== TENORS (1Y, 3M, etc.) ===" >> categorized-strings.txt
grep -E '"[^"]*[0-9]+[DWMY][^"]*"' magic-strings-report.txt >> categorized-strings.txt
echo "" >> categorized-strings.txt

echo "=== TEST METADATA (Category, Component, etc.) ===" >> categorized-strings.txt
grep -E '"(Category|Component|TestType|Unit|Integration|Validation)"' magic-strings-report.txt >> categorized-strings.txt
echo "" >> categorized-strings.txt

echo "=== FILE FORMATS ===" >> categorized-strings.txt
grep -E '"\.[a-z]{2,4}"' magic-strings-report.txt >> categorized-strings.txt
echo "" >> categorized-strings.txt

echo "=== INTERPOLATION/ALGORITHMS ===" >> categorized-strings.txt
grep -E '"[^"]*([Ll]inear|[Cc]ubic|[Ii]nterp|[Ll]og)[^"]*"' magic-strings-report.txt >> categorized-strings.txt
echo "" >> categorized-strings.txt

echo "=== REMAINING UNCATEGORIZED ===" >> categorized-strings.txt
# Create temp files for processing
grep -v -E '"\s*[A-Z]{3}\s*"' magic-strings-report.txt > temp1.txt
grep -v -E '"[^"]*([Aa]ct|30|360|365)[^"]*"' temp1.txt > temp2.txt
grep -v -E '"[^"]*[0-9]+[DWMY][^"]*"' temp2.txt > temp3.txt
grep -v -E '"(Category|Component|TestType|Unit|Integration|Validation)"' temp3.txt > temp4.txt
grep -v -E '"\.[a-z]{2,4}"' temp4.txt > temp5.txt
grep -v -E '"[^"]*([Ll]inear|[Cc]ubic|[Ii]nterp|[Ll]og)[^"]*"' temp5.txt >> categorized-strings.txt

# Cleanup temp files
rm -f temp*.txt

echo "Categorization complete. Results saved to categorized-strings.txt"
```

**Step 3: Create Priority Assessment Script**
Create `scripts/assess-priority.sh`:
```bash
#!/bin/bash
# assess-priority.sh - Assess migration priority based on frequency

echo "=== Magic String Priority Assessment ==="

if [[ ! -f magic-strings-report.txt ]]; then
    echo "Run find-magic-strings.sh first"
    exit 1
fi

echo "CRITICAL PRIORITY (50+ occurrences):" > priority-assessment.txt
awk '$1 >= 50' magic-strings-report.txt >> priority-assessment.txt
echo "" >> priority-assessment.txt

echo "HIGH PRIORITY (20-49 occurrences):" >> priority-assessment.txt
awk '$1 >= 20 && $1 < 50' magic-strings-report.txt >> priority-assessment.txt
echo "" >> priority-assessment.txt

echo "MEDIUM PRIORITY (6-19 occurrences):" >> priority-assessment.txt
awk '$1 >= 6 && $1 < 20' magic-strings-report.txt >> priority-assessment.txt
echo "" >> priority-assessment.txt

echo "LOW PRIORITY (4-5 occurrences):" >> priority-assessment.txt
awk '$1 >= 4 && $1 < 6' magic-strings-report.txt >> priority-assessment.txt

# Generate summary statistics
echo "=== SUMMARY STATISTICS ===" >> priority-assessment.txt
echo "Critical Priority: $(awk '$1 >= 50' magic-strings-report.txt | wc -l) strings" >> priority-assessment.txt
echo "High Priority: $(awk '$1 >= 20 && $1 < 50' magic-strings-report.txt | wc -l) strings" >> priority-assessment.txt
echo "Medium Priority: $(awk '$1 >= 6 && $1 < 20' magic-strings-report.txt | wc -l) strings" >> priority-assessment.txt
echo "Low Priority: $(awk '$1 >= 4 && $1 < 6' magic-strings-report.txt | wc -l) strings" >> priority-assessment.txt

echo "Priority assessment complete. Results saved to priority-assessment.txt"
```

**Step 4: Create Plan Generator Script**
Create `scripts/generate-plan.sh`:
```bash
#!/bin/bash
# generate-plan.sh - Generate initial Plan.Magic.md

echo "=== Generating Plan.Magic.md ==="

if [[ ! -f magic-strings-report.txt ]] || [[ ! -f priority-assessment.txt ]]; then
    echo "Run find-magic-strings.sh and assess-priority.sh first"
    exit 1
fi

PROJECT_NAME=$(basename $(pwd))
TOTAL_STRINGS=$(wc -l < magic-strings-report.txt)
TOTAL_OCCURRENCES=$(awk '{sum += $1} END {print sum}' magic-strings-report.txt)
CRITICAL_COUNT=$(awk '$1 >= 50' magic-strings-report.txt | wc -l)
HIGH_COUNT=$(awk '$1 >= 20 && $1 < 50' magic-strings-report.txt | wc -l)

cat > Plan.Magic.md << EOF
# Plan.Magic.md - Magic String Migration Plan for $PROJECT_NAME

## Executive Summary
Comprehensive magic string elimination plan for $PROJECT_NAME codebase using frequency-driven, systematic approach.

## Discovery Results ($(date +%Y-%m-%d))
- **Total magic strings identified**: $TOTAL_STRINGS strings with 4+ occurrences
- **Total occurrences across codebase**: $TOTAL_OCCURRENCES occurrences
- **Critical priority strings**: $CRITICAL_COUNT strings (50+ occurrences each)
- **High priority strings**: $HIGH_COUNT strings (20-49 occurrences each)

## Implementation Phases

### Phase 1: Infrastructure Setup ⏳
- [ ] Create $PROJECT_NAME.Common constants project
- [ ] Implement StringValue attribute and ToStringValue() extension
- [ ] Add project references across solution
- [ ] Verify build stability

### Phase 2: Critical Priority Migration ⏳
**Target strings (50+ occurrences):**
EOF

# Add critical priority strings to plan
awk '$1 >= 50 {print "- [ ] " substr($0, index($0,$2)) " (" $1 " occurrences)"}' magic-strings-report.txt >> Plan.Magic.md

cat >> Plan.Magic.md << EOF

### Phase 3: High Priority Migration ⏳
**Target strings (20-49 occurrences):**
EOF

# Add high priority strings to plan  
awk '$1 >= 20 && $1 < 50 {print "- [ ] " substr($0, index($0,$2)) " (" $1 " occurrences)"}' magic-strings-report.txt >> Plan.Magic.md

cat >> Plan.Magic.md << EOF

### Phase 4: Medium Priority Migration ⏳
- [ ] Address medium priority strings (6-19 occurrences)
- [ ] Focus on domain-specific patterns

### Phase 5: Low Priority Cleanup ⏳
- [ ] Address remaining strings (4-5 occurrences)
- [ ] Establish continuous discovery process

## Progress Tracking
- ⏳ Phase 1 Infrastructure: Pending
- ⏳ Phase 2 Critical: Pending  
- ⏳ Phase 3 High: Pending
- ⏳ Phase 4 Medium: Pending
- ⏳ Phase 5 Low: Pending

## Next Steps
1. Run \`scripts/find-magic-strings.sh\` to refresh analysis
2. Review categorized-strings.txt for domain-specific patterns
3. Begin Phase 1 infrastructure setup
4. Execute systematic migration following priority order

---
*Generated by Prompt.Magic.md automated discovery process*
EOF

echo "Plan.Magic.md generated successfully!"
echo "Review the plan and begin with Phase 1 infrastructure setup."
```

**Step 5: Run Discovery Process**
```bash
# Make scripts executable
chmod +x scripts/*.sh

# Run complete discovery process
./scripts/find-magic-strings.sh
./scripts/categorize-strings.sh  
./scripts/assess-priority.sh
./scripts/generate-plan.sh
```

- **Search Strategy**: Automated discovery using shell scripts to find all hardcoded strings with 4+ occurrences
- **Analysis Tools**: Custom scripts using grep, awk, and sort for comprehensive frequency analysis
- **Categorization**: Automated pattern matching to group strings by domain:
  - Business logic constants (currencies, tenors, day counts)
  - Configuration values (environment names, connection strings)
  - Test metadata (categories, components, test types)
  - UI strings (labels, messages, formats)
  - File formats and extensions
  - API endpoints and routes

### 1.2 Priority Assessment
- **Critical Priority**: 50+ occurrences - immediate attention required
- **High Priority**: 20-49 occurrences - schedule for next sprint
- **Medium Priority**: 6-19 occurrences - plan for upcoming iterations
- **Low Priority**: 4-5 occurrences - address during maintenance windows

### 1.3 Create Plan.Magic.md
Generate a comprehensive migration plan with:
```markdown
# Plan.Magic.md - Magic String Migration Plan

## String Frequency Analysis Results
- Total magic strings identified: [count]
- Total occurrences across codebase: [count]
- Critical priority strings: [count]
- High priority strings: [count]

## Implementation Phases
- Phase 1: Infrastructure Setup
- Phase 2: Critical Priority Migration ([list top strings])
- Phase 3: High Priority Migration ([list strings])
- Phase 4: Medium Priority Migration
- Phase 5: Low Priority Cleanup

## Progress Tracking
- ✅ Phase 1 Infrastructure: [status]
- 🔄 Phase 2 Critical: [progress]
- ⏳ Phase 3 High: [pending]
```

## Phase 2: Infrastructure Setup

### 2.1 Create Common Constants Project
Create a dedicated project for shared constants:
```
[SolutionName].Common/
├── [SolutionName].Common.csproj
└── Constants/
    ├── StringEnums.cs
    └── [Domain]Constants.cs
```

### 2.2 Design Enum Architecture
Implement the StringValue pattern:
```csharp
[AttributeUsage(AttributeTargets.Field, AllowMultiple = false)]
public sealed class StringValueAttribute : Attribute
{
    public string Value { get; }
    public StringValueAttribute(string value) => Value = value;
}

public static class EnumExtensions
{
    public static string ToStringValue(this Enum value)
    {
        var field = value.GetType().GetField(value.ToString());
        var attribute = field?.GetCustomAttribute<StringValueAttribute>();
        return attribute?.Value ?? value.ToString();
    }
}
```

### 2.3 Project Dependencies
- Add [SolutionName].Common references to all projects using constants
- Update using statements: `using [SolutionName].Common.Constants;`
- Verify build stability after dependency changes

## Phase 3: Systematic Migration

### 3.1 Enum Definition Strategy
For each string category, create comprehensive enums:
```csharp
/// <summary>
/// [Domain] constants for [purpose]
/// </summary>
public enum [CategoryName]
{
    [StringValue("custom-string")]
    EnumMemberName,
    
    // Use StringValue only when string differs from enum name
    StandardEnumMember  // Uses enum name as string
}
```

### 3.2 Migration Patterns

**Before (Magic Strings):**
```csharp
var currency = "USD";
if (currency == "USD" || currency == "EUR") { }
var dayCount = factory.GetConvention("Act/360");
```

**After (Enum-Based):**
```csharp
var currency = CurrencyCode.USD;
if (currency == CurrencyCode.USD || currency == CurrencyCode.EUR) { }
var dayCount = factory.GetConvention(DayCountConvention.Act360.ToStringValue());
```

**Test Trait Migration:**
```csharp
// Before
[Trait("Category", "Unit")]

// After  
[Trait(nameof(TestMetadata.Category), nameof(TestCategory.Unit))]
```

### 3.3 Migration Execution Order
1. **Critical Priority Strings**: Address immediately for maximum impact
2. **Infrastructure Files**: Update core services and factories first
3. **Test Files**: Migrate test constants for better organization
4. **Business Logic**: Update domain-specific string usage
5. **Configuration**: Transform environment and setup strings

### 3.4 Validation After Each Phase
- Run full test suite to verify no regressions
- Check build stability across all projects
- Validate API backward compatibility
- Update Plan.Magic.md with completion status

## Phase 4: Advanced Patterns

### 4.1 I/O Boundary Pattern
Keep enums in domain layer, convert to strings only at boundaries:
```csharp
// Domain Layer
public InstrumentType InstrumentType => InstrumentType.InterestRateSwap;

// I/O Layer  
public string SerializeInstrumentType() => InstrumentType.ToStringValue();
```

### 4.2 Factory Pattern Updates
Update factory classes to use enum-based constants:
```csharp
public class ConventionFactory
{
    private readonly Dictionary<string, IConvention> _conventions = new()
    {
        [ConventionType.Standard.ToStringValue()] = new StandardConvention(),
        [ConventionType.Enhanced.ToStringValue()] = new EnhancedConvention()
    };
}
```

### 4.3 Error Message Enhancement
Make error messages dynamic and maintainable:
```csharp
// Before
InvalidInput => "Use supported formats (json, yaml, xml)"

// After  
InvalidInput => $"Use supported formats ({FileFormat.Json.ToStringValue()}, {FileFormat.Yaml.ToStringValue()}, {FileFormat.Xml.ToStringValue()})"
```

## Phase 5: Quality Assurance

### 5.1 Comprehensive Testing
- Run full test suite including integration tests
- Verify all string-based APIs still function correctly
- Test serialization/deserialization scenarios
- Validate configuration loading and environment detection

### 5.2 Performance Validation
- Ensure ToStringValue() performance is acceptable
- Consider caching for high-frequency string conversions
- Profile memory usage of enum-based constants

### 5.3 Documentation Updates
- Update API documentation with new enum patterns
- Create developer guidelines for future string constants
- Document migration patterns for team reference

## Phase 6: Continuous Discovery

### 6.1 Re-run Analysis
Periodically re-execute string frequency analysis to find:
- New magic strings introduced since last cleanup
- Previously missed string patterns
- Strings that have increased in frequency

### 6.2 Plan.Magic.md Maintenance
Keep Plan.Magic.md updated with:
- New phases for discovered strings
- Progress tracking for ongoing work
- Success metrics and completion status
- Lessons learned and pattern improvements

## Success Criteria

### ✅ Technical Objectives
- Zero magic strings with 4+ occurrences
- Type-safe, IntelliSense-supported constants
- Maintained backward compatibility
- No test regressions or build failures

### ✅ Quality Improvements  
- Enhanced developer experience with autocomplete
- Improved refactoring safety across codebase
- Reduced string-related bugs and typos
- Better code organization and maintainability

### ✅ Process Documentation
- Comprehensive Plan.Magic.md with migration history
- Clear patterns for future string constant management
- Team guidelines for enum-based development
- Automated tools for ongoing string discovery

## Usage Instructions

1. **Initial Analysis**: Run string frequency analysis and create Plan.Magic.md
2. **Infrastructure Setup**: Create common constants project and enum architecture
3. **Phased Migration**: Execute systematic migration starting with critical priority strings
4. **Continuous Improvement**: Periodically re-run analysis and update Plan.Magic.md
5. **Knowledge Transfer**: Document patterns and train team on enum-based development

## Expected Timeline

- **Week 1**: Discovery and infrastructure setup
- **Week 2-3**: Critical and high priority string migration  
- **Week 4**: Medium priority cleanup and quality assurance
- **Ongoing**: Continuous discovery and maintenance

This process scales to any C# codebase size and can be adapted to specific domain requirements while maintaining the core principles of type safety, maintainability, and systematic progression.