import { useState } from 'react';
import { featuredPost, recentPosts, allBlogPosts } from '../data/blogPosts';
import { BlogHero } from '../components/BlogHero';
import { FeaturedPost } from '../components/FeaturedPost';
import { RecentPostsGrid } from '../components/RecentPostsGrid';
import { BlogPostView } from '../components/BlogPostView';
import { BlogStyles } from '../components/BlogStyles';

export function BlogPage() {
  // Which article is open, by slug. Null is the index.
  //
  // Local state rather than a route: the blog is rendered inside the dashboard
  // shell, which selects pages from its own state rather than from the URL, so
  // a nested route here would never be navigated to.
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const openPost = openSlug ? allBlogPosts.find((p) => p.slug === openSlug) : undefined;

  if (openPost) {
    return (
      <div className="space-y-8">
        <BlogPostView post={openPost} onBack={() => setOpenSlug(null)} />
        <BlogStyles />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <BlogHero />

      <FeaturedPost post={featuredPost} onOpen={() => setOpenSlug(featuredPost.slug)} />

      <RecentPostsGrid posts={recentPosts} onOpen={setOpenSlug} />

      <BlogStyles />
    </div>
  );
}
