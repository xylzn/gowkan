import type { APIContext } from 'astro';
import { createSSRClient } from '../../../lib/supabase';

export async function POST(context: APIContext) {
	try {
		const ssrClient = createSSRClient(context);
		await ssrClient.auth.signOut().catch(() => {});
		return new Response(
			JSON.stringify({
				success: true,
				redirect: '/admin/login',
			}),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);
	} catch (e: any) {
		return new Response(
			JSON.stringify({
				success: false,
				error: e?.message || 'Gagal logout. Silakan refresh halaman.',
			}),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
}
