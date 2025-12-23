"""
Fix the JSX syntax error in src/app/page.tsx by removing duplicate pricing section.
The duplicate section is lines 776-921 (inclusive).
"""
import sys

# Read the file
with open("src/app/page.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Keep lines 1-775 and 922-end
fixed_lines = lines[:775] + lines[921:]

# Write the fixed content
with open("src/app/page.tsx", "w", encoding="utf-8") as f:
    f.writelines(fixed_lines)

print(f"Fixed! Removed lines 776-921 (duplicate pricing section).")
print(f"Original line count: {len(lines)}")
print(f"New line count: {len(fixed_lines)}")
print(f"Lines removed: {len(lines) - len(fixed_lines)}")
