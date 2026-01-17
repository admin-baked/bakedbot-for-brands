# Kusho CLI Setup for BakedBot

## Installation Complete ✅

Kusho CLI has been successfully installed and configured for UI testing of BakedBot applications.

### Installation Details

**Location:** `c:\Users\admin\BakedBot for Brands\kusho-cli`

**Environment:**
- Node.js: v25.2.1
- Kusho CLI: v1.0.0
- Playwright browsers: Installed (Chromium, Firefox, Webkit)
- Credentials: Configured for martez@bakedbot.ai

**Editors Available:**
- vim v9.1
- nano v8.7

---

## Quick Start

### 1. Try the Demo

Test the installation with the demo flow:

```bash
kusho demo
```

### 2. Record Your First Test

Record interactions on the BakedBot application:

```bash
# Start local dev server first
cd "c:\Users\admin\BakedBot for Brands\bakedbot-for-brands"
npm run dev

# In another terminal, record interactions
kusho record http://localhost:3000
```

### 3. Recording Workflow

1. **Browser Opens** - Kusho launches a browser
2. **Interact** - Navigate and use the app as a user would
3. **Close Browser** - Close browser when done to complete recording
4. **Review Script** - Generated Playwright code opens in your editor
5. **Edit if Needed** - Modify the script, then save
6. **Saved** - Test is saved to `kusho-tests/recordings/`

### 4. Generate AI-Enhanced Tests

Extend your recording with AI-generated test variations:

```bash
# Extend latest recording
kusho extend latest

# Or extend specific recording
kusho extend your-test-name
```

### 5. Run Tests

Execute your tests:

```bash
# Run latest test
kusho run latest

# Run with visible browser (for debugging)
kusho run latest --headed

# Run with video recording
kusho run latest --headed --record

# Run original recording (without AI extensions)
kusho run-recording latest
```

---

## Common Use Cases for BakedBot

### Test User Onboarding Flow

```bash
kusho record http://localhost:3000/onboarding
# Interact with the onboarding wizard
# Close browser when done
kusho extend latest
kusho run latest --headed
```

### Test Dashboard Features

```bash
kusho record http://localhost:3000/dashboard
# Navigate through dashboard features
# Test filters, actions, etc.
kusho extend latest
kusho run latest
```

### Test Agent Interactions

```bash
kusho record http://localhost:3000
# Interact with chatbot/agents
# Test different queries and flows
kusho extend latest
kusho run latest --headed --record
```

---

## File Structure

After recording and extending tests:

```
kusho-tests/
├── recordings/          # Original recorded tests
│   └── your-test.js
└── extended-tests/      # AI-enhanced test suites
    └── your-test-extended.js
```

---

## Useful Commands

| Command | Description |
|---------|-------------|
| `kusho demo` | Try the recorder with a sample URL |
| `kusho record [url]` | Start recording UI interactions |
| `kusho extend latest` | Extend latest recording with AI |
| `kusho run latest` | Run latest extended test |
| `kusho run latest --headed` | Run with visible browser |
| `kusho run latest --record` | Run with video/screenshots |
| `kusho run-recording latest` | Run original recording |
| `kusho credentials` | Update authentication |

---

## Device Emulation

Test on different devices:

```bash
# Record on iPhone 13
kusho record --device "iPhone 13" http://localhost:3000

# Record on custom viewport
kusho record --viewport "1280,720" http://localhost:3000
```

---

## Tips for BakedBot Testing

1. **Start with Simple Flows** - Begin with basic navigation before complex agent interactions
2. **Test Critical Paths** - Focus on onboarding, agent queries, and dashboard actions
3. **Use --headed for Debugging** - Visual browser helps troubleshoot issues
4. **Review Generated Code** - Always review Playwright scripts before extending
5. **Name Tests Descriptively** - Use clear names like `brand-onboarding-flow` or `agent-product-search`

---

## Troubleshooting

### Browser doesn't open
```bash
cd "c:\Users\admin\BakedBot for Brands\kusho-cli"
npx playwright install
```

### Credentials issues
```bash
kusho credentials
# Enter: martez@bakedbot.ai
# Token: (get new token from Kusho webapp)
```

### Editor not found
Verify vim/nano is installed:
```bash
vim --version
nano --version
```

---

## Next Steps

1. Start the BakedBot dev server: `npm run dev`
2. Run `kusho demo` to verify everything works
3. Record your first BakedBot user flow
4. Extend and run tests to validate functionality

For detailed documentation, see the [Kusho CLI README](https://github.com/kusho-co/kusho-cli).
