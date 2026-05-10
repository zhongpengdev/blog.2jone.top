import type { Plugin } from 'vite';
import path from 'node:path';
import fs from 'node:fs';

export function contentAssetPlugin(): Plugin {
    return {
        name: 'content-asset-plugin',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                if (req.url?.startsWith('/content-assets/')) {
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
        },
        // 生产构建时，将 data 目录复制到 dist/content-assets
        closeBundle() {
            const outDir = 'dist'; // 默认输出目录
            const srcDir = path.resolve(process.cwd(), 'data');
            const destDir = path.resolve(process.cwd(), outDir, 'content-assets');

            if (fs.existsSync(srcDir)) {
                console.log(`[content-asset-plugin] Copying ${srcDir} to ${destDir}...`);
                fs.mkdirSync(destDir, { recursive: true });
                copyRecursiveSync(srcDir, destDir);
            }
        }
    };
}

function copyRecursiveSync(src: string, dest: string) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats && stats.isDirectory();
    if (isDirectory) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest);
        }
        fs.readdirSync(src).forEach((childItemName) => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}
