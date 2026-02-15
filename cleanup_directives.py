import os
import re

dashboard_dir = r"c:\Users\admin\BakedBot for Brands\bakedbot-for-brands\src\app\dashboard"

# The block to remove
block_pattern = re.compile(
    r"\s*// EMERGENCY BUILD FIX: Force dynamic rendering to prevent OOM during build\s+"
    r"// With 204 pages, pre-rendering all at once requires >64GB memory\s+"
    r"// This line forces on-demand generation instead\s+"
    r"export const dynamic = 'force-dynamic';\s+"
    r"export const dynamicParams = true;\s+"
    r"export const revalidate = 0;\s*",
    re.MULTILINE
)

count = 0
for root, dirs, files in os.walk(dashboard_dir):
    for file in files:
        if file.endswith((".tsx", ".ts")) and file != "layout.tsx":
            path = os.path.join(root, file)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                
                if "// EMERGENCY BUILD FIX" in content:
                    print(f"Processing: {path}")
                    new_content = block_pattern.sub("\n", content)
                    # Clean up double newlines
                    new_content = re.sub(r"\n{3,}", "\n\n", new_content)
                    
                    if new_content != content:
                        with open(path, "w", encoding="utf-8") as f:
                            f.write(new_content)
                        print(f"Cleaned up: {path}")
                        count += 1
            except Exception as e:
                print(f"Error processing {path}: {e}")

print(f"Total files cleaned: {count}")
