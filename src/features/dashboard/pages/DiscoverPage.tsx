import { useTheme } from "../../../shared/contexts/ThemeContext";
import { useAuth } from "../../../shared/contexts/AuthContext";
import {
  GitFork,
  ArrowUpRight,
  Target,
  Zap,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { IssueCard } from "../../../shared/components/ui/IssueCard";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { IssueDetailPage } from "./IssueDetailPage";
import { ProjectDetailPage } from "./ProjectDetailPage";
import { DiscoverHero } from "./DiscoverHero";
import {
  getRecommendedProjects,
  getPublicProjectIssues,
  getUserProfile,
} from "../../../shared/api/client";
import { getGitHubAvatarUrl } from "../../../shared/utils/avatar";
import { SkeletonLoader } from "../../../shared/components/SkeletonLoader";
import { useOptimisticData } from "../../../shared/hooks/useOptimisticData";
import { EmptyState } from "../../../shared/components/EmptyState";
import {
  DiscoverProjectCard,
  type DiscoverProject,
} from "./DiscoverProjectCard";
import { loadProfilesFromStorage } from "../../settings/contexts/BillingProfilesContext";
import {
  sectionContainerVariants,
  sectionVariants,
  cardContainerVariants,
  cardVariants,
  getOnBrandGradient,
} from "../../../shared/utils/motionVariants";

// Design tiers used throughout this page (kept local, not global tokens — see plan):
//   Outer section card : rounded-[24px]  + shadow-[0_8px_32px_rgba(0,0,0,0.08)] + backdrop-blur-[40px]
//   Inner content card  : rounded-[16px] + backdrop-blur-[30px] + resting/hover shadow
//   Button               : rounded-[14px] + gold shadow (resting/hover)
//   Pill / chip           : rounded-full

// Helper function to format numbers (e.g., 1234 -> "1.2K", 1234567 -> "1.2M")
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};

// Helper function to get project icon/avatar
const getProjectIcon = (githubFullName: string): string => {
  const [owner] = githubFullName.split("/");
  // Use higher‑resolution owner avatar so cards look crisp
  return getGitHubAvatarUrl(owner, 200);
};

// On-brand gradient for the avatar-fallback initial letter — shared with ProjectCard.tsx
const getProjectColor = getOnBrandGradient;

// Helper function to truncate description to first line or first 80 characters
const truncateDescription = (
  description: string | undefined | null,
  maxLength: number = 80,
): string => {
  if (!description || description.trim() === "") {
    return "";
  }

  // Get first line
  const firstLine = description.split("\n")[0].trim();

  // If first line is longer than maxLength, truncate it
  if (firstLine.length > maxLength) {
    return firstLine.substring(0, maxLength).trim() + "...";
  }

  return firstLine;
};

