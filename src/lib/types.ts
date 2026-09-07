export interface GalleryItem {
	id: string;
	nama_proyek: string;
	url: string;
	kategori: string;
	thumbnail_url: string;
	ringkasan: string;
	detail_pekerjaan: string;
	urutan_tampil: number;
	created_at: string;
}

export interface Article {
	id: string;
	slug: string;
	title: string;
	description: string;
	category: string;
	pub_date: string;
	updated_date: string | null;
	hero_image_url: string;
	content_md: string;
	created_at: string;
}

export interface ArticleHeading {
	depth: number;
	slug: string;
	text: string;
}

export interface ParsedArticle {
	title: string;
	description: string;
	category: string;
	pubDate: string;
	updatedDate: string | null;
	heroImage: string;
	contentMd: string;
	slug: string;
	headings: ArticleHeading[];
	readTime: string;
}
