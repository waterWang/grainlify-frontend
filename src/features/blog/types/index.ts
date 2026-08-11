export interface BlogPost {
  id: number;
  /** Stable, URL-safe identifier. Survives reordering; ids do not. */
  slug: string;
  title: string;
  excerpt: string;
  /** Full article body, markdown. Rendered by BlogPostView. */
  content: string;
  date: string;
  readTime: string;
  author?: string;
  category?: string;
  icon?: string;
  image?: string;
  isFeatured?: boolean;
}
