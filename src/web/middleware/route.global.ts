import { ROUTES } from "@buildingai/constants/web";
import { useUserStore } from "@buildingai/stores/user";

export default defineNuxtRouteMiddleware(async (to, from) => {
    const userStore = useUserStore();

    /**
     * Authentication and redirect logic
     * - Set page layout
     * - Get user information
     * - Handle login/logout redirects
     * - Refresh token on authenticated pages
     * @returns string | undefined
     */
    const handleAuth = async () => {
        // If logged in but no user info → fetch user info
        if (userStore.isLogin && !userStore.userInfo) {
            await userStore.getUser();
        }
        // If not logged in and page requires auth → redirect to login
        else if (!userStore.isLogin && to.meta.auth !== false && to.path !== ROUTES.LOGIN) {
            setPageLayout("full-screen");
            return navigateTo(`${ROUTES.LOGIN}?redirect=${to.fullPath}`, { replace: true });
        }
        // If logged in but accessing login page → redirect to referrer or home
        else if (userStore.isLogin && to.path === ROUTES.LOGIN) {
            return from.path !== ROUTES.LOGIN ? from.fullPath : ROUTES.HOME;
        }
        // If logged in and accessing other pages → refresh token duration
        else if (userStore.isLogin) {
            userStore.refreshToken();
        }
    };

    // =============================================
    // 1. Authentication and Redirect Control
    // =============================================
    const authRedirect = await handleAuth();
    if (authRedirect) return authRedirect;
});
