// 'rewards' is gone: it was offered in the filter dropdown, handled by no
// branch in either table, and backed by no field in any response - selecting
// it triggered a refetch that changed nothing on screen.
export type FilterType = 'overall' | 'contributions' | 'ecosystems';
export type LeaderboardType = 'contributors' | 'projects';

// The time range the board covers. 'season' (the default) is a rolling
// 90-day window; 'all' is the cumulative all-time board.
export type LeaderboardWindow = 'season' | 'all';

export interface LeaderData {
  rank: number;
  rank_tier?: string;
  rank_tier_name?: string;
  username: string;
  avatar: string;
  user_id?: string;
  /** Equal to merged_prs; the ranked quantity under the current formula. */
  score: number;
  /** Merged pull requests in verified projects, within the selected window. */
  merged_prs: number;
  ecosystems?: string[];
}

export interface ProjectData {
  rank: number;
  name: string;
  logo: string;
  /** Equal to contributors; the ranked quantity for organisations. */
  score: number;
  /** Distinct people who landed a merged PR in this org, within the window. */
  contributors: number;
  merged_prs?: number;
  open_issues?: number;
  ecosystems?: string[];
  activity?: string;
}

