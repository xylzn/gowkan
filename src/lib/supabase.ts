import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { AstroGlobal, APIContext } from 'astro';
import type { GalleryItem, Article } from './types';

type Database = {
	public: {
		Tables: {
			gallery_items: {
				Row: GalleryItem;
				Insert: Omit<GalleryItem, 'id' | 'created_at'>;
				Update: Partial<Omit<GalleryItem, 'id' | 'created_at'>>;
			};
			articles: {
				Row: Article;
				Insert: Omit<Article, 'id' | 'created_at'>;
				Update: Partial<Omit<Article, 'id' | 'created_at'>>;
			};
		};
	};
};

export type TypedSupabase = SupabaseClient<Database>;

const SUPABASE_URL = import.meta.env.SUPABASE_URL;
const ANON_KEY = import.meta.env.SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabasePublic: TypedSupabase = createClient<Database>(SUPABASE_URL, ANON_KEY, {
	auth: { persistSession: false, autoRefreshToken: false },
});

let serverClientCache: TypedSupabase | null = null;
export function getSupabaseServer(): TypedSupabase {
	if (!import.meta.env.SSR) {
		throw new Error('[SECURITY] getSupabaseServer() hanya bisa dipanggil di server-side (API routes / middleware).');
	}
	if (!serverClientCache) {
		serverClientCache = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
			auth: { persistSession: false, autoRefreshToken: false },
		});
	}
	return serverClientCache;
}

export function createSSRClient(ctx: { cookies: AstroGlobal['cookies'] | APIContext['cookies'] }): TypedSupabase {
	return createServerClient<Database>(SUPABASE_URL, ANON_KEY, {
		cookies: {
			get(key: string) {
				return ctx.cookies.get(key)?.value ?? undefined;
			},
			set(key: string, value: string, options: CookieOptions) {
				try {
					ctx.cookies.set(key, value, { ...options, sameSite: 'lax', path: '/' });
				} catch {
					// ignore jika dipanggil di context yang tidak bisa set cookies (misal middleware edge case)
				}
			},
			remove(key: string, options: CookieOptions) {
				try {
					ctx.cookies.delete(key, { ...options, sameSite: 'lax', path: '/' });
				} catch {
					// ignore
				}
			},
		},
	});
}

export async function getCurrentUser(
	ctx: { cookies: AstroGlobal['cookies'] | APIContext['cookies'] }
): Promise<{ id: string; email?: string } | null> {
	if (!import.meta.env.SSR) return null;
	try {
		const ssr = createSSRClient(ctx);
		const { data, error } = await ssr.auth.getUser();
		if (error || !data?.user) return null;
		return { id: data.user.id, email: data.user.email ?? undefined };
	} catch {
		return null;
	}
}
