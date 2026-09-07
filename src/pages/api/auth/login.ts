import type { APIContext } from 'astro';
import { createSSRClient, getCurrentUser } from '../../../lib/supabase';

export async function POST(context: APIContext) {
	try {
		const body = await context.request.json().catch(() => ({}));
		const email = typeof body?.email === 'string' ? body.email.trim() : '';
		const password = typeof body?.password === 'string' ? body.password : '';

		if (!email || !password) {
			return new Response(
				JSON.stringify({
					success: false,
					error: 'Email dan password wajib diisi.',
				}),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			);
		}

		const ssrClient = createSSRClient(context);
		const { data, error } = await ssrClient.auth.signInWithPassword({ email, password });

		if (error || !data.session || !data.user) {
			return new Response(
				JSON.stringify({
					success: false,
					error: error?.message || 'Gagal login. Periksa email dan password Anda.',
				}),
				{ status: 401, headers: { 'Content-Type': 'application/json' } }
			);
		}

		const user = await getCurrentUser(context);
		if (!user) {
			return new Response(
				JSON.stringify({
					success: false,
					error: 'Session tidak terbentuk setelah login. Silakan coba lagi.',
				}),
				{ status: 401, headers: { 'Content-Type': 'application/json' } }
			);
		}

		return new Response(
			JSON.stringify({
				success: true,
				redirect: '/admin',
			}),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);
	} catch (e: any) {
		return new Response(
			JSON.stringify({
				success: false,
				error: e?.message || 'Terjadi kesalahan server saat proses login.',
			}),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
}
