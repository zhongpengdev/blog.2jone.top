import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import markdownItKatex from "@traptitech/markdown-it-katex";

export function escapeHtml(str: string) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

let _md: MarkdownIt;

export function getMd() {
    if (!_md) {
        _md = new MarkdownIt({
            html: true,
            highlight(str: string, lang: string) {
                if (lang && hljs.getLanguage(lang)) {
                    try {
                        return `<pre><code class="hljs language-${lang}">${hljs.highlight(str, { language: lang }).value}</code></pre>`;
                    } catch (__) { }
                }
                return `<pre><code>${escapeHtml(str)}</code></pre>`;
            }
        });

        // 引入构建期公式渲染插件，抛错设为 false 保证鲁棒性
        _md.use(markdownItKatex, {
            throwOnError: false,
            errorColor: '#cc0000',
            strict: false
        });

        // 自定义图片渲染规则
        _md.renderer.rules.image = (tokens, idx, _opt, env) => {
            const token = tokens[idx];
            const srcIndex = token.attrIndex('src');
            const src = tokens[idx].attrs![srcIndex][1];
            const alt = token.content;

            let finalSrc = src;
            // 如果是相对路径且提供了当前文章路径
            if (!src.startsWith('http') && !src.startsWith('/') && env && env.currentDir) {
                // 将相对路径转换为基于 data 的虚拟路径
                finalSrc = `/content-assets/${env.currentDir}/${src}`;
            }

            return `<smart-image src="${finalSrc}" alt="${alt}"></smart-image>`;
        };
    }
    return _md;
}

