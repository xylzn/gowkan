import type { APIContext } from 'astro';
import { getCurrentUser, getSupabaseServer } from '../../../lib/supabase';
import type { Article } from '../../../lib/types';

type ArticleInsert = Omit<Article, 'id' | 'created_at'>;

export async function POST(context: APIContext) {
	try {
		const user = await getCurrentUser(context);
		if (!user) {
			return new Response(
				JSON.stringify({ success: false, error: 'Unauthorized. Silakan login sebagai admin.' }),
				{ status: 401, headers: { 'Content-Type': 'application/json' } }
			);
		}

		const body = await context.request.json().catch(() => ({} as Partial<ArticleInsert>));
		const payload: Partial<ArticleInsert> = {};

		const required: (keyof ArticleInsert)[] = [
			'slug',
			'title',
			'description',
			'category',
			'pub_date',
			'hero_image_url',
			'content_md',
		];
		for (const f of required) {
			const v = body?.[f];
			if (typeof v !== 'string' || v.trim() === '') {
				return new Response(
					JSON.stringify({
						success: false,
						error: `Field wajib '${f}' tidak boleh kosong.`,
					}),
					{ status: 400, headers: { 'Content-Type': 'application/json' } }
				);
			}
			payload[f] = v.trim() as any;
		}
		payload.updated_date =
			typeof body?.updated_date === 'string' && body.updated_date.trim()
				? body.updated_date.trim()
				: null;

		const supabase = getSupabaseServer();
		const { data, error } = await supabase
			.from('articles')
			.insert([payload as ArticleInsert])
			.select('id, slug, title')
			.single();
		if (error) throw error;

		return new Response(
			JSON.stringify({ success: true, data }),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);
	} catch (e: any) {
		return new Response(
			JSON.stringify({
				success: false,
				error: e?.message || 'Gagal menyimpan artikel ke database.',
			}),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
}
