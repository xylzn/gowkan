import type { APIContext } from 'astro';
import { getCurrentUser, getSupabaseServer } from '../../../lib/supabase';
import type { GalleryItem } from '../../../lib/types';

type GalleryInsert = Omit<GalleryItem, 'id' | 'created_at'>;

export async function POST(context: APIContext) {
	try {
		const user = await getCurrentUser(context);
		if (!user) {
			return new Response(
				JSON.stringify({ success: false, error: 'Unauthorized. Silakan login sebagai admin.' }),
				{ status: 401, headers: { 'Content-Type': 'application/json' } }
			);
		}

		const body = await context.request.json().catch(() => ({} as Partial<GalleryInsert>));

		const insertData: Partial<GalleryInsert> = {};

		const requiredFields: (keyof GalleryInsert)[] = [
			'nama_proyek',
			'url',
			'kategori',
			'thumbnail_url',
			'ringkasan',
			'detail_pekerjaan',
		];
		for (const f of requiredFields) {
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
			insertData[f] = v.trim() as any;
		}

		insertData.urutan_tampil =
			typeof body?.urutan_tampil === 'number' ? body.urutan_tampil : Number(body?.urutan_tampil ?? 0) || 0;

		const supabase = getSupabaseServer();
		const { data, error } = await supabase
			.from('gallery_items')
			.insert([insertData as GalleryInsert])
			.select('id, nama_proyek')
			.single();

		if (error) throw error;

		return new Response(
			JSON.stringify({ success: true, data: data ?? null }),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);
	} catch (e: any) {
		return new Response(
			JSON.stringify({
				success: false,
				error: e?.message || 'Gagal menambahkan item gallery.',
			}),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
}
