# Monaco Editor Setup Guide

## Installation

The Monaco Editor integration requires the `@monaco-editor/react` package.

```powershell
npm install @monaco-editor/react
```

## Usage

### Option 1: Use Enhanced Form with Monaco (Recommended)

Update the challenge page to use the Monaco-enabled form:

```typescript
// In src/app/dashboard/training/challenge/[id]/page-client.tsx

// Change import from:
import { CodeSubmissionForm } from '../../components/code-submission-form';

// To:
import { CodeSubmissionFormMonaco } from '../../components/code-submission-form-monaco';

// Then use it:
<CodeSubmissionFormMonaco
    challengeId={challenge.id}
    cohortId={progress.cohortId}
    starterCode={challenge.starterCode}
    attemptNumber={submissions.length + 1}
/>
```

### Option 2: Use Monaco Editor Directly

For custom implementations:

```typescript
import { MonacoCodeEditor } from '@/app/dashboard/training/components/monaco-code-editor';

function MyComponent() {
    const [code, setCode] = useState('');

    return (
        <MonacoCodeEditor
            value={code}
            onChange={setCode}
            language="typescript"
            height="600px"
        />
    );
}
```

## Features

The Monaco integration provides:

- ✅ **Syntax Highlighting** - Full TypeScript/JavaScript highlighting
- ✅ **IntelliSense** - Autocomplete for standard libraries
- ✅ **Error Checking** - Real-time TypeScript error detection
- ✅ **BakedBot Types** - Custom type definitions for common imports
- ✅ **VS Code Experience** - Familiar keybindings and UI
- ✅ **Code Formatting** - Auto-formatting on paste and type
- ✅ **Minimap** - Bird's-eye view of code
- ✅ **Theme Support** - Matches system dark/light mode
- ✅ **Fallback Support** - Gracefully falls back to textarea if Monaco fails

## Configuration

The editor is pre-configured with:

```typescript
{
    fontSize: 14,
    tabSize: 4,
    wordWrap: 'on',
    minimap: { enabled: true },
    formatOnPaste: true,
    formatOnType: true,
    autoClosingBrackets: 'always',
    bracketPairColorization: { enabled: true }
}
```

## Custom Type Definitions

BakedBot-specific types are automatically loaded:

```typescript
// Available in Monaco IntelliSense:
import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';
```

## Toggle Between Editors

Users can switch between Monaco and simple textarea using the toggle button in the form header. This is useful for:
- Debugging Monaco issues
- Testing with simple paste operations
- Accessibility preferences

## Performance Notes

- Monaco Editor is lazy-loaded to improve initial page load
- First load may take 1-2 seconds to download Monaco assets
- Subsequent loads are instant (cached)
- Editor has automatic layout adjustment on window resize

## Troubleshooting

**Editor not loading:**
- Check browser console for errors
- Ensure `@monaco-editor/react` is installed
- Use the "Simple Editor" toggle as fallback

**Types not working:**
- Type definitions are injected on mount
- Refresh the page if types don't appear
- Custom types are defined in `monaco-code-editor.tsx`

**Slow performance:**
- Disable minimap for faster rendering
- Reduce editor height if editing small snippets
- Use simple textarea for very large files (>5000 lines)
