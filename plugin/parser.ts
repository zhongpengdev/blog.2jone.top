import { readFileSync, statSync } from "node:fs";
import matter from "gray-matter";

const postCache = new Map<string, { data: PostMetadata, content: string, mtime: number }>();

export function getParsedPost(filePath: string) {
    const mtime = statSync(filePath).mtimeMs;
    const cached = postCache.get(filePath);
    if (cached && cached.mtime === mtime) return cached;

    const buffer = readFileSync(filePath, 'utf-8');
    const { data, content } = matter(buffer);
    const result = { data: data as PostMetadata, content, mtime };
    postCache.set(filePath, result);
    return result;
}
