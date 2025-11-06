/**
 * Router Options
 * @description Custom router configuration for plugin
 * @see https://nuxt.com/docs/4.x/guide/recipes/custom-routing#using-routeroptions
 */

import type { PluginMenuItem } from "@buildingai/layouts/console/menu";
import { defineRoutesConfig } from "@buildingai/nuxt/router";

/**
 * Console menu configuration
 * @description Define menu structure - supports nested items
 */
export const consoleMenu: PluginMenuItem[] = [
    {
        name: "生成记录",
        path: "/",
        icon: "i-lucide-list-video",
        component: () => import("~/pages/console/record.vue"),
        sort: 2,
    },
    {
        name: "应用配置",
        path: "config",
        icon: "i-lucide-settings",
        sort: 3,
        children: [
            {
                name: "收费配置",
                path: "config",
                icon: "i-lucide-settings",
                component: () => import("~/pages/console/config/config.vue"),
                sort: 0,
            },
            {
                name: "AI界面配置",
                path: "examples",
                icon: "i-lucide-list-checks",
                component: () => import("~/pages/console/config/examples.vue"),
                sort: 1,
            },
            {
                name: "首页配置",
                path: "home",
                icon: "i-lucide-list-checks",
                component: () => import("~/pages/console/config/home.vue"),
                sort: 2,
            },
        ],
    },
];

export default defineRoutesConfig(consoleMenu);
