import { useEffect, useState } from 'react';
import { ArrowLeft, FolderGit2, Star, Users, GitPullRequest, Crown, Trophy, Medal, Sparkles, Award, Circle, Eye, Pencil } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { useAuth } from '../../../shared/contexts/AuthContext';
import {
  getOrgSummary,
  getOrgCalendar,
  getOrgLinks,
  getOrgRatings,
  getMyOrgRatingStatus,
  getMyProjects,
  getPublicProjects,
  type OrgSummary,
  type OrgCalendarDay,
  type OrgLinks,
  type OrgRating,
  type OrgRatingStatus,
} from '../../../shared/api/client';
import { SkeletonLoader } from '../../../shared/components/SkeletonLoader';
import { getGitHubAvatarUrl } from '../../../shared/utils/avatar';
import { Spotlight } from '../../../shared/components/ui/Spotlight';
import { getOnBrandGradient } from '../../../shared/utils/motionVariants';
import { ProjectCard, type Project } from '../components/ProjectCard';
import { RatingModal } from '../components/RatingModal';
import { OrgContributionCalendar } from '../components/OrgContributionCalendar';
import { OrgSocialLinks } from '../components/OrgSocialLinks';
import { OrgLinksModal } from '../components/OrgLinksModal';

interface OrgProfilePageProps {
  viewingOrgLogin: string;
  onBack?: () => void;
  onProjectClick?: (id: string) => void;
}

const RATINGS_PAGE_SIZE = 10;

function formatTimeAgo(dateString: string | null | undefined): string {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Unknown';
  return formatDistanceToNow(date, { addSuffix: true });
}

// Same tier -> icon mapping as ProfilePage.tsx's own (unexported, file-local)
// getRankIcon - rank tiers are a shared concept (handlers.GetRankTier on the
// backend is already generic between user and org ranks) but this rendering
// has no shared component to import, so it's mirrored here rather than
// invented fresh.
function getRankIcon(tierName: string) {
  const iconClass = 'w-5 h-5 text-white drop-shadow-md';
  switch (tierName.toLowerCase()) {
    case 'conqueror':
      return <Crown className={iconClass} />;
    case 'ace':
      return <Trophy className={iconClass} />;
    case 'crown':
      return <Medal className={iconClass} />;
    case 'diamond':
      return <Sparkles className={iconClass} />;
    case 'gold':
      return <Award className={iconClass} />;
    case 'silver':
      return <Circle className={iconClass} />;
    case 'bronze':
      return <Eye className={iconClass} />;
    default:
      return <Award className={iconClass} />;
  }
}

