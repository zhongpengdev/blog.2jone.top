import { readdirSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import { getMd } from "../src/utils/markdown";
import { createVirtualModule, createContentProvider } from "../src/utils/plugin-factory";
import { getParsedPost } from "./parser";

export function postProvider(postsPath: string): Plugin {
    const getPostDirs = () => readdirSync(postsPath, 'utf-8');

    const postsVirtualModule = createVirtualModule("post", () => {
        const md = getMd();
        let code = "import { h, defineComponent } from 'vue';\nconst fileMap = {";

        for (const dir of getPostDirs()) {
            const dirPath = path.resolve(postsPath, dir);
            const mdFile = readdirSync(dirPath).find(f => /\.md$/.test(f));
            if (!mdFile) continue;

            const { data, content } = getParsedPost(path.resolve(dirPath, mdFile));
            const slug = (data.slug || dir).replace(/^\//, '');
            
            // 自动识别目录类型 (posts or notes)
            const type = postsPath.includes('notes') ? 'notes' : 'posts';
            const html = md.render(content, { currentDir: `${type}/${dir}` });

            code += `['${slug}']: defineComponent({ render() { return h('div', { innerHTML: ${JSON.stringify(html)} }) } }), `;
        }

        code += "};\nexport default fileMap;";
        return code;
    });

    const postIndexVirtualModule = createVirtualModule("postIndex", () => {
        const metadataList = getPostDirs().map(dir => {
            const dirPath = path.resolve(postsPath, dir);
            const mdFile = readdirSync(dirPath).find(f => /\.md$/.test(f));
            if (!mdFile) return null;

            const { data } = getParsedPost(path.resolve(dirPath, mdFile));
            return {
                ...data,
                slug: (data.slug || dir).replace(/^\//, ''),
                date: data.date ? new Date(data.date) : undefined,
            };
        }).filter(Boolean);

        metadataList.sort((a, b) => +b.date! - +a.date!);
        return "export default " + JSON.stringify(metadataList);
    });

    return createContentProvider("post-provider-plugin", [
        postsVirtualModule,
        postIndexVirtualModule
    ], postsPath);
}

export function pageProvider(pagePath: string): Plugin {
    const pageVirtualModule = createVirtualModule("pages", () => {
        const md = getMd();
        const pageFilenames = readdirSync(pagePath).filter(f => /\.md$/.test(f));
        let code = "import { h, defineComponent } from 'vue';\nconst fileMap = {";

        for (const filename of pageFilenames) {
            const name = path.parse(filename).name;
            const filePath = path.resolve(pagePath, filename);
            const { content } = getParsedPost(filePath);
            const html = md.render(content, { currentDir: 'pages' });

            code += `['${name}']: defineComponent({ render() { return h('div', { class: 'md-reader', innerHTML: ${JSON.stringify(html)} }) } }), `;
        }

        code += "};\nexport default fileMap;";
        return code;
    });

    return createContentProvider("page-provider-plugin", [pageVirtualModule], pagePath);
}
