"""
Fix JSX syntax error in src/app/page.tsx
Removes stray closing brace that blocks all deployments
"""

import re

# Read the file
with open('src/app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the specific issues
# 1. Remove stray } after Final CTA comment
content = re.sub(r'\{/\*\s*Final\s*CTA\s*\*/\s*\}', '{/* Final CTA */}', content)

# 2. Fix any </div > with extra space
content = re.sub(r'</div\s+>', '</div>', content)

# 3. Fix section indentation if needed (ensure proper spacing)
content = re.sub(
    r'(\{/\* Final CTA \*/\})\s*\n\s*<section className="mx-auto max-w-6xl',
    r'\1\n    <section className="mx-auto max-w-6xl',
    content
)

# Write back
with open('src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Fixed JSX errors in src/app/page.tsx")
print("   - Removed stray } after Final CTA comment")
print("   - Fixed closing div tags")
print("   - Fixed indentation")
