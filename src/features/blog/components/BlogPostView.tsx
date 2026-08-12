import { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, Calendar, Clock, User } from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { BlogPost } from '../types';

interface BlogPostViewProps {
  post: BlogPost;
  onBack: () => void;
}

/**
 * Full article reader.
 *
 * The blog previously had no reading surface at all: "Read Full Story" was a
 * styled button with no handler, and every post was an excerpt that led
 * nowhere. Posts now carry real bodies, so they need somewhere to be read.
 *
 * Rendered inline rather than behind a route because the blog lives inside the
 * dashboard shell, which switches pages on internal state rather than on the
 * URL — a route here would not be reachable.
 */
export function BlogPostView({ post, onBack }: BlogPostViewProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Opening an article should start at the top of the article, not wherever
  // the reader happened to be scrolled to in the list behind it.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [post.slug]);

  const body = isDark ? 'text-[#ddd6ca]' : 'text-[#4a4034]';
  const heading = isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]';
  const muted = isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]';

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-[12px] border transition-all duration-300 text-[13px] font-semibold ${
          isDark
            ? 'bg-white/[0.08] border-white/15 text-[#f5f5f5] hover:bg-white/[0.14]'
            : 'bg-white/[0.15] border-white/25 text-[#2d2820] hover:bg-white/[0.25]'
        }`}
      >
        <ArrowLeft className="w-4 h-4" />
        All articles
      </button>

      <article className="relative bg-gradient-to-br from-white/[0.18] to-white/[0.12] rounded-[28px] border border-white/25 shadow-[0_8px_32px_rgba(0,0,0,0.08)] overflow-hidden">
        {/* Glow, clipped by the parent's overflow-hidden so it cannot bleed
            onto neighbouring cards. */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute -top-10 right-10 w-52 h-52 bg-[#c9983a]/30 rounded-full blur-[90px]" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-[#d4af37]/20 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 p-8 md:p-12">
          <header className="mb-8 max-w-[72ch] mx-auto">
            <div className="flex flex-wrap items-center gap-3 mb-5">
              {post.category && (
                <span className="px-3 py-1 bg-[#c9983a]/20 border border-[#c9983a]/35 rounded-[8px] text-[11px] font-bold uppercase tracking-wider text-[#8b6f3a]">
                  {post.category}
                </span>
              )}
              <span className={`flex items-center gap-1.5 text-[13px] ${muted}`}>
                <Calendar className="w-3.5 h-3.5" />
                {post.date}
              </span>
              <span className={`flex items-center gap-1.5 text-[13px] ${muted}`}>
                <Clock className="w-3.5 h-3.5" />
                {post.readTime}
              </span>
              {post.author && (
                <span className={`flex items-center gap-1.5 text-[13px] ${muted}`}>
                  <User className="w-3.5 h-3.5" />
                  {post.author}
                </span>
              )}
            </div>

            <h1
              className={`text-[30px] md:text-[40px] font-bold leading-[1.15] tracking-[-0.01em] ${heading}`}
            >
              {post.title}
            </h1>

            <div className="h-[3px] w-24 mt-6 bg-gradient-to-r from-[#c9983a] via-[#d4af37] to-transparent rounded-full" />
          </header>

          <div className={`max-w-[72ch] mx-auto text-[16px] leading-[1.75] ${body}`}>
            <ReactMarkdown
              // Tables are GitHub-Flavored Markdown, which react-markdown does
              // not parse on its own; without this the share and wave tables
              // render as literal pipe characters.
              remarkPlugins={[remarkGfm]}
              components={{
                h2: ({ children }) => (
                  <h2 className={`text-[26px] font-bold mt-12 mb-4 leading-tight ${heading}`}>
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className={`text-[20px] font-bold mt-9 mb-3 leading-tight ${heading}`}>
                    {children}
                  </h3>
                ),
                p: ({ children }) => <p className="mb-5">{children}</p>,
                strong: ({ children }) => (
                  <strong className={`font-bold ${heading}`}>{children}</strong>
                ),
                em: ({ children }) => <em className="italic">{children}</em>,
                ul: ({ children }) => (
                  <ul className="mb-5 space-y-2.5 list-disc pl-5 marker:text-[#c9983a]">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-5 space-y-2.5 list-decimal pl-5 marker:text-[#c9983a] marker:font-bold">
                    {children}
                  </ol>
                ),
                li: ({ children }) => <li className="pl-1">{children}</li>,
                blockquote: ({ children }) => (
                  <blockquote
                    className={`my-6 pl-5 border-l-[3px] border-[#c9983a]/60 italic ${muted}`}
                  >
                    {children}
                  </blockquote>
                ),
                code: ({ children }) => (
                  <code
                    className={`px-1.5 py-0.5 rounded-[6px] text-[14px] font-mono border ${
                      isDark
                        ? 'bg-black/30 border-white/10 text-[#e8c87a]'
                        : 'bg-black/[0.06] border-black/10 text-[#8b6f3a]'
                    }`}
                  >
                    {children}
                  </code>
                ),
                // Wide content scrolls inside its own box; the page body must
                // never scroll horizontally.
                pre: ({ children }) => (
                  <pre
                    className={`my-6 p-4 rounded-[14px] overflow-x-auto text-[13.5px] leading-relaxed border ${
                      isDark
                        ? 'bg-black/35 border-white/10 text-[#e8dfd0]'
                        : 'bg-black/[0.05] border-black/10 text-[#3a3228]'
                    }`}
                  >
                    {children}
                  </pre>
                ),
                table: ({ children }) => (
                  <div className="my-6 overflow-x-auto rounded-[14px] border border-white/20">
                    <table className="w-full border-collapse text-[14.5px]">{children}</table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className={isDark ? 'bg-white/[0.07]' : 'bg-white/[0.25]'}>
                    {children}
                  </thead>
                ),
                th: ({ children }) => (
                  <th
                    className={`text-left px-4 py-3 font-bold border-b border-white/15 ${heading}`}
                  >
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-4 py-3 border-b border-white/10 align-top">{children}</td>
                ),
                a: ({ children, href }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#c9983a] font-semibold underline underline-offset-2 hover:text-[#a67c2e] transition-colors"
                  >
                    {children}
                  </a>
                ),
                hr: () => <hr className="my-10 border-0 h-px bg-white/15" />,
              }}
            >
              {post.content}
            </ReactMarkdown>
          </div>
        </div>
      </article>

      <button
        onClick={onBack}
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-[12px] border transition-all duration-300 text-[13px] font-semibold ${
          isDark
            ? 'bg-white/[0.08] border-white/15 text-[#f5f5f5] hover:bg-white/[0.14]'
            : 'bg-white/[0.15] border-white/25 text-[#2d2820] hover:bg-white/[0.25]'
        }`}
      >
        <ArrowLeft className="w-4 h-4" />
        All articles
      </button>
    </div>
  );
}
