// avatars.githubusercontent.com is GitHub's dedicated avatar CDN (no auth, no
// bot/rate protection) - github.com/{login}.png is a redirect through the
// main site and unreliable under concurrent embed traffic (a page rendering
// many avatars at once, e.g. a leaderboard, would intermittently fail to
// load some of them). Always construct avatar URLs through this helper
// instead of building a github.com/*.png template inline.
export function getGitHubAvatarUrl(login: string, size?: number): string {
  return `https://avatars.githubusercontent.com/${login}${size ? `?s=${size}` : ''}`;
}
