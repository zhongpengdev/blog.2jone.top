import type { Plugin } from 'vite';
import path from 'node:path';
import fs from 'node:fs';

export function contentAssetPlugin(): Plugin {
    return {
        name: 'content-asset-plugin',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                if (req.url?.startsWith('/content-assets/')) {
                    // 路径格式: /content-assets/notes/cache_opt/core_cat.png
                    // 映射到: data/notes/cache_opt/core_cat.png
                    const relativePath = req.url.slice('/content-assets/'.length);
                    const fullPath = path.resolve(process.cwd(), 'data', relativePath);

                    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
                        const ext = path.extname(fullPath).toLowerCase();
                        const mimeMap: Record<string, string> = {
                            '.png': 'image/png',
                            '.jpg': 'image/jpeg',
                            '.jpeg': 'image/jpeg',
                            '.gif': 'image/gif',
                            '.svg': 'image/svg+xml',
                            '.webp': 'image/webp'
                        };
                        res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream');
                        res.end(fs.readFileSync(fullPath));
                        return;
                    }
                }
                next();
            });
        }
    };
}
