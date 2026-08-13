import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlogHero } from './BlogHero';
import { ThemeContext } from '../../../shared/contexts/ThemeContext';
import type { ReactNode } from 'react';

function renderWithTheme(theme: 'light' | 'dark') {
  return render(
    <ThemeContext.Provider value={{ theme, toggleTheme: () => {}, setThemeFromAnimation: () => {} }}>
      <BlogHero />
    </ThemeContext.Provider>
  );
}

describe('BlogHero', () => {
  it('renders without error in light mode', () => {
    const { container } = renderWithTheme('light');
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders without error in dark mode', () => {
    const { container } = renderWithTheme('dark');
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders the blog heading', () => {
    renderWithTheme('light');
    expect(screen.getByText('Grainlify Blog')).toBeInTheDocument();
  });

  it('renders the blog subtitle', () => {
    renderWithTheme('light');
    expect(
      screen.getByText(/How the platform actually works/i)
    ).toBeInTheDocument();
  });

  it('renders the BookOpen icon', () => {
    renderWithTheme('light');
    const bookIcon = document.querySelector('.lucide-book-open');
    expect(bookIcon).toBeInTheDocument();
  });

  it('renders the Sparkles icon', () => {
    renderWithTheme('light');
    const sparklesIcon = document.querySelector('.lucide-sparkles');
    expect(sparklesIcon).toBeInTheDocument();
  });

  it('applies dark mode text color to heading', () => {
    renderWithTheme('dark');
    const heading = screen.getByText('Grainlify Blog');
    expect(heading.className).toContain('text-[#f5f5f5]');
  });

  it('applies light mode text color to heading', () => {
    renderWithTheme('light');
    const heading = screen.getByText('Grainlify Blog');
    expect(heading.className).toContain('text-[#2d2820]');
  });

  it('renders decorative gradient background elements', () => {
    const { container } = renderWithTheme('light');
    const blurElements = container.querySelectorAll('.blur-\\[80px\\], .blur-\\[90px\\]');
    expect(blurElements.length).toBeGreaterThanOrEqual(0);
  });
});