// Helper function to clean and truncate issue description
const cleanIssueDescription = (
  description: string | null | undefined,
  maxLines: number = 2,
  maxLength: number = 150,
): string => {
  if (!description || description.trim() === "") {
    return "";
  }

  // Remove markdown headers and formatting
  let cleaned = description
    // Remove markdown headers (##, ###, etc.)
    .replace(/^#{1,6}\s+/gm, "")
    // Remove bold/italic markdown (**text**, *text*)
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    // Remove common prefixes like "Description:", "**Description:**", etc.
    .replace(/^(Description|DESCRIPTION|description):\s*/i, "")
    .replace(/^\*\*Description:\*\*\s*/i, "")
    .replace(/^\*\*DESCRIPTION:\*\*\s*/i, "")
    // Remove leading/trailing whitespace
    .trim();

  // Split into lines and take first maxLines
  const lines = cleaned.split("\n").filter((line) => line.trim() !== "");
  const selectedLines = lines.slice(0, maxLines).join(" ").trim();

  // Truncate if too long
  if (selectedLines.length > maxLength) {
    return selectedLines.substring(0, maxLength).trim() + "...";
  }

  return selectedLines;
};

// Helper function to calculate days left (mock for now, can be enhanced with actual dates)
const getDaysLeft = (): string => {
  const days = Math.floor(Math.random() * 10) + 1;
  return `${days} days left`;
};

// Helper function to get primary tag from issue labels
const getPrimaryTag = (labels: any[]): string | undefined => {
  if (!Array.isArray(labels) || labels.length === 0) return undefined;

  // Check for common tags
  const tagMap: Record<string, string> = {
    "good first issue": "good first issue",
    "good-first-issue": "good first issue",
    bug: "bug",
    enhancement: "enhancement",
    feature: "feature",
    performance: "performance",
    a11y: "a11y",
    accessibility: "a11y",
  };

  for (const label of labels) {
    const labelName =
      typeof label === "string"
        ? label.toLowerCase()
        : (label?.name || "").toLowerCase();
    if (tagMap[labelName]) {
      return tagMap[labelName];
    }
  }

  return undefined;
};

type ProjectType = DiscoverProject;

type IssueType = {
  id: string;
  title: string;
  description: string;
  language: string;
  daysLeft: string;
  primaryTag?: string;
  projectId: string;
};

interface DiscoverPageProps {
  onGoToBilling?: () => void;
  onGoToOpenSourceWeek?: () => void;
  /** Dashboard's `activeRole` (the CONTRIBUTOR/MAINTAINER/ADMIN nav pill) -
   * forwarded to this page's own IssueDetailPage overlay so maintainer
   * actions there require actually being in maintainer/admin mode, not just
   * owning the project. */
  activeRole?: 'contributor' | 'maintainer' | 'admin';
}

export function DiscoverPage({
  onGoToBilling,
  onGoToOpenSourceWeek,
  activeRole,
}: DiscoverPageProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { user, userRole } = useAuth();
  const prefersReducedMotion = useReducedMotion();
  const [searchParams, setSearchParams] = useSearchParams();
  // Derived directly from ?dIssue=/?dProject= (not local state) so this
  // overlay - previously invisible to the URL entirely - survives a reload
  // and stays correct on browser back/forward. Distinct param names from
  // Dashboard's own ?issue=/?project= (that one drives a *different* global
  // overlay, triggered from Browse/Ecosystems/OSW/Search/Profile).
  const dIssueId = searchParams.get('dIssue');
  const dProjectId = searchParams.get('dProject');
  const selectedIssue = dIssueId ? { issueId: dIssueId, projectId: dProjectId || undefined } : null;
  const selectedProjectId = !dIssueId ? dProjectId : null;

  // Real onboarding status for the hero's setup nudge — billing profiles are
  // stored client-side today (see BillingProfilesContext), KYC comes from the API.
  // Starts "loading" so the nudge never flashes incomplete before either resolves.
  const [isLoadingSetupStatus, setIsLoadingSetupStatus] = useState(true);
  const [hasBillingProfile, setHasBillingProfile] = useState(false);
  const [kycVerified, setKycVerified] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setHasBillingProfile(loadProfilesFromStorage().length > 0);

    getUserProfile()
      .then((profile) => {
        if (cancelled) return;
        setKycVerified(Boolean(profile?.kyc_verified));
      })
      .catch((err) => {
        console.warn("DiscoverPage: Failed to load KYC status", err);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSetupStatus(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Use optimistic data hook for projects with 30-second cache
  const {
    data: projects,
    isLoading: isLoadingProjects,
    fetchData: fetchProjects,
  } = useOptimisticData<ProjectType[]>([], { cacheDuration: 30000 });

  // Use optimistic data hook for issues with 30-second cache
  const {
    data: recommendedIssues,
    isLoading: isLoadingIssues,
    fetchData: fetchIssues,
  } = useOptimisticData<IssueType[]>([], { cacheDuration: 30000 });

  // "View all issues" expands this same in-place list instead of navigating
  // anywhere - it used to route to MaintainersPage's Issues tab (owner-only
  // chrome, an empty project/issue list for anyone who doesn't own a repo),
  // which was a real bug for every contributor. See loadRecommendedIssues.
  const [showAllIssues, setShowAllIssues] = useState(false);

  // Fetch recommended projects
  useEffect(() => {
    const loadRecommendedProjects = async () => {
      await fetchProjects(async () => {
        // Fetch a larger pool than we display - grouping repos down to one
        // card per org means a small fetch could otherwise collapse to just
        // 1-2 cards when one org owns most of the top projects.
        const response = await getRecommendedProjects(50);
        console.log("DiscoverPage: Recommended projects response", response);

        // Handle response - check if it exists and has projects array
        if (!response) {
          console.warn("DiscoverPage: No response received");
          return [];
        }

        // Handle both { projects: [...] } and direct array response
        const projectsArray =
          response.projects || (Array.isArray(response) ? response : []);

        if (!Array.isArray(projectsArray)) {
          console.error(
            "DiscoverPage: Invalid response format - projects is not an array",
            response,
          );
          return [];
        }

        const filteredProjects = projectsArray.filter((p) => {
          if (!p || !p.id || !p.github_full_name) return false;
          const repoName =
            p.github_full_name.split("/")[1] || p.github_full_name;
          return repoName !== ".github";
        });

        // One card per org, not per repo - getRecommendedProjects is already
        // sorted by contributors_count, so the first repo seen for a given
        // owner is that org's best one; later repos from the same owner are
        // just skipped rather than shown as separate cards.
        const seenOwners = new Set<string>();
        const oneRepoPerOrg = filteredProjects.filter((p) => {
          const owner = p.github_full_name.split('/')[0];
          if (seenOwners.has(owner)) return false;
          seenOwners.add(owner);
          return true;
        });

        const mappedProjects = oneRepoPerOrg.slice(0, 8).map((p) => {
          const owner = p.github_full_name.split('/')[0];
          return {
            id: p.id,
            name: owner,
            icon: getProjectIcon(p.github_full_name),
            stars: formatNumber(p.stars_count || 0),
            forks: formatNumber(p.forks_count || 0),
            issues: p.open_issues_count || 0,
            description: truncateDescription(p.description) || "",
            tags: Array.isArray(p.tags) ? p.tags.slice(0, 2) : [],
            color: getProjectColor(owner),
            ecosystem_name: p.ecosystem_name ?? null,
          };
        });

        console.log("DiscoverPage: Mapped projects", mappedProjects);
        return mappedProjects;
      });
    };

    loadRecommendedProjects();
  }, [fetchProjects]);

  // Fetch recommended issues from top projects (useOptimisticData manages loading state)
  useEffect(() => {
    const loadRecommendedIssues = async () => {
      // Still waiting on projects to resolve — don't touch issues loading state yet.
      if (isLoadingProjects) return;

      // No projects means there's nothing to source issues from. Resolve with an
      // empty result instead of returning early, which would leave isLoadingIssues
      // stuck at its initial `true` forever (fetchIssues would never be called).
      if (projects.length === 0) {
        await fetchIssues(async () => []);
        return;
      }

      // "View all issues" fetches a bigger pool in place, rather than
      // navigating anywhere - see showAllIssues above. forceRefresh=true
      // when expanding: useOptimisticData's cache is a single time-windowed
      // slot with no awareness of these caps, so within its 30s window a
      // plain fetchIssues() call here would just re-serve the stale 6-issue
      // result instead of actually running this closure again.
      const perProjectCap = showAllIssues ? 5 : 2;
      const totalCap = showAllIssues ? 40 : 6;

      await fetchIssues(async () => {
        const issues: IssueType[] = [];

        // Try to get issues from projects, moving to next if a project has no issues
        for (const project of projects) {
          if (issues.length >= totalCap) break;
          try {
            const issuesResponse = await getPublicProjectIssues(project.id);
            if (issuesResponse?.issues && Array.isArray(issuesResponse.issues) && issuesResponse.issues.length > 0) {
              // Take up to perProjectCap issues from this project
              const projectIssues = issuesResponse.issues.slice(0, perProjectCap);
              for (const issue of projectIssues) {
                if (issues.length >= totalCap) break;

                // Get project language for the issue
                const projectData = projects.find(p => p.id === project.id);
                const language = projectData?.tags.find(t => ['TypeScript', 'JavaScript', 'Python', 'Rust', 'Go', 'CSS', 'HTML'].includes(t)) || projectData?.tags[0] || 'TypeScript';

                issues.push({
                  id: String(issue.github_issue_id),
                  title: issue.title || 'Untitled Issue',
                  description: cleanIssueDescription(issue.description),
                  language: language,
                  daysLeft: getDaysLeft(),
                  primaryTag: getPrimaryTag(issue.labels || []),
                  projectId: project.id,
                });
              }
            }
          } catch (err) {
            // If fetching issues fails, continue to next project
            console.warn(`Failed to fetch issues for project ${project.id}:`, err);
            continue;
          }
        }

        return issues;
      }, showAllIssues);
    };

    loadRecommendedIssues();
    // fetchIssues is deliberately NOT a dependency here - useOptimisticData's
    // fetchData is a useCallback closed over its own `data` state, so its
    // identity changes on every successful fetch. Combined with
    // forceRefresh=showAllIssues above (needed so expanding the list is
    // never silently swallowed by the 30s cache), including it here creates
    // a genuine infinite loop once showAllIssues is true: fetch resolves ->
    // data changes -> fetchIssues gets a new identity -> this effect
    // re-fires because fetchIssues "changed" -> fetches again -> forever.
    // Confirmed via an identical bug in BrowsePage.tsx's filter fetch
    // (2026-08-09) - a waitFor-based test can pass without ever exposing
    // this, since it stops polling the instant its assertion is met once,
    // even while the effect keeps looping in the background afterward.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, isLoadingProjects, showAllIssues]);

  // If an issue is selected, show the detail page instead
  if (selectedIssue) {
    return (
      <IssueDetailPage
        issueId={selectedIssue.issueId}
        projectId={selectedIssue.projectId}
        userRole={userRole}
        activeRole={activeRole}
        onClose={() => {
          const next = new URLSearchParams(searchParams);
          next.delete('dIssue');
          next.delete('dProject');
          setSearchParams(next);
        }}
      />
    );
  }

  // If a project is selected, show the detail page instead
  if (selectedProjectId) {
    return (
      <ProjectDetailPage
        projectId={selectedProjectId}
        onClose={() => {
          const next = new URLSearchParams(searchParams);
          next.delete('dProject');
          setSearchParams(next);
        }}
      />
    );
  }

  return (
    <motion.div
      className="space-y-4 md:space-y-6 px-4 md:px-0 pb-8"
      variants={sectionContainerVariants}
      initial={prefersReducedMotion ? false : "hidden"}
      animate="visible"
    >
      {/* Welcome + setup nudge — compact by design: this is the first thing a user
          sees after every login, not just the first ever, so it must not cost a
          full screen every time. See DiscoverHero for the reasoning. */}
      <motion.div variants={sectionVariants} className="space-y-4 md:space-y-6">
        <DiscoverHero
          login={user?.github?.login}
          avatarUrl={user?.github?.avatar_url}
          isLoadingStatus={isLoadingSetupStatus}
          hasBillingProfile={hasBillingProfile}
          kycVerified={kycVerified}
          onGoToBilling={onGoToBilling}
        />
      </motion.div>

      {/* Embark on GrainHack — an elevated feature banner: a real moment, but not a second full hero */}
      <motion.div
        variants={sectionVariants}
        className={`relative overflow-hidden backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-colors ${isDark
          ? 'bg-white/[0.08] border-white/10'
          : 'bg-white/[0.12] border-white/20'
          }`}>
        {/* Aurora accent */}
        <motion.div
          className="absolute -top-16 right-[-60px] w-[360px] h-[360px] rounded-full bg-[#c9983a]/25 blur-[100px] pointer-events-none"
          animate={prefersReducedMotion ? undefined : { x: [0, -20, 20, 0], y: [0, 20, -10, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12 px-6 md:px-12 py-10 md:py-14">
          <div className="flex-1 text-center md:text-left">
            <h3 className={`text-2xl md:text-[34px] font-bold mb-3 leading-tight transition-colors ${isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'
              }`}>
              Join the <span className="text-[#c9983a]">GrainHack</span>
            </h3>
            <p className={`text-sm md:text-[16px] mb-6 max-w-md mx-auto md:mx-0 transition-colors ${isDark ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'
              }`}>
              Track your Open Source Week progress directly from your dashboard and compete for a spot on the leaderboard.
            </p>
            <button
              onClick={onGoToOpenSourceWeek}
              disabled={!onGoToOpenSourceWeek}
              className={`px-7 py-3.5 rounded-[14px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-semibold text-[15px] shadow-[0_6px_20px_rgba(162,121,44,0.35)] hover:shadow-[0_8px_28px_rgba(162,121,44,0.45)] transition-all inline-flex items-center gap-2 border border-white/10 ${!onGoToOpenSourceWeek ? 'opacity-70 cursor-default' : ''
                }`}
            >
              <span>Let's go</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          {/* Radar-ping badge */}
          <div className="relative flex-shrink-0 w-28 h-28 md:w-36 md:h-36 flex items-center justify-center">
            {!prefersReducedMotion && (
              <>
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-[#c9983a]/40"
                  animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-[#c9983a]/40"
                  animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut', delay: 1.2 }}
                />
              </>
            )}
            <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-[#c9983a] to-[#a67c2e] flex items-center justify-center shadow-[0_8px_24px_rgba(162,121,44,0.4)] border border-white/15">
              <Target className="w-9 h-9 md:w-11 md:h-11 text-white" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Recommended Projects */}
      <motion.div
        variants={sectionVariants}
        className={`backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-6 md:p-8 transition-colors ${isDark
          ? 'bg-white/[0.08] border-white/10'
          : 'bg-white/[0.12] border-white/20'
          }`}>
        <div className="flex items-center space-x-3 mb-2">
          <Zap className="w-5 h-5 md:w-6 md:h-6 text-[#c9983a] drop-shadow-sm" />
          <h3 className={`text-xl md:text-[24px] font-bold transition-colors ${isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'
            }`}>
            Recommended Projects ({projects.length})
          </h3>
        </div>
        {isLoadingProjects && (
          <p className={`text-[13px] md:text-[14px] mb-6 transition-colors ${isDark ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'
            }`}>
            Finding projects best suited to your interests and expertise
          </p>
        )}

        {isLoadingProjects ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 mt-6">
            {[...Array(8)].map((_, idx) => (
              <div key={idx} className={`backdrop-blur-[30px] rounded-[16px] border p-6 ${isDark ? 'bg-white/[0.08] border-white/15' : 'bg-white/[0.15] border-white/25'
                }`}>
                {/* Icon and Heart button */}
                <div className="flex items-start justify-between mb-4">
                  <SkeletonLoader
                    variant="default"
                    className="w-12 h-12 rounded-[12px]"
                  />
                  <SkeletonLoader
                    variant="default"
                    className="w-5 h-5 rounded-full"
                  />
                </div>

                {/* Title */}
                <SkeletonLoader className="h-5 w-3/4 mb-2" />

                {/* Description */}
                <SkeletonLoader className="h-3 w-full mb-1" />
                <SkeletonLoader className="h-3 w-5/6 mb-4" />

                {/* Stars and Forks */}
                <div className="flex items-center space-x-4 mb-4">
                  <SkeletonLoader className="h-4 w-16" />
                  <SkeletonLoader className="h-4 w-16" />
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  <SkeletonLoader className="h-7 w-20 rounded-full" />
                  <SkeletonLoader className="h-7 w-24 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon={Target}
              title="No recommended projects found"
              description="Finish setting up your profile so we can match you with projects."
            />
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 mt-6"
            variants={cardContainerVariants}
            initial={prefersReducedMotion ? false : "hidden"}
            animate="visible"
          >
            {projects.map((project) => (
              <DiscoverProjectCard
                key={project.id}
                project={project}
                onClick={() => {
                  // Each card here represents a whole org (deduped to one
                  // card per owner, see mappedProjects above), not the single
                  // repo project.id happens to carry - so this must open the
                  // org's own page (all its repos, rank, ratings), not drop
                  // straight into that one repo's ProjectDetailPage. The org
                  // login is only available via project.name (see
                  // mappedProjects' `name: owner` above).
                  window.location.href = `/dashboard?tab=org&org=${encodeURIComponent(project.name)}`;
                }}
                variants={cardVariants}
              />
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* Recommended Issues */}
      <motion.div
        variants={sectionVariants}
        className={`backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-6 md:p-8 transition-colors ${isDark
          ? 'bg-white/[0.08] border-white/10'
          : 'bg-white/[0.12] border-white/20'
          }`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            <GitFork className="w-5 h-5 md:w-6 md:h-6 text-[#c9983a] drop-shadow-sm" />
            <h3 className={`text-xl md:text-[24px] font-bold transition-colors ${isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'
              }`}>Recommended Issues</h3>
          </div>
          {!showAllIssues && recommendedIssues.length > 0 && (
            <button
              onClick={() => setShowAllIssues(true)}
              className={`shrink-0 inline-flex items-center gap-1 text-[13px] md:text-[14px] font-semibold transition-colors ${
                isDark ? 'text-[#c9983a] hover:text-[#e8c77f]' : 'text-[#a67c2e] hover:text-[#c9983a]'
              }`}
            >
              View all issues
              <ArrowUpRight className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className={`text-[13px] md:text-[14px] mb-6 transition-colors ${isDark ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'
          }`}>
          Issues that match your interests and expertise
        </p>

        {isLoadingIssues ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
            {[...Array(6)].map((_, idx) => (
              <div key={idx} className={`backdrop-blur-[30px] rounded-[16px] border p-6 ${isDark ? 'bg-white/[0.08] border-white/15' : 'bg-white/[0.15] border-white/25'
                }`}>
                {/* Title with status indicator */}
                <div className="flex items-start gap-3 mb-3">
                  <SkeletonLoader
                    variant="circle"
                    className="w-5 h-5 flex-shrink-0"
                  />
                  <SkeletonLoader className="h-5 w-3/4" />
                </div>

                {/* Description */}
                <div className="ml-8 mb-4">
                  <SkeletonLoader className="h-4 w-full mb-1" />
                  <SkeletonLoader className="h-4 w-5/6" />
                </div>

                {/* Bottom row: Language, Days Left, Tag */}
                <div className="flex items-center justify-between ml-8">
                  <div className="flex items-center gap-3">
                    <SkeletonLoader variant="circle" className="w-4 h-4" />
                    <SkeletonLoader className="h-4 w-20" />
                    <SkeletonLoader className="h-4 w-16" />
                  </div>
                  <SkeletonLoader className="h-6 w-24 rounded-[8px]" />
                </div>
              </div>
            ))}
          </div>
        ) : recommendedIssues.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No recommended issues found"
            description="Try checking back later or explore projects manually."
          />
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6"
            variants={cardContainerVariants}
            initial={prefersReducedMotion ? false : "hidden"}
            animate="visible"
          >
            {recommendedIssues.map((issue) => (
              <motion.div
                key={issue.id}
                variants={cardVariants}
                className="h-full motion-safe:hover:-translate-y-1 transition-transform active:scale-[0.98]"
              >
                <IssueCard
                  id={issue.id}
                  title={issue.title}
                  description={issue.description}
                  language={issue.language}
                  daysLeft={issue.daysLeft}
                  variant="recommended"
                  primaryTag={issue.primaryTag}
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    next.set('dIssue', issue.id);
                    next.set('dProject', issue.projectId);
                    setSearchParams(next);
                  }}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
