import { defineMiddleware } from 'astro:middleware';
import { getCurrentUser } from './lib/supabase';

export const onRequest = defineMiddleware(async (context, next) => {
	const pathname = context.url.pathname;
	const isAdminRoute = pathname.startsWith('/admin');
	const isLoginPage = pathname === '/admin/login';
	const isAdminApi = pathname.startsWith('/admin/api');
	// Also protect /api/* routes that require auth (except /api/auth/login, /api/auth/logout)
	const isApiAuthRoute = pathname.startsWith('/api/auth');

	if (isAdminRoute && !isLoginPage && !isAdminApi) {
		const user = await getCurrentUser(context);
		if (!user) {
			return context.redirect('/admin/login', 302);
		}
	}

	return next();
});
