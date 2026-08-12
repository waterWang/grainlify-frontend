import React from 'react';

/** Brand marks for the ecosystems we know about, so a card shows the real
 *  logo rather than the first letter of the name.
 *
 *  Inlined as SVG rather than fetched: no network request, no hotlinking
 *  someone else's CDN, and nothing to break when a remote asset moves. Each
 *  mark carries the background its brand is meant to sit on, so the tile and
 *  the artwork read as one shape instead of a circle floating on a square.
 *
 *  Matching is exact on a normalized key - "stellar", not "contains stellar" -
 *  because a substring match would wrongly claim an ecosystem that merely
 *  mentions the name. */
interface BrandMark {
  label: string;
  /** Tailwind class for the tile behind the artwork. */
  background: string;
  art: React.ReactNode;
}

const BRAND_MARKS: Record<string, BrandMark> = {
  stellar: {
    label: 'Stellar',
    background: 'bg-white',
    art: (
      <svg viewBox="0 0 24 24" className="w-[62%] h-[62%]" aria-hidden="true" focusable="false">
        <path fill="#000000" d="M12.003 1.716c-1.37 0-2.7.27-3.948.78A10.18 10.18 0 0 0 2.66 7.901a10.136 10.136 0 0 0-.797 3.954c0 .258.01.516.027.775a1.942 1.942 0 0 1-1.055 1.88L0 14.934v1.902l2.463-1.26.072-.032v.005l.77-.39.758-.385.066-.039 14.807-7.56 1.666-.847 3.392-1.732V2.694L17.792 5.86 3.744 13.025l-.104.055-.017-.115a8.286 8.286 0 0 1-.071-1.105c0-2.255.88-4.377 2.474-5.977a8.462 8.462 0 0 1 2.71-1.82 8.513 8.513 0 0 1 3.2-.654h.067a8.41 8.41 0 0 1 4.09 1.055l1.628-.83.126-.066a10.11 10.11 0 0 0-5.845-1.853zM24 7.143 5.047 16.808l-1.666.847L0 19.382v1.902l3.282-1.671 2.91-1.485 14.058-7.153.105-.055.016.115c.05.369.072.743.072 1.11 0 2.255-.88 4.383-2.475 5.978a8.461 8.461 0 0 1-2.71 1.82 8.305 8.305 0 0 1-3.2.654h-.06c-1.441 0-2.86-.369-4.102-1.061l-.066.033-1.683.857c.594.418 1.232.776 1.903 1.062a10.11 10.11 0 0 0 3.947.797 10.09 10.09 0 0 0 7.17-2.975 10.136 10.136 0 0 0 2.969-7.18c0-.259-.005-.523-.027-.781a1.942 1.942 0 0 1 1.055-1.88L24 9.044z" />
      </svg>
    ),
  },
  starknet: {
    label: 'Starknet',
    // The mark is a filled navy circle; matching the tile to it makes the
    // artwork fill the tile instead of sitting inside a white border.
    background: 'bg-[#0C0C4F]',
    art: (
      <svg viewBox="0 0 158 158" className="w-full h-full" aria-hidden="true" focusable="false">
      <path fill="#0C0C4F" fillRule="evenodd" clipRule="evenodd" d="M0,79c0,43.6,35.4,79,79,79c43.6,0,79-35.4,79-79c0-43.6-35.4-79-79-79C35.4,0,0,35.4,0,79z" />
      <path fill="#FAFAFA" fillRule="evenodd" clipRule="evenodd" d="M44.2,60.4l2-6c0.4-1.2,1.4-2.2,2.6-2.6l6.1-1.9c0.8-0.3,0.8-1.4,0-1.7l-6-2c-1.2-0.4-2.2-1.4-2.6-2.6l-1.9-6.1 c-0.3-0.8-1.4-0.8-1.7,0l-2,6c-0.4,1.2-1.4,2.2-2.6,2.6L32,48.1c-0.8,0.3-0.8,1.4,0,1.7l6,2c1.2,0.4,2.2,1.4,2.6,2.6l1.9,6.1 C42.7,61.2,43.9,61.2,44.2,60.4z" />
      <path fill="#EC796B" fillRule="evenodd" clipRule="evenodd" d="M139.8,56.9c-2.5-2.8-6.4-4.4-10.2-5c-3.8-0.6-7.8-0.6-11.6,0.1c-7.6,1.3-14.6,4.4-20.6,8.3 c-3.1,1.9-5.8,4.1-8.6,6.4c-1.3,1.1-2.6,2.4-3.8,3.5l-3.5,3.4c-3.8,3.9-7.5,7.5-11.1,10.5c-3.6,3-7,5.2-10.3,6.8 c-3.3,1.6-6.9,2.5-11.5,2.7c-4.6,0.2-10-0.7-15.8-2c-5.8-1.4-12-3.3-18.8-5c2.4,6.6,6,12.5,10.6,17.9c4.7,5.3,10.5,10.1,18,13.2 c7.4,3.2,16.7,4.4,25.4,2.6c8.7-1.7,16.4-5.7,22.5-10.4c6.2-4.7,11.2-10.1,15.4-15.7c1.2-1.5,1.8-2.4,2.6-3.6l2.3-3.5 c1.6-2.1,3.1-4.6,4.7-6.7c3.1-4.4,6.2-8.9,9.9-12.9c1.8-2.1,3.7-4.1,6-6c1.1-0.9,2.3-1.8,3.7-2.7C136.6,58.1,138.1,57.4,139.8,56.9z" />
      <path fill="#FAFAFA" fillRule="evenodd" clipRule="evenodd" d="M139.8,56.9c-2.7-6.8-7.7-12.5-14.4-16.7c-6.6-4.2-15.9-6.3-25-4.5c-4.5,0.9-8.9,2.6-12.7,4.8 c-3.8,2.2-7.3,4.9-10.2,7.8c-1.5,1.4-2.8,3-4.2,4.5l-3.5,4.4l-5.3,7.1c-6.8,9.1-14.2,19.9-26.2,23c-11.8,3.1-17,0.4-24.2-0.8 c1.3,3.4,3,6.7,5.2,9.6c2.2,3,4.7,5.8,7.9,8.2c1.6,1.1,3.3,2.3,5.2,3.2c1.9,0.9,3.9,1.7,6.1,2.4c4.3,1.2,9.2,1.6,13.9,1 c4.7-0.6,9.2-2.1,13.1-4.1c4-2,7.4-4.4,10.5-6.9c6.1-5.1,10.9-10.7,14.9-16.4c2-2.8,3.9-5.7,5.6-8.6l2-3.4c0.6-1,1.2-2,1.9-3 c2.5-3.8,5-6.8,8-9.1c3-2.3,7.1-4.1,12.6-4.5C126.5,54.6,132.9,55.3,139.8,56.9z" />
      <path fill="#EC796B" fillRule="evenodd" clipRule="evenodd" d="M110.1,113.1c0,5,4,9,9,9c5,0,9-4,9-9c0-5-4-9-9-9C114.1,104.1,110.1,108.1,110.1,113.1z" />
      </svg>
    ),
  },
};

