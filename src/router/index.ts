import { createRouter, createWebHistory } from "vue-router";

const routes = [
    {
        path: '/',
        component: () => import('../pages/layout.vue'),
        children: [
            { path: '', component: () => import('../pages/index.vue') },
            { path: 'about', component: () => import('../pages/about.vue') },
            { path: 'notes/:slug', component: () => import('../pages/post.vue') }
        ]
    },
    {
        path: '/:pathMatch(.*)*',
        component: () => import('../pages/not-found.vue')
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior() {
        return { top: 0 };
    }
});

export default router;

