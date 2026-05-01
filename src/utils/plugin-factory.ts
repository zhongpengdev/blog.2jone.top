import type { Plugin } from "vite";
import path from "node:path";

export interface VirtualModule {
    id: string;
    resolvedId: string;
    load: () => string;
    invalidate: () => void;
}

export function createVirtualModule(id: string, loader: () => string): VirtualModule {
    let cacheLoadResult: string | undefined;

    return {
        id: "virtual:" + id,
        resolvedId: '\0virtual:' + id,

        load() {
            if (cacheLoadResult) {
                return cacheLoadResult;
            }
            cacheLoadResult = loader();
            return cacheLoadResult;
        },

        invalidate() {
            cacheLoadResult = undefined;
        }
    }
}

export function createContentProvider(
    pluginName: string,
    virtualModules: VirtualModule[],
    watchPath?: string
): Plugin {
    const resolvedIds: Record<string, string> = {};
    const VirtualModuleMap: Record<string, VirtualModule> = {};

    for (const VirtualModule of virtualModules) {
        resolvedIds[VirtualModule.id] = VirtualModule.resolvedId;
        VirtualModuleMap[VirtualModule.resolvedId] = VirtualModule;
    }

    return {
        name: pluginName,
        resolveId(id) {
            return resolvedIds[id];
        },
        load(id) {
            const virtualModule = VirtualModuleMap[id];
            if (virtualModule) {
                const code = virtualModule.load();
                if (typeof code !== 'string') {
                    console.error(`Virtual module ${id} returned non-string load result`);
                    return '';
                }
                return code;
            }
            return undefined;
        },
        configureServer(server) {
            if (watchPath) {
                server.watcher.add(watchPath);
            }
        },
        handleHotUpdate({ file, server }) {
            if (!watchPath || !server || !server.ws) return;
            const normalizedWatchPath = path.normalize(watchPath);
            const normalizedFile = path.normalize(file);

            if (normalizedFile.startsWith(normalizedWatchPath)) {
                for (const vm of virtualModules) {
                    vm.invalidate();
                    try {
                        const mod = server.moduleGraph.getModuleById(vm.resolvedId);
                        if (mod) {
                            server.moduleGraph.invalidateModule(mod);
                        }
                    } catch (e) {
                        // 防止在模块图更新时发生错误
                    }
                }
                
                try {
                    // 触发 HMR，因为 virtual module 变化了
                    server.ws.send({
                        type: 'full-reload',
                        path: '*'
                    });
                } catch (e) {
                    // 防止在 WebSocket 关闭时发生错误
                }

                // 返回空数组，告知 Vite 我们已经处理了更新，不需要进一步处理
                return [];
            }
        }
    }
}
