import os
import re

dashboard_dir = r"c:\Users\admin\BakedBot for Brands\bakedbot-for-brands\src\app\dashboard"

pattern = re.compile(
    r"(// EMERGENCY BUILD FIX: Force dynamic rendering to prevent OOM during build\s+"
    r"// With 204 pages, pre-rendering all at once requires >64GB memory\s+"
    r"// This line forces on-demand generation instead\s+"
    r"export const dynamic = 'force-dynamic';\s+"
    r"export const dynamicParams = true;\s+"
    r"export const revalidate = 0;\s+)"
    r"('use client';)",
    re.MULTILINE
)

replacement = r"\2\n\n\1"

count = 0
for root, dirs, files in os.walk(dashboard_dir):
    for file in files:
        if file.endswith((".tsx", ".ts")):
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            
            if pattern.search(content):
                new_content = pattern.sub(replacement, content)
                with open(path, "w", encoding="utf-8") as f:
                    f.write(new_content)
                print(f"Fixed: {path}")
                count += 1

print(f"Total files fixed: {count}")