function StarRow({ value, size = 'w-4 h-4' }: { value: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${size} ${n <= Math.round(value) ? 'text-[#c9983a] fill-[#c9983a]' : 'text-black/15 dark:text-white/20'}`}
        />
      ))}
    </div>
  );
}

function AvatarWithFallback({ src, name, className }: { src: string; name: string; className: string }) {
  const [errored, setErrored] = useState(false);
  if (!src || errored) {
    return (
      <div className={`${className} bg-gradient-to-br ${getOnBrandGradient(name)} flex items-center justify-center flex-shrink-0`}>
        <span className="text-white font-bold">{name.charAt(0).toUpperCase()}</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      decoding="async"
      className={`${className} flex-shrink-0`}
      onError={() => setErrored(true)}
    />
  );
}

// Mirrors BrowsePage.tsx's own local (unshared) helpers - this codebase's
// established convention is to duplicate these small per-file rather than
// factor them into a shared util (DiscoverPage.tsx does the same).
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function getProjectIcon(githubFullName: string): string {
  const [owner] = githubFullName.split('/');
  return getGitHubAvatarUrl(owner, 200);
}

const PROJECT_COLORS = [
  'from-blue-500 to-cyan-500',
  'from-purple-500 to-pink-500',
  'from-green-500 to-emerald-500',
  'from-red-500 to-pink-500',
  'from-orange-500 to-red-500',
  'from-gray-600 to-gray-800',
  'from-green-600 to-green-800',
  'from-cyan-500 to-blue-600',
];

function getProjectColor(name: string): string {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return PROJECT_COLORS[hash % PROJECT_COLORS.length];
}

function truncateDescription(description: string | undefined | null, maxLength = 80): string {
  if (!description || description.trim() === '') return '';
  const firstLine = description.split('\n')[0].trim();
  if (firstLine.length > maxLength) return firstLine.substring(0, maxLength).trim() + '...';
  return firstLine;
}

export function OrgProfilePage({ viewingOrgLogin, onBack, onProjectClick }: OrgProfilePageProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { isAuthenticated } = useAuth();

  const [summary, setSummary] = useState<OrgSummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState(false);

  const [repos, setRepos] = useState<Project[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(true);

  const [calendar, setCalendar] = useState<OrgCalendarDay[]>([]);
  const [calendarTotal, setCalendarTotal] = useState(0);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(true);

  const [links, setLinks] = useState<OrgLinks | null>(null);
  const [isMaintainer, setIsMaintainer] = useState(false);
  const [isLinksModalOpen, setIsLinksModalOpen] = useState(false);

  const [ratings, setRatings] = useState<OrgRating[]>([]);
  const [ratingsTotal, setRatingsTotal] = useState(0);
  const [isLoadingRatings, setIsLoadingRatings] = useState(true);

  const [myStatus, setMyStatus] = useState<OrgRatingStatus>({ eligible: false, rating: null });
  const [isLoadingMyStatus, setIsLoadingMyStatus] = useState(isAuthenticated);

  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingSummary(true);
    setSummaryError(false);
    getOrgSummary(viewingOrgLogin)
      .then((data) => { if (!cancelled) setSummary(data); })
      .catch(() => { if (!cancelled) setSummaryError(true); })
      .finally(() => { if (!cancelled) setIsLoadingSummary(false); });
    return () => { cancelled = true; };
  }, [viewingOrgLogin]);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingCalendar(true);
    getOrgCalendar(viewingOrgLogin)
      .then((data) => {
        if (cancelled) return;
        setCalendar(data.calendar);
        setCalendarTotal(data.total);
      })
      .catch(() => { /* leave calendar empty on failure */ })
      .finally(() => { if (!cancelled) setIsLoadingCalendar(false); });
    return () => { cancelled = true; };
  }, [viewingOrgLogin]);

  useEffect(() => {
    let cancelled = false;
    getOrgLinks(viewingOrgLogin)
      .then((data) => { if (!cancelled) setLinks(data); })
      .catch(() => { /* leave links null - the row just shows every icon inactive */ });
    return () => { cancelled = true; };
  }, [viewingOrgLogin]);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsMaintainer(false);
      return;
    }
    let cancelled = false;
    getMyProjects()
      .then((projects) => {
        if (cancelled) return;
        const owns = projects.some(
          (p) => (p.github_full_name.split('/')[0] || '').toLowerCase() === viewingOrgLogin.toLowerCase(),
        );
        setIsMaintainer(owns);
      })
      .catch(() => { /* not a maintainer if this fails - no edit affordance, not an error state */ });
    return () => { cancelled = true; };
  }, [viewingOrgLogin, isAuthenticated]);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingRepos(true);
    // limit: 200 (the API's max) rather than relying on its default of 50 -
    // this fetch has to find every repo under one specific org out of every
    // public repo on the platform, so a low default page size risks silently
    // missing this org's own repos once the platform has more than ~50 total.
    getPublicProjects({ limit: 200 })
      .then((data) => {
        if (cancelled) return;
        const orgRepos: Project[] = data.projects
          .filter((p) => (p.github_full_name.split('/')[0] || '').toLowerCase() === viewingOrgLogin.toLowerCase())
          .map((p) => {
            const repoName = p.github_full_name.split('/')[1] ?? p.github_full_name;
            return {
              id: p.id,
              name: repoName,
              icon: getProjectIcon(p.github_full_name),
              stars: formatNumber(p.stars_count || 0),
              forks: formatNumber(p.forks_count || 0),
              contributors: p.contributors_count || 0,
              openIssues: p.open_issues_count || 0,
              prs: p.open_prs_count || 0,
              description: truncateDescription(p.description) || `${p.language || 'Project'} repository`,
              tags: Array.isArray(p.tags) ? p.tags.slice(0, 3) : [],
              color: getProjectColor(repoName),
            };
          });
        setRepos(orgRepos);
      })
      .catch(() => { /* leave repos empty on failure */ })
      .finally(() => { if (!cancelled) setIsLoadingRepos(false); });
    return () => { cancelled = true; };
  }, [viewingOrgLogin]);

  const fetchRatings = (offset: number) => {
    setIsLoadingRatings(true);
    getOrgRatings(viewingOrgLogin, { limit: RATINGS_PAGE_SIZE, offset })
      .then((data) => {
        setRatings((prev) => (offset === 0 ? data.ratings : [...prev, ...data.ratings]));
        setRatingsTotal(data.total);
      })
      .catch(() => { /* leave existing list as-is on a page-load failure */ })
      .finally(() => setIsLoadingRatings(false));
  };

  useEffect(() => {
    setRatings([]);
    fetchRatings(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewingOrgLogin]);

  useEffect(() => {
    if (!isAuthenticated) {
      setMyStatus({ eligible: false, rating: null });
      setIsLoadingMyStatus(false);
      return;
    }
    let cancelled = false;
    setIsLoadingMyStatus(true);
    getMyOrgRatingStatus(viewingOrgLogin)
      .then((data) => { if (!cancelled) setMyStatus(data); })
      .catch(() => { if (!cancelled) setMyStatus({ eligible: false, rating: null }); })
      .finally(() => { if (!cancelled) setIsLoadingMyStatus(false); });
    return () => { cancelled = true; };
  }, [viewingOrgLogin, isAuthenticated]);

  const handleRatingSubmitted = () => {
    setRatings([]);
    fetchRatings(0);
    getMyOrgRatingStatus(viewingOrgLogin).then(setMyStatus).catch(() => {});
    getOrgSummary(viewingOrgLogin).then(setSummary).catch(() => {});
  };

  const cardClass = `backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-6 md:p-8 ${
    isDark ? 'bg-white/[0.08] border-white/15' : 'bg-white/[0.15] border-white/25'
  }`;
  const mutedText = isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]';
  const headingText = isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]';

  if (summaryError && !isLoadingSummary) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <p className={`text-[15px] ${mutedText}`}>Couldn't find an organization called "{viewingOrgLogin}".</p>
        {onBack && (
          <button onClick={onBack} className="mt-4 text-[13px] text-[#c9983a] hover:text-[#a67c2e] font-medium">
            ← Back
          </button>
        )}
      </div>
    );
  }

  const statTiles = [
    { icon: FolderGit2, label: 'Repositories', value: summary?.repo_count },
    { icon: Star, label: 'Stars', value: summary?.stars_count },
    { icon: Users, label: 'Contributors', value: summary?.contributors_count },
    { icon: GitPullRequest, label: 'Merged PRs', value: summary?.merged_prs_count },
  ];

  return (
    <div className="space-y-6">
      {onBack && (
        <button
          onClick={onBack}
          className={`flex items-center gap-2 text-[13px] font-medium transition-colors ${isDark ? 'text-[#d4c5b0] hover:text-white' : 'text-[#6b5d4d] hover:text-[#2d2820]'}`}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      )}

      {/* Header + stats stacked on the left (the "first row" and "second
          row"), with one big rank badge on the right spanning the full
          combined height of both - the rank badge markup mirrors
          ProfilePage.tsx's own full-size rank badge (same multi-layer
          glow/shine, ~56px rank number, decorative dots), not a compact
          tile, since this should read as the same "epic" badge a user gets
          on their own profile. */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex flex-col gap-4 flex-1">
          {/* Header (first row), with an ambient Spotlight glow behind it */}
          <div className={`relative overflow-hidden ${cardClass}`}>
            <Spotlight />
            <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="flex items-center gap-5 flex-1 min-w-0">
                {isLoadingSummary ? (
                  <SkeletonLoader variant="circle" width="88px" height="88px" />
                ) : (
                  <AvatarWithFallback
                    src={summary?.avatar_url || getGitHubAvatarUrl(viewingOrgLogin, 200)}
                    name={viewingOrgLogin}
                    className="w-[88px] h-[88px] rounded-[20px] border border-white/20 text-3xl shadow-[0_8px_24px_rgba(201,152,58,0.2)]"
                  />
                )}
                <div className="min-w-0">
                  {isLoadingSummary ? (
                    <SkeletonLoader variant="text" width="220px" height="34px" />
                  ) : (
                    <h1 className={`text-[30px] font-black tracking-tight truncate ${headingText}`}>{viewingOrgLogin}</h1>
                  )}
                  {!isLoadingSummary && summary && (
                    <div className={`flex items-center gap-1.5 mt-1.5 text-[14px] ${mutedText}`}>
                      <FolderGit2 className="w-4 h-4" />
                      {summary.repo_count} {summary.repo_count === 1 ? 'repository' : 'repositories'} on Grainlify
                    </div>
                  )}
                  {!isLoadingSummary && (
                    <div className="flex items-center gap-3 flex-wrap mt-4">
                      <OrgSocialLinks orgLogin={viewingOrgLogin} links={links} />
                      {isMaintainer && (
                        <button
                          type="button"
                          onClick={() => setIsLinksModalOpen(true)}
                          className={`inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                            isDark
                              ? 'bg-white/[0.06] border-white/15 text-[#d4c5b0] hover:bg-white/[0.1]'
                              : 'bg-white/[0.2] border-white/30 text-[#7a6b5a] hover:bg-white/[0.3]'
                          }`}
                        >
                          <Pencil className="w-3 h-3" />
                          Edit links
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats (second row) - one row, not split into sub-rows */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {statTiles.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className={`group relative overflow-hidden rounded-[20px] border p-5 backdrop-blur-[30px] transition-all duration-300 hover:-translate-y-0.5 ${
                  isDark
                    ? 'bg-white/[0.08] border-white/15 hover:border-[#c9983a]/40 hover:shadow-[0_12px_32px_rgba(201,152,58,0.15)]'
                    : 'bg-white/[0.18] border-white/30 hover:border-[#c9983a]/40 hover:shadow-[0_12px_32px_rgba(201,152,58,0.12)]'
                }`}
              >
                <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-[#c9983a]/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center justify-center w-10 h-10 rounded-[12px] bg-gradient-to-br from-[#c9983a]/25 to-[#d4af37]/15 border border-[#c9983a]/30 mb-3">
                  <Icon className="w-4.5 h-4.5 text-[#c9983a]" />
                </div>
                <div className={`relative text-[12px] mb-1 ${mutedText}`}>{label}</div>
                {isLoadingSummary ? (
                  <SkeletonLoader variant="text" width="50px" height="28px" />
                ) : (
                  <div className={`relative text-[26px] font-black ${headingText}`}>{value ?? 0}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Big rank badge - verbatim port of ProfilePage.tsx's rank badge,
            stretched (h-full, via the flex row's default stretch
            alignment) to span the combined height of the header + stats
            column beside it. */}
        <div className="relative group/rank flex-shrink-0 lg:w-[240px]">
          <div className="absolute inset-0 rounded-[28px] blur-2xl group-hover/rank:blur-3xl transition-all duration-700 opacity-80 bg-gradient-to-br from-[#c9983a]/50 via-[#d4af37]/35 to-transparent" />
          <div className="absolute inset-0 rounded-[28px] blur-xl group-hover/rank:scale-110 transition-transform duration-700 bg-gradient-to-br from-[#ffd700]/30 to-transparent" />

          <div className="relative h-full flex flex-col justify-center backdrop-blur-[40px] rounded-[28px] border-[3.5px] border-white/50 shadow-[0_15px_60px_rgba(201,152,58,0.5),inset_0_2px_4px_rgba(255,255,255,0.5),0_0_60px_rgba(255,215,0,0.2)] p-8 text-center group-hover/rank:scale-105 group-hover/rank:shadow-[0_20px_80px_rgba(201,152,58,0.6),inset_0_2px_4px_rgba(255,255,255,0.6)] transition-all duration-500 bg-gradient-to-br from-[#c9983a]/40 via-[#d4af37]/30 to-[#c9983a]/25">
            <div className="absolute top-4 left-4 w-4 h-4 rounded-full bg-white/50 shadow-[0_0_12px_rgba(255,255,255,0.8)] animate-pulse" />
            <div className="absolute top-4 right-4 w-3 h-3 rounded-full bg-[#c9983a]/70 shadow-[0_0_10px_rgba(201,152,58,0.9)]" />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white/40" />

            <div className="relative mb-3">
              {isLoadingSummary ? (
                <SkeletonLoader variant="text" width="120px" height="64px" className="mx-auto" />
              ) : summary?.rank_position ? (
                <div className={`text-[56px] font-black bg-gradient-to-b bg-clip-text text-transparent leading-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.2)] ${
                  isDark ? 'from-white via-[#f5efe5] to-[#c9983a]' : 'from-[#1a1410] via-[#2d2820] to-[#c9983a]'
                }`} style={{ letterSpacing: '-0.02em' }}>
                  {summary.rank_position}
                  <span className="text-[30px] align-super">
                    {summary.rank_position === 1 ? 'st' : summary.rank_position === 2 ? 'nd' : summary.rank_position === 3 ? 'rd' : 'th'}
                  </span>
                </div>
              ) : (
                <div className={`text-[42px] font-black leading-none ${isDark ? 'text-[#e8dfd0]' : 'text-gray-400'}`}>
                  Unranked
                </div>
              )}
            </div>

            {!isLoadingSummary && (
              <div className="h-[3px] w-16 mx-auto bg-gradient-to-r from-transparent via-[#c9983a]/80 to-transparent mb-4 rounded-full shadow-[0_2px_8px_rgba(201,152,58,0.4)]" />
            )}

            {isLoadingSummary ? (
              <SkeletonLoader variant="default" width="130px" height="34px" className="mx-auto" />
            ) : (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[10px] bg-white/[0.3] border-2 border-[#c9983a]/50 shadow-[0_3px_12px_rgba(201,152,58,0.3),inset_0_1px_2px_rgba(255,255,255,0.4)]">
                {getRankIcon(summary?.rank_tier_name || 'Bronze')}
                <span className="text-[12px] font-black text-white uppercase tracking-[0.15em] drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]">
                  {summary?.rank_tier_name || 'Bronze'}
                </span>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent rounded-[28px] opacity-0 group-hover/rank:opacity-100 transition-opacity duration-700" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#ffd700]/10 to-transparent rounded-[28px] animate-pulse" />
          </div>
        </div>
      </div>

      {/* Aggregate rating + review CTA - full width now that rank moved
          into the stats row above. */}
      <div className={cardClass}>
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-4">
            {summary?.average_rating ? (
              <>
                <div className={`text-[40px] font-black leading-none ${headingText}`}>
                  {summary.average_rating.toFixed(1)}
                </div>
                <div>
                  <StarRow value={summary.average_rating} size="w-4 h-4" />
                  <div className={`text-[12px] mt-1.5 ${mutedText}`}>
                    {summary.ratings_count} {summary.ratings_count === 1 ? 'review' : 'reviews'}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <StarRow value={0} size="w-5 h-5" />
                <div>
                  <div className={`text-[14px] font-bold ${headingText}`}>No ratings yet</div>
                  <div className={`text-[12px] ${mutedText}`}>Be the first to leave a review</div>
                </div>
              </div>
            )}
          </div>
          <div>
            {isLoadingMyStatus ? (
              <SkeletonLoader variant="default" width="170px" height="52px" className="rounded-[16px]" />
            ) : myStatus.rating ? (
              <div className="text-right">
                <p className={`text-[12px] mb-2.5 ${mutedText}`}>You rated this org {myStatus.rating.rating} / 5</p>
                <button
                  onClick={() => setIsRatingModalOpen(true)}
                  className="px-4 py-2 rounded-[10px] text-[13px] font-medium border border-[#c9983a]/50 text-[#c9983a] hover:bg-[#c9983a]/10 transition-all"
                >
                  Edit your review
                </button>
              </div>
            ) : myStatus.eligible ? (
              <button
                onClick={() => setIsRatingModalOpen(true)}
                className="px-5 py-2.5 rounded-[12px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-semibold text-[13px] shadow-[0_6px_20px_rgba(162,121,44,0.35)] hover:shadow-[0_8px_24px_rgba(162,121,44,0.5)] transition-all hover:scale-[1.02]"
              >
                Write a review
              </button>
            ) : (
              <p className={`text-[12px] max-w-[280px] text-right ${mutedText}`}>
                Get a pull request merged into {viewingOrgLogin} to leave a review here.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Contribution heatmap - same section ProfilePage.tsx shows on a
          user's own profile, ported to aggregate across the org's repos. */}
      <OrgContributionCalendar calendar={calendar} total={calendarTotal} isLoading={isLoadingCalendar} />

      {/* Activity chart (weekly issues/merged-PRs bar chart) removed for now
          per explicit request - fetch effect/state above and
          OrgActivityChart.tsx itself are left in place so this is a
          one-block re-add, not a rebuild, if it comes back later. */}

      {/* Repositories - shown inline so a repo is one click away, not a
          separate "view all" page. */}
      <div className={cardClass}>
        <h2 className={`text-[18px] font-bold mb-5 ${headingText}`}>Repositories</h2>
        {isLoadingRepos ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(3)].map((_, i) => (
              <SkeletonLoader key={i} variant="default" width="100%" height="220px" className="rounded-[16px]" />
            ))}
          </div>
        ) : repos.length === 0 ? (
          <p className={`text-[13px] ${mutedText}`}>No public repositories found for this org.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {repos.map((repo) => (
              <ProjectCard key={repo.id} project={repo} onClick={onProjectClick} />
            ))}
          </div>
        )}
      </div>

      {/* Reviews list */}
      <div className={cardClass}>
        <h2 className={`text-[18px] font-bold mb-5 ${headingText}`}>Reviews</h2>
        {isLoadingRatings && ratings.length === 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <SkeletonLoader key={i} variant="default" width="100%" height="96px" className="rounded-[16px]" />
            ))}
          </div>
        ) : ratings.length === 0 ? (
          <p className={`text-[13px] ${mutedText}`}>No reviews yet. Be the first to rate this org once your PR is merged.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {ratings.map((r) => (
              <div
                key={`${r.user_id}-${r.created_at}`}
                className={`rounded-[16px] border p-4 transition-colors ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white/[0.3] border-white/40'}`}
              >
                <div className="flex items-start gap-3">
                  <AvatarWithFallback
                    src={r.avatar_url || (r.github_login ? getGitHubAvatarUrl(r.github_login, 80) : '')}
                    name={r.display_name}
                    className="w-9 h-9 rounded-full border border-white/20 text-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => { window.location.href = `/dashboard?tab=profile&user=${r.github_login || r.user_id}`; }}
                        className={`text-[13px] font-semibold hover:text-[#c9983a] transition-colors ${headingText}`}
                      >
                        {r.display_name}
                      </button>
                      <StarRow value={r.rating} size="w-3 h-3" />
                      <span className={`text-[11px] ${mutedText}`}>{formatTimeAgo(r.updated_at || r.created_at)}</span>
                    </div>
                    {r.comment && (
                      <p className={`text-[13px] mt-1.5 ${isDark ? 'text-[#d4c5b0]' : 'text-[#4a4038]'}`}>{r.comment}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {ratings.length < ratingsTotal && (
          <div className="text-center mt-5">
            <button
              onClick={() => fetchRatings(ratings.length)}
              disabled={isLoadingRatings}
              className="text-[13px] text-[#c9983a] hover:text-[#a67c2e] font-medium disabled:opacity-50"
            >
              {isLoadingRatings ? 'Loading…' : 'Load more reviews'}
            </button>
          </div>
        )}
      </div>

      <RatingModal
        isOpen={isRatingModalOpen}
        onClose={() => setIsRatingModalOpen(false)}
        orgLogin={viewingOrgLogin}
        initialRating={myStatus.rating?.rating}
        initialComment={myStatus.rating?.comment}
        onSubmitted={handleRatingSubmitted}
      />

      <OrgLinksModal
        isOpen={isLinksModalOpen}
        onClose={() => setIsLinksModalOpen(false)}
        orgLogin={viewingOrgLogin}
        currentLinks={links}
        onSubmitted={setLinks}
      />
    </div>
  );
}
