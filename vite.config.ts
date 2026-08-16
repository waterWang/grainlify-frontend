import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// The deployed commit, taken from whichever platform built this. Vercel sets
// VERCEL_GIT_COMMIT_SHA; the others are accepted so the check survives the
// service moving rather than silently reporting "unknown".
const BUILD_COMMIT =
  process.env.VITE_BUILD_COMMIT ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GIT_COMMIT_SHA ||
  process.env.COMMIT_SHA ||
  'unknown'

export default defineConfig({
  plugins: [
    {
      // Replaces the %VITE_BUILD_COMMIT% placeholder in index.html. Done as a
      // transform rather than a define because it has to land in the HTML
      // itself: a check that must run JavaScript to read the version cannot
      // distinguish "old build" from "build broken".
      name: 'html-build-commit',
      transformIndexHtml(html: string) {
        return html.replace(/%VITE_BUILD_COMMIT%/g, BUILD_COMMIT)
      },
    },
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Ensure a single React instance is used everywhere
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
})
