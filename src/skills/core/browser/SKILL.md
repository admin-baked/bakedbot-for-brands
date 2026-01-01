---
name: Browser Automation
description: Navigate the web, scrape content, and interact with pages using a headless browser.
---

# Browser Skill

## Capabilities
- **Navigate**: Go to a URL and wait for it to load.
- **Scrape**: Extract text content or data from the page.
- **Screenshot**: Capture visual proof of the page state.
- **Interact**: Click buttons, type text, and evaluate scripts.

## Usage
- Use `browser.navigate` for simple "Go here and read this" tasks.
- Use `browser.perform` for complex multi-step workflows (e.g. Login -> Click -> Scrape).

## Constraints
- headless mode is always on.
- No audio/video playback.
- Heavy sites may timeout; usage of `wait` steps is encouraged.