/** Normalizes a name or slug to a brand key: lowercase, letters and digits
 *  only, so "Star-Knet" and "starknet" land on the same entry. */
function brandKey(value?: string | null): string {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function getEcosystemBrandMark(
  name?: string | null,
  slug?: string | null,
): BrandMark | null {
  return BRAND_MARKS[brandKey(slug)] ?? BRAND_MARKS[brandKey(name)] ?? null;
}

interface EcosystemLogoProps {
  name?: string | null;
  slug?: string | null;
  /** An admin-uploaded logo, which wins over the built-in mark: someone who
   *  set one meant it to be used. */
  logoUrl?: string | null;
  /** Sizing and corner classes for the tile. */
  className?: string;
  /** Gradient classes for the letter tile, used only when there is neither an
   *  uploaded logo nor a known brand. */
  fallbackBackground?: string;
  /** Text size for the letter fallback. */
  letterClassName?: string;
}

/** One tile, three cases in priority order: an uploaded logo, a known brand
 *  mark, then the first letter of the name. */
export function EcosystemLogo({
  name,
  slug,
  logoUrl,
  className = 'w-12 h-12 rounded-[12px]',
  fallbackBackground = 'bg-gradient-to-br from-[#c9983a] to-[#a67c2e]',
  letterClassName = 'text-[20px]',
}: EcosystemLogoProps) {
  const trimmedLogo = typeof logoUrl === 'string' ? logoUrl.trim() : '';
  const brand = trimmedLogo === '' ? getEcosystemBrandMark(name, slug) : null;
  const tile = `${className} flex items-center justify-center overflow-hidden shadow-lg border border-white/20`;

  if (trimmedLogo !== '') {
    return (
      <div className={`${tile} bg-white`}>
        <img
          src={trimmedLogo}
          alt={`${name ?? 'Ecosystem'} logo`}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
          onError={(event) => {
            (event.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>
    );
  }

  if (brand) {
    return (
      <div className={`${tile} ${brand.background}`} role="img" aria-label={`${brand.label} logo`}>
        {brand.art}
      </div>
    );
  }

  return (
    <div className={`${tile} ${fallbackBackground}`}>
      <span className={`text-white ${letterClassName} font-bold`}>
        {name ? name.charAt(0).toUpperCase() : '?'}
      </span>
    </div>
  );
}
