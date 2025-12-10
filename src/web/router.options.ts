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
        path: "",
        icon: "i-lucide-list-video",
        component: () => import("~/pages/console/index.vue"),
        sort: 0,
    },
    {
        name: "计费配置",
        path: "config",
        icon: "i-lucide-settings",
        component: () => import("~/pages/console/config.vue"),
        sort: 1,
    },
    {
        name: "应用装修",
        path: "configs",
        icon: "i-lucide-settings",
        defaultOpen: true,
        sort: 2,
        children: [
            {
                name: "首页装修",
                path: "home",
                icon: "i-lucide-list-checks",
                component: () => import("~/pages/console/config/home.vue"),
                sort: 3,
            },
            {
                name: "对话界面配置",
                path: "examples",
                icon: "i-lucide-list-checks",
                component: () => import("~/pages/console/config/examples.vue"),
                sort: 4,
            },
        ],
    },
];

export default defineRoutesConfig(consoleMenu);
