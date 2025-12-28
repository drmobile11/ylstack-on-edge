# Kiro AI Steering Configuration

This directory contains machine-readable YAML configuration files for Kiro AI's behavioral steering system. These files define how Kiro AI should interact with the Edge Starter Kit codebase.

## 📁 File Structure

```
.kiro/steering/
├── edge-compatibility.yaml  # Edge runtime constraints and pattern detection
├── workflows.yaml           # Step-by-step task workflows with templates
├── communication.yaml       # Communication style and response templates
└── README.md               # This file
```

## 📄 Configuration Files

### 1. `edge-compatibility.yaml`

**Purpose**: Enforce edge runtime compatibility by detecting forbidden patterns and promoting Web Standard APIs.

**Contains**:
- **Forbidden Patterns**: Node.js APIs that break edge compatibility (fs, path, process.env, etc.)
- **Required Patterns**: Best practices like dependency injection (c.get('db'))
- **Response Templates**: Structured error messages with solutions
- **Validation Criteria**: Success checks for edge compatibility

**Use Case**: Automatically detect and prevent edge incompatibilities before deployment.

**Example Pattern**:
```yaml
forbidden_patterns:
  - pattern: "import.*from ['\"]fs['\"]"
    message: "File system APIs are not available in edge runtimes"
    suggestion: "Use edge-compatible storage (R2, Vercel Blob)"
```

---

### 2. `workflows.yaml`

**Purpose**: Define step-by-step workflows for common development tasks.

**Contains**:
- **4 Complete Workflows**:
  1. Add API Route (6 steps)
  2. Add Frontend Page (2 steps)
  3. Fix Edge Incompatibility (3 diagnostic steps)
  4. Database Migration (5 steps)
- **Code Templates**: Ready-to-use code snippets with placeholders
- **Validation Checklists**: Verify each step is completed correctly
- **Selection Guide**: Map user intents to appropriate workflows

**Use Case**: Guide developers through complex tasks with consistent patterns.

**Example Workflow**:
```yaml
workflows:
  - id: add-api-route
    steps:
      - step: 1
        action: "Define contract in shared/routes.ts"
        template: |
          export const {entityName}Schema = z.object({
            id: z.string().uuid(),
            createdAt: z.string().datetime()
          });
```

---

### 3. `communication.yaml`

**Purpose**: Define how Kiro AI should communicate with developers.

**Contains**:
- **Communication Principles**: Concise, educational, solution-oriented
- **Response Structures**: Templates for errors, workflows, diagnostics
- **Tone Guidelines**: How to frame corrections and suggestions
- **Context-Aware Responses**: Different approaches for first-time vs repeated issues
- **Terminology Standards**: Preferred terms and definitions
- **Code Example Guidelines**: Format for before/after examples

**Use Case**: Ensure consistent, helpful, and respectful AI interactions.

**Example Response Template**:
```yaml
response_structures:
  - type: "error_correction"
    format: |
      ❌ **{error_type}**
      
      **Issue**: {brief_description}
      **Why**: {explanation}
      
      **Solution**:
      ```typescript
      // ❌ Current
      {current_code}
      
      // ✅ Fixed
      {fixed_code}
      ```
```

## 🎯 How Kiro AI Uses These Files

1. **Pattern Detection**: Scans code against forbidden/required patterns in `edge-compatibility.yaml`
2. **Workflow Selection**: Matches user intent to workflows in `workflows.yaml`
3. **Response Generation**: Uses templates from `communication.yaml` for consistent messaging
4. **Validation**: Checks code against success criteria before suggesting completion

## 🔧 Customization

### Adding New Forbidden Patterns

Edit `edge-compatibility.yaml`:

```yaml
forbidden_patterns:
  - pattern: "your-regex-pattern"
    message: "Why this is forbidden"
    suggestion: "What to use instead"
```

### Adding New Workflows

Edit `workflows.yaml`:

```yaml
workflows:
  - id: your-workflow-id
    name: "Your Workflow Name"
    steps:
      - step: 1
        action: "What to do"
        template: |
          // Code template here
```

### Customizing Communication

Edit `communication.yaml`:

```yaml
response_structures:
  - type: "your-response-type"
    format: |
      Your template with {placeholders}
```

## 📖 Related Documentation

- **Root Level**: `.kirorules` - Human-readable rules for Kiro AI
- **Edge Stack**: `.edge-stack/` - Project architecture and constraints
- **Other AI Configs**: `.cursorrules`, `.clinerules`, `.windsurfrules`, `.naorules`

## 🚀 Best Practices

1. **Keep patterns specific**: Avoid overly broad regex patterns
2. **Provide context**: Always explain WHY something is forbidden
3. **Offer alternatives**: Never just say "don't do X" - suggest "do Y instead"
4. **Test patterns**: Verify regex patterns match intended code
5. **Update together**: Keep YAML files in sync with `.kirorules`

## 🔍 Pattern Syntax

Patterns use PCRE-compatible regex:

- `.` - Any character
- `*` - Zero or more of previous
- `+` - One or more of previous
- `?` - Zero or one of previous
- `|` - OR operator
- `[]` - Character class
- `()` - Capture group
- `\\` - Escape special characters

**Example**:
```yaml
pattern: "import.*\\{.*db.*\\}.*from ['\"].*server/db['\"]"
```

Matches:
- `import { db } from '../../../server/db'`
- `import { db, migrate } from '@/server/db'`

## 📊 Validation Workflow

```
1. Code Change Detected
   ↓
2. Scan Against Forbidden Patterns (edge-compatibility.yaml)
   ↓
3. If violation found → Use Response Template
   ↓
4. Suggest Workflow (workflows.yaml)
   ↓
5. Format Response (communication.yaml)
   ↓
6. Validate Fix Against Required Patterns
   ↓
7. Confirm Success ✅
```

## 🎓 Learning Resources

- **Edge Constraints**: `.edge-stack/requirements.md`
- **Architecture**: `.edge-stack/architecture.md`
- **Workflows**: `.edge-stack/workflows.md`
- **Coding Standards**: `.edge-stack/coding-standards.md`

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Maintained By**: Edge Starter Kit Team
