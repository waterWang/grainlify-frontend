import { useTheme } from '../../../shared/contexts/ThemeContext';
import { BlogPost } from '../types';
import { BlogPostCard } from './BlogPostCard';

interface RecentPostsGridProps {
  posts: BlogPost[];
  onOpen: (slug: string) => void;
}

export function RecentPostsGrid({ posts, onOpen }: RecentPostsGridProps) {
  const { theme } = useTheme();

  return (
    <div>
      <h3 className={`text-[28px] font-bold mb-6 transition-colors ${
        theme === 'dark' ? 'text-[#f5f5f5]' : 'text-[#2d2820]'
      }`}>More reading</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {posts.map((post) => (
          <BlogPostCard key={post.slug} post={post} onOpen={() => onOpen(post.slug)} />
        ))}
      </div>
    </div>
  );
}
