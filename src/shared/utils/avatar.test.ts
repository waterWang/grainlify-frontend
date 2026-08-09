import { describe, it, expect } from 'vitest'
import { getGitHubAvatarUrl } from './avatar'

describe('getGitHubAvatarUrl', () => {
  it('builds a avatars.githubusercontent.com URL from a login, no size', () => {
    expect(getGitHubAvatarUrl('octocat')).toBe('https://avatars.githubusercontent.com/octocat')
  })

  it('appends ?s=<size> when a size is given', () => {
    expect(getGitHubAvatarUrl('octocat', 200)).toBe('https://avatars.githubusercontent.com/octocat?s=200')
  })

  it('never uses the github.com/*.png redirect form', () => {
    expect(getGitHubAvatarUrl('octocat', 40)).not.toContain('github.com/octocat.png')
  })

  it('handles org logins the same as user logins (no distinct path)', () => {
    expect(getGitHubAvatarUrl('stellopay', 80)).toBe('https://avatars.githubusercontent.com/stellopay?s=80')
  })
})
