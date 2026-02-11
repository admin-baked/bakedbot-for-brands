# BakedBot Vibe IDE - VS Code Extension

Develop and deploy Vibe IDE projects locally with full VS Code integration.

## Features

### 🚀 **Local Development**
- Create new Vibe projects from scratch
- Browse and download community templates
- Live preview with hot reload
- Full TypeScript/IntelliSense support

### ☁️ **Cloud Sync**
- Auto-sync changes to BakedBot cloud
- Pull latest changes from any device
- Collaborate with team in real-time
- Deploy to production with one click

### 👥 **Real-Time Collaboration**
- Start collaboration sessions
- Share projects with team members
- Live cursor tracking
- Built-in chat

### 🎨 **Theme Customization**
- Visual theme config editor
- Live preview of design changes
- Access to 1000+ pre-built templates
- Custom domain support

### 📦 **Deployment**
- One-click deployment to *.bakedbot.ai
- Custom domain configuration
- Automatic SSL certificates
- CDN distribution

## Installation

1. Download the extension from VS Code Marketplace
2. Open VS Code Command Palette (`Ctrl+Shift+P`)
3. Type "Vibe IDE: Sign In" and authenticate
4. Start creating!

## Quick Start

### Create a New Project

```bash
1. Press Ctrl+Shift+P
2. Type "Vibe IDE: Create New Project"
3. Choose a template or start from scratch
4. Edit your project locally
```

### Preview Locally

```bash
1. Press Ctrl+Shift+P
2. Type "Vibe IDE: Preview Project"
3. Browser opens with live preview
4. Changes update automatically
```

### Deploy to Production

```bash
1. Press Ctrl+Shift+P
2. Type "Vibe IDE: Deploy to Production"
3. Enter subdomain (e.g., "my-dispensary")
4. Site goes live at https://my-dispensary.bakedbot.ai
```

## Commands

| Command | Description |
|---------|-------------|
| `Vibe IDE: Create New Project` | Create a new Vibe project |
| `Vibe IDE: Open Project` | Open existing project |
| `Vibe IDE: Preview Project` | Start local preview server |
| `Vibe IDE: Deploy to Production` | Deploy to *.bakedbot.ai |
| `Vibe IDE: Sync from Cloud` | Pull latest changes |
| `Vibe IDE: Edit Theme Config` | Open vibe.config.json |
| `Vibe IDE: Browse Templates` | Browse community templates |
| `Vibe IDE: Start Collaboration` | Start real-time session |

## Configuration

```json
{
  "vibeIDE.apiUrl": "https://bakedbot.ai/api",
  "vibeIDE.autoSync": true,
  "vibeIDE.previewPort": 3000,
  "vibeIDE.enableCollaboration": true
}
```

## Requirements

- VS Code 1.85.0 or higher
- Node.js 18+ (for local preview)
- Active BakedBot account

## Project Structure

```
my-vibe-project/
├── vibe.config.json       # Theme configuration
├── pages/
│   ├── index.tsx          # Home page
│   └── products.tsx       # Product catalog
├── components/
│   ├── header.tsx
│   └── footer.tsx
├── public/
│   └── images/
└── package.json
```

## Collaboration

Start a real-time collaboration session:

1. Open your project
2. Run `Vibe IDE: Start Collaboration`
3. Share the link with team members
4. Edit code together in real-time

Features:
- Live cursor tracking
- Conflict resolution
- File locking
- Built-in chat

## Templates

Browse 1000+ templates in the Vibe sidebar:

- **Dispensary Sites** - Full-featured cannabis stores
- **Product Menus** - Interactive catalogs
- **Landing Pages** - High-converting pages
- **E-commerce** - Complete online stores
- **Blogs** - Content management

## Support

- 📧 Email: support@bakedbot.ai
- 💬 Discord: https://discord.gg/bakedbot
- 📖 Docs: https://bakedbot.ai/docs/vibe-ide
- 🐛 Issues: https://github.com/bakedbot/vibe-ide/issues

## License

Proprietary - © 2026 BakedBot AI

---

**Tip:** Press `Ctrl+Shift+P` and type "Vibe" to see all available commands!
