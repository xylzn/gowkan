import { marked } from 'marked';
import GithubSlugger from 'github-slugger';
import type { ArticleHeading } from './types';

const WORDS_PER_MINUTE = 200;
const MIN_READ_MINUTES = 1;

export interface MarkdownRenderResult {
	html: string;
	headings: ArticleHeading[];
}

export function parseMarkdown(content_md: string): MarkdownRenderResult {
	const slugger = new GithubSlugger();
	slugger.reset();
	const headings: ArticleHeading[] = [];

	const renderer = new marked.Renderer();

	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-expect-error marked type overload kadang beda versi
	renderer.heading = function (text: string, level: number, raw: string) {
		const slug = slugger.slug(raw || text);
		if (level === 2 || level === 3) {
			headings.push({ depth: level, slug, text: raw || text });
		}
		return `<h${level} id="${slug}">${text}</h${level}>\n`;
	};

	marked.setOptions({
		renderer,
		gfm: true,
		breaks: true,
	});

	const html = (marked.parse(content_md || '') as string) ?? '';

	return { html, headings };
}

export function estimateReadTime(content_md: string): string {
	if (!content_md) return `${MIN_READ_MINUTES} min baca`;
	const tokens = content_md.split(/\s+/g).filter((w) => w.length > 0);
	const wordCount = tokens.length;
	const minutes = Math.max(MIN_READ_MINUTES, Math.ceil(wordCount / WORDS_PER_MINUTE));
	return `${minutes} min baca`;
}

export function generateUniqueSlug(title: string, existingSlugs: string[] = []): string {
	const slugger = new GithubSlugger();
	slugger.reset();
	const baseSlug = slugger.slug(title?.trim() || 'untitled');
	if (!existingSlugs.includes(baseSlug)) return baseSlug;
	let counter = 2;
	while (existingSlugs.includes(`${baseSlug}-${counter}`)) counter++;
	return `${baseSlug}-${counter}`;
}
