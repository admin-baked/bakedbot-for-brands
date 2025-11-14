
#!/bin/bash

# ==============================================================================
# Deep Code Audit (Requires Packages)
# ==============================================================================
# This script performs a comprehensive audit of the codebase using specialized
# tools. It helps identify unused dependencies, dead code, and duplicates.
#
# Prerequisites:
#   - Run `npm install` to ensure dev dependencies are available.
#
# Usage: ./scripts/audit-code.sh
# ==============================================================================

# --- Configuration ---
REPORTS_DIR="audit-reports"
SRC_DIR="src"

# --- Setup ---
echo "🚀 Starting Deep Code Audit..."
echo "This may take a few minutes."
mkdir -p $REPORTS_DIR
echo ""

# --- Check for node_modules ---
if [ ! -d "node_modules" ]; then
  echo "❌ Error: 'node_modules' directory not found. Please run 'npm install' first."
  exit 1
fi

# --- 1. Find Unused Dependencies ---
echo "1/4: 🧹 Finding unused dependencies with 'depcheck'..."
DEPCHECK_REPORT="$REPORTS_DIR/unused-dependencies.txt"
npx depcheck > $DEPCHECK_REPORT
echo "  → Report saved to '$DEPCHECK_REPORT'."
echo ""

# --- 2. Find Unused Exports ---
echo "2/4: ✂️  Finding unused exports with 'ts-prune'..."
TSPRUNE_REPORT="$REPORTS_DIR/unused-exports.txt"
npx ts-prune > $TSPRUNE_REPORT
echo "  → Report saved to '$TSPRUNE_REPORT'."
echo ""

# --- 3. Detect Duplicate Code ---
echo "3/4: 👯 Detecting duplicate code with 'jscpd'..."
# We will output a detailed markdown report and a summary to the console.
JSCPD_REPORT_MD="$REPORTS_DIR/code-duplication-report.md"
npx jscpd $SRC_DIR --reporters="markdown,console" --output=$REPORTS_DIR --min-tokens 50
# Rename the default jscpd markdown report to our desired name
if [ -f "$REPORTS_DIR/jscpd-report.md" ]; then
  mv "$REPORTS_DIR/jscpd-report.md" "$JSCPD_REPORT_MD"
fi
echo "  → Detailed report saved to '$JSCPD_REPORT_MD'."
echo ""

# --- 4. Analyze Bundle Composition ---
echo "4/4: 📦 Analyzing Next.js bundle composition..."
echo "  → This will open a new browser tab with the bundle analysis."
echo "  → Close the tab and the script will exit."
ANALYZE=true npm run build
echo ""

# --- Completion ---
echo "✅ Deep Audit Complete!"
echo "Review the generated files in the '$REPORTS_DIR' directory for detailed insights."
