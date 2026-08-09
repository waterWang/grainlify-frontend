import ReactMarkdown from "react-markdown"

// react-markdown doesn't render raw HTML by default (it's treated as plain
// text, not parsed), so an HTML comment - meant to be invisible metadata,
// e.g. issue-tracking tools stamping a hidden "<!-- tool#filepath: ... -->"
// marker - shows up as literal visible text instead of being hidden like it
// would on GitHub itself. Stripped here rather than enabling raw HTML
// rendering (rehype-raw), which would open real content up to executing
// arbitrary embedded HTML/scripts from issue bodies.
function stripHtmlComments(content: string): string {
  return content.replace(/<!--[\s\S]*?-->/g, "")
}

export default function RenderMarkdownContent({
  content,
}: {
  content: string
}) {
  return (
    <ReactMarkdown
      components={{
        h2: ({ children }) => <h2>{children}</h2>,
        p: ({ children }) => <p>{children}</p>,
      }}
    >
      {stripHtmlComments(content)}
    </ReactMarkdown>
  )
}
