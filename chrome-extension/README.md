# BakedBot AI Chrome Extension

AI-powered browser automation for cannabis brands. Record workflows, automate tasks, and let BakedBot handle repetitive work.

## Features

- **Workflow Recording**: Record browser actions (clicks, typing, navigation) as reusable workflows
- **One-Click Playback**: Run saved workflows with variable substitution
- **High-Risk Protection**: Automatic confirmation for purchases, deletions, and sensitive actions
- **Keyboard Shortcuts**: Quick access via Ctrl+Shift+B, Ctrl+Shift+R, Ctrl+Shift+S
- **Permission System**: Domain-level access control for security

## Installation

### Development/Testing

1. Clone the repository
2. Navigate to the `chrome-extension` directory
3. Install dependencies (optional, for packaging):
   ```bash
   npm install
   ```
4. Build the extension:
   ```bash
   npm run build
   ```
5. Open Chrome and go to `chrome://extensions`
6. Enable "Developer mode" (top right)
7. Click "Load unpacked"
8. Select the `chrome-extension/dist` folder

### From Chrome Web Store

Coming soon.

## Usage

1. Click the BakedBot AI icon in your Chrome toolbar
2. Sign in with your BakedBot Super User account
3. Start recording workflows or use quick actions

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+B` | Open popup |
| `Ctrl+Shift+R` | Toggle recording |
| `Ctrl+Shift+S` | Take screenshot |
| `Esc` | Cancel element picker |

### Recording a Workflow

1. Enter a name for your workflow
2. Click "Start Recording"
3. Perform actions in your browser (clicks, typing, navigation)
4. Click "Save" to stop recording

### Running a Workflow

1. Open the popup
2. Find your workflow in the "Saved Workflows" section
3. Click the play button to run it

## Requirements

- Chrome 88 or later (Manifest V3 support)
- BakedBot Super User account
- Connection to BakedBot backend

## Development

```bash
# Watch mode for development
npm run dev

# Build for production
npm run build

# Package for Chrome Web Store
npm run package

# Run tests
npm test
```

## Project Structure

```
chrome-extension/
├── manifest.json       # Extension manifest (MV3)
├── src/
│   ├── background.js   # Service worker
│   ├── content.js      # Content script
│   ├── content.css     # Content styles
│   ├── api.js          # API client
│   └── constants.js    # Shared constants
├── popup/
│   ├── popup.html      # Popup UI
│   ├── popup.css       # Popup styles
│   ├── popup.js        # Popup logic
│   └── options.html    # Settings page
├── icons/              # Extension icons
├── scripts/
│   ├── build.js        # Build script
│   └── package.js      # Packaging script
└── dist/               # Built extension (load this in Chrome)
```

## Security

- Requires Super User authentication
- Domain-level permission system
- Automatic blocking of financial sites (Chase, PayPal, etc.)
- Confirmation required for high-risk actions (purchases, deletions)
- Sensitive input fields are redacted during recording

## API Endpoints

The extension communicates with these BakedBot API endpoints:

- `POST /api/browser/session` - Create browser session
- `GET /api/browser/session/active` - Get active session
- `POST /api/browser/session/:id/action` - Execute action
- `POST /api/browser/recording/start` - Start recording
- `POST /api/browser/recording/:id/stop` - Stop recording
- `GET /api/browser/workflows` - List workflows
- `POST /api/browser/workflow/:id/run` - Run workflow
- `GET /api/auth/verify` - Verify authentication

## License

Proprietary - BakedBot AI
