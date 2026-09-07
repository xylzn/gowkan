import type { APIContext } from 'astro';
import matter from 'gray-matter';
import { getCurrentUser, getSupabaseServer } from '../../../lib/supabase';
import {
	estimateReadTime,
	generateUniqueSlug,
	parseMarkdown,
} from '../../../lib/markdown';
import type { Article } from '../../../lib/types';

interface Frontmatter {
	title?: string;
	description?: string;
	pubDate?: string | Date;
	category?: string;
	heroImage?: string;
}

interface ParsedArticleDraft
	extends Omit<
		Article,
		'id' | 'created_at' | 'pub_date' | 'updated_date' | 'pub_date'
	> {
	pub_date: string;
	updated_date: string | null;
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

		const formData = await context.request.formData().catch(() => null);
		const file = formData?.get('file');
		if (!file || !(file instanceof File)) {
			return new Response(
				JSON.stringify({
					success: false,
					error: 'File tidak ditemukan. Kirim file .md melalui field "file" dalam FormData.',
				}),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			);
		}

		const fileName = (file.name || '').trim().toLowerCase();
		if (!fileName.endsWith('.md')) {
			return new Response(
				JSON.stringify({
					success: false,
					error: `Hanya file dengan ekstensi .md yang diizinkan. File yang dikirim: ${file.name || '(tanpa nama)'}`,
				}),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			);
		}

		const rawText = await file.text().catch(() => '');
		if (!rawText.trim()) {
			return new Response(
				JSON.stringify({
					success: false,
					error: 'File kosong atau tidak bisa dibaca. Pastikan isi file .md valid.',
				}),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			);
		}

		let parsedMatter: { data: Frontmatter; content: string };
		try {
			parsedMatter = matter(rawText);
		} catch (parseErr: any) {
			return new Response(
				JSON.stringify({
					success: false,
					error: `Gagal parse frontmatter markdown: ${parseErr?.message || 'format YAML tidak valid.'}`,
				}),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			);
		}

		const fm = parsedMatter.data || ({} as Frontmatter);
		const requiredFm: (keyof Frontmatter)[] = ['title', 'description', 'pubDate', 'category', 'heroImage'];
		for (const field of requiredFm) {
			const val = fm[field];
			if (val === undefined || val === null || String(val).trim() === '') {
				return new Response(
					JSON.stringify({
						success: false,
						error: `Frontmatter field '${field}' wajib diisi dan tidak boleh kosong.`,
					}),
					{ status: 400, headers: { 'Content-Type': 'application/json' } }
				);
			}
		}

		const contentMd = (parsedMatter.content || '').trim();
		if (!contentMd) {
			return new Response(
				JSON.stringify({
					success: false,
					error: 'Isi artikel (setelah frontmatter) tidak boleh kosong.',
				}),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			);
		}

		const supabase = getSupabaseServer();
		const { data: slugRows, error: slugErr } = await supabase
			.from('articles')
			.select('slug');
		if (slugErr) throw slugErr;
		const existingSlugs = (slugRows || []).map((r) => r.slug).filter(Boolean) as string[];

		const title = String(fm.title!).trim();
		const slug = generateUniqueSlug(title, existingSlugs);

		let pubDateStr: string;
		const pd = fm.pubDate!;
		const d = pd instanceof Date ? pd : new Date(String(pd));
		if (Number.isNaN(d.getTime())) {
			return new Response(
				JSON.stringify({
					success: false,
					error: `Frontmatter 'pubDate' tidak valid. Format yang diharapkan YYYY-MM-DD atau date object yang valid. Diterima: ${pd}`,
				}),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			);
		}
		pubDateStr = d.toISOString().slice(0, 10);

		const readTime = estimateReadTime(contentMd);
		const { html, headings } = parseMarkdown(contentMd);
		const previewHtmlLength = 2500;
		const renderedHtmlPreview = html.slice(0, previewHtmlLength) + (html.length > previewHtmlLength ? '...' : '');

		const parsed: ParsedArticleDraft = {
			slug,
			title,
			description: String(fm.description!).trim(),
			category: String(fm.category!).trim(),
			pub_date: pubDateStr,
			updated_date: null,
			hero_image_url: String(fm.heroImage!).trim(),
			content_md: contentMd,
		};

		return new Response(
			JSON.stringify({
				success: true,
				parsed,
				preview: {
					readTime,
					headings,
					renderedHtmlPreview,
				},
			}),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);
	} catch (e: any) {
		return new Response(
			JSON.stringify({
				success: false,
				error: e?.message || 'Gagal memproses parse file markdown.',
			}),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
}
