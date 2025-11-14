
#!/bin/bash

# ==============================================================================
# Quick Code Audit (No Installation Required)
# ==============================================================================
# This script performs a fast, non-intrusive audit of the codebase to find
# common sources of technical debt and potential optimizations. It does not
# require any new packages to be installed.
#
# Usage: ./scripts/quick-audit.sh
# ==============================================================================

# --- Configuration ---
SRC_DIR="src"
REPORTS_DIR="audit-reports"
SEPARATOR="=================================================="

# --- Setup ---
echo "🚀 Starting Quick Code Audit..."
mkdir -p $REPORTS_DIR
echo "Reports will be saved in '$REPORTS_DIR/'"
echo ""

# --- 1. Find Console Logs ---
echo "1/5: 🕵️‍  Finding all console.log statements..."
CONSOLE_LOG_FILE="$REPORTS_DIR/console-logs.txt"
grep -r "console.log" $SRC_DIR > $CONSOLE_LOG_FILE
CONSOLE_COUNT=$(wc -l < $CONSOLE_LOG_FILE | tr -d ' ')
echo "  → Found $CONSOLE_COUNT instances. See '$CONSOLE_LOG_FILE'."
echo ""

# --- 2. Find TODO/FIXME Comments ---
echo "2/5: 📝 Finding all TODO and FIXME comments..."
TODO_FILE="$REPORTS_DIR/todos-and-fixmes.txt"
grep -r -E "TODO|FIXME" $SRC_DIR --exclude-dir=node_modules > $TODO_FILE
TODO_COUNT=$(wc -l < $TODO_FILE | tr -d ' ')
echo "  → Found $TODO_COUNT comments. See '$TODO_FILE'."
echo ""

# --- 3. Find Commented-Out Code ---
echo "3/5: 🤫 Finding commented-out code..."
COMMENTED_CODE_FILE="$REPORTS_DIR/commented-code.txt"
grep -r -E "//\s*(\w+|{|}|\()" $SRC_DIR --exclude-dir=node_modules > $COMMENTED_CODE_FILE
COMMENTED_COUNT=$(wc -l < $COMMENTED_CODE_FILE | tr -d ' ')
echo "  → Found $COMMENTED_COUNT potential lines of commented code. See '$COMMENTED_CODE_FILE'."
echo ""

# --- 4. Analyze Firebase Imports ---
echo "4/5: 🔥 Analyzing Firebase imports for optimization opportunities..."
FIREBASE_IMPORTS_FILE="$REPORTS_DIR/firebase-imports.txt"
{
  echo "Full 'firebase' package imports (can be optimized):"
  grep -r "from 'firebase'" $SRC_DIR
  echo ""
  echo "$SEPARATOR"
  echo ""
  echo "Specific service imports (good practice):"
  grep -r "from 'firebase/" $SRC_DIR
} > $FIREBASE_IMPORTS_FILE
echo "  → Analysis complete. See '$FIREBASE_IMPORTS_FILE'."
echo ""

# --- 5. Identify Large Files ---
echo "5/5: 🐘 Identifying largest files..."
LARGE_FILES_FILE="$REPORTS_DIR/large-files.txt"
find $SRC_DIR -type f -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -nr | head -n 15 > $LARGE_FILES_FILE
echo "  → Top 15 largest files listed in '$LARGE_FILES_FILE'."
echo ""

# --- Completion ---
echo "✅ Quick Audit Complete!"
echo "Review the generated files in the '$REPORTS_DIR' directory to identify areas for cleanup."
echo "Next step: Run the deep audit with 'npm run audit:deep' for even more insights."
