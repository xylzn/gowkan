import type { APIContext } from 'astro';
import { getCurrentUser, getSupabaseServer } from '../../../lib/supabase';
import type { Article } from '../../../lib/types';

type ArticleMetaUpdate = Partial<
	Pick<Article, 'title' | 'slug' | 'description' | 'category' | 'pub_date' | 'updated_date' | 'hero_image_url'>
>;

export async function PUT(context: APIContext) {
	try {
		const user = await getCurrentUser(context);
		if (!user) {
			return new Response(
				JSON.stringify({ success: false, error: 'Unauthorized. Silakan login sebagai admin.' }),
				{ status: 401, headers: { 'Content-Type': 'application/json' } }
			);
		}
		const id = String(context.params.id || '').trim();
		if (!id) {
			return new Response(
				JSON.stringify({ success: false, error: 'Parameter id wajib diisi.' }),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			);
		}
		const body = await context.request.json().catch(() => ({} as ArticleMetaUpdate));
		const update: ArticleMetaUpdate = {};
		const allowed: (keyof ArticleMetaUpdate)[] = [
			'title',
			'slug',
			'description',
			'category',
			'pub_date',
			'updated_date',
			'hero_image_url',
		];
		const today = new Date().toISOString().slice(0, 10);
		for (const key of allowed) {
			if (key in body) {
				const val = (body as any)[key];
				if (key === 'updated_date') {
					update.updated_date = today;
				} else if (typeof val === 'string') {
					(update as any)[key] = val.trim();
				}
			}
		}
		if (Object.keys(update).length === 0) {
			return new Response(
				JSON.stringify({ success: false, error: 'Tidak ada field metadata yang diubah.' }),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			);
		}
		update.updated_date = today;
		const supabase = getSupabaseServer();
		const { error } = await supabase.from('articles').update(update).eq('id', id);
		if (error) throw error;
		return new Response(
			JSON.stringify({ success: true }),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);
	} catch (e: any) {
		return new Response(
			JSON.stringify({ success: false, error: e?.message || 'Gagal update metadata artikel.' }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
}

export async function DELETE(context: APIContext) {
	try {
		const user = await getCurrentUser(context);
		if (!user) {
			return new Response(
				JSON.stringify({ success: false, error: 'Unauthorized. Silakan login sebagai admin.' }),
				{ status: 401, headers: { 'Content-Type': 'application/json' } }
			);
		}
		const id = String(context.params.id || '').trim();
		if (!id) {
			return new Response(
				JSON.stringify({ success: false, error: 'Parameter id wajib diisi.' }),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			);
		}
		const supabase = getSupabaseServer();
		const { error } = await supabase.from('articles').delete().eq('id', id);
		if (error) throw error;
		return new Response(
			JSON.stringify({ success: true }),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);
	} catch (e: any) {
		return new Response(
			JSON.stringify({ success: false, error: e?.message || 'Gagal menghapus artikel.' }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
}
