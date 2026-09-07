import type { APIContext } from 'astro';
import { getCurrentUser, getSupabaseServer } from '../../lib/supabase';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const BUCKET = 'images';
const ALLOWED_CONTEXT = new Set(['gallery', 'blog']);

function getExtFromMime(mime: string): string {
    switch (mime) {
        case 'image/jpeg': return '.jpg';
        case 'image/png': return '.png';
        case 'image/webp': return '.webp';
        case 'image/gif': return '.gif';
        default: return '';
    }
}

export async function POST(context: APIContext) {
    try {
        const user = await getCurrentUser(context);
        if (!user) {
            return new Response(
                JSON.stringify({ success: false, error: 'Unauthorized. Silakan login sebagai admin.' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            );
        }

        let fd: FormData;
        try {
            fd = await context.request.formData();
        } catch {
            return new Response(
                JSON.stringify({ success: false, error: 'Request tidak valid. Gunakan multipart/form-data.' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const file = fd.get('file');
        if (!file || !(file instanceof File)) {
            return new Response(
                JSON.stringify({ success: false, error: 'Field "file" tidak ada atau bukan file.' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        if (file.size === 0) {
            return new Response(
                JSON.stringify({ success: false, error: 'File kosong. Pilih file gambar yang valid.' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        if (!ALLOWED_MIME.has(file.type)) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: `Tipe file "${file.type}" tidak diizinkan. Hanya menerima: JPG, PNG, WebP, GIF.`,
                }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        if (file.size > MAX_SIZE) {
            const sizeMB = (file.size / 1024 / 1024).toFixed(2);
            return new Response(
                JSON.stringify({
                    success: false,
                    error: `Ukuran file terlalu besar (${sizeMB} MB). Maksimal 5 MB.`,
                }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const ctxRaw = String(fd.get('context') || '').trim();
        const contextDir = ALLOWED_CONTEXT.has(ctxRaw) ? ctxRaw : 'misc';

        const ext = getExtFromMime(file.type) || `.${file.name.split('.').pop() || 'bin'}`;
        const uuid = crypto.randomUUID();
        const storagePath = `${contextDir}/${uuid}${ext}`;

        const supabase = getSupabaseServer();
        const buf = await file.arrayBuffer();

        const { error: uploadErr } = await supabase
            .storage
            .from(BUCKET)
            .upload(storagePath, new Uint8Array(buf), {
                contentType: file.type,
                upsert: false,
            });

        if (uploadErr) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: `Gagal upload ke storage: ${uploadErr.message}`,
                }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const { data: pubData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
        const publicUrl = pubData?.publicUrl || '';
        if (!publicUrl) {
            return new Response(
                JSON.stringify({ success: false, error: 'Upload sukses tapi gagal dapatkan public URL.' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify({ success: true, url: publicUrl, path: storagePath }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (e: any) {
        return new Response(
            JSON.stringify({
                success: false,
                error: e?.message || 'Gagal upload gambar (internal server error).',
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
