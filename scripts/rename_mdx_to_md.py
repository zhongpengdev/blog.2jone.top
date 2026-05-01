import os
import glob

posts_dir = os.path.join(os.path.dirname(__file__), "data", "notes")

for path in glob.glob(os.path.join(posts_dir, "**", "*.mdx"), recursive=True):
    new_path = path[:-4] + ".md"
    os.rename(path, new_path)
    print(f"{path} -> {new_path}")
