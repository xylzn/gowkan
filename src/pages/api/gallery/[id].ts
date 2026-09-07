import type { APIContext } from 'astro';
import { getCurrentUser, getSupabaseServer } from '../../../lib/supabase';
import type { GalleryItem } from '../../../lib/types';

type GalleryUpdate = Partial<Omit<GalleryItem, 'id' | 'created_at'>>;

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
		const body = await context.request.json().catch(() => ({} as GalleryUpdate));
		const update: GalleryUpdate = {};
		const allowed: (keyof GalleryUpdate)[] = [
			'nama_proyek',
			'url',
			'kategori',
			'thumbnail_url',
			'ringkasan',
			'detail_pekerjaan',
			'urutan_tampil',
		];
		for (const key of allowed) {
			if (key in body) {
				if (key === 'urutan_tampil') {
					update.urutan_tampil = Number(body?.urutan_tampil ?? 0) || 0;
				} else if (typeof body[key] === 'string') {
					(update as any)[key] = (body[key] as string).trim();
				}
			}
		}
		const supabase = getSupabaseServer();
		const { error } = await supabase.from('gallery_items').update(update).eq('id', id);
		if (error) throw error;
		return new Response(
			JSON.stringify({ success: true }),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);
	} catch (e: any) {
		return new Response(
			JSON.stringify({ success: false, error: e?.message || 'Gagal update item gallery.' }),
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
		const { error } = await supabase.from('gallery_items').delete().eq('id', id);
		if (error) throw error;
		return new Response(
			JSON.stringify({ success: true }),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);
	} catch (e: any) {
		return new Response(
			JSON.stringify({ success: false, error: e?.message || 'Gagal menghapus item gallery.' }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
}
