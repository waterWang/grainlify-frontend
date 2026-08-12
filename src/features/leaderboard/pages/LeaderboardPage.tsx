import { useState, useEffect } from "react";
import {
  LeaderboardType,
  FilterType,
  LeaderboardWindow,
  LeaderData,
  ProjectData,
} from "../types";
import { getLeaderboard, getProjectLeaderboard } from "../../../shared/api/client";
import { getGitHubAvatarUrl } from "../../../shared/utils/avatar";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import { LeaderboardTypeToggle } from "../components/LeaderboardTypeToggle";
import { LeaderboardHero } from "../components/LeaderboardHero";
import { ContributorsPodium } from "../components/ContributorsPodium";
import { ProjectsPodium } from "../components/ProjectsPodium";
import { FiltersSection } from "../components/FiltersSection";
import { ContributorsTable } from "../components/ContributorsTable";
import { ProjectsTable } from "../components/ProjectsTable";
import { Pagination } from "../components/Pagination";
import { LeaderboardStyles } from "../components/LeaderboardStyles";
import { ContributorsPodiumSkeleton } from "../components/ContributorsPodiumSkeleton";
import { ContributorsTableSkeleton } from "../components/ContributorsTableSkeleton";

const PAGE_SIZE = 25;

export function LeaderboardPage() {
  const { theme } = useTheme();
  const [activeFilter, setActiveFilter] = useState<FilterType>("overall");
  const [leaderboardType, setLeaderboardType] =
    useState<LeaderboardType>("contributors");
  // The season board is the default view. An all-time cumulative count is
  // uncatchable for anyone who arrives after the first cohort, so the board
  // people land on is the one they can actually climb.
  const [leaderboardWindow, setLeaderboardWindow] =
    useState<LeaderboardWindow>("season");
  const [showEcosystemDropdown, setShowEcosystemDropdown] = useState(false);
  const [selectedEcosystem, setSelectedEcosystem] = useState({
    label: "All Ecosystems",
    value: "all",
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<LeaderData[]>([]);
  const [topThreeContributors, setTopThreeContributors] = useState<LeaderData[]>([]);
  const [projectsData, setProjectsData] = useState<ProjectData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  // The /leaderboard endpoint returns a bare array with no total count, so
  // real numbered pagination can't know the total page count upfront. Instead
  // we over-fetch by one item per page: getting PAGE_SIZE+1 back tells us page+1
  // exists (grow maxKnownPage), getting <=PAGE_SIZE tells us this is the last
  // page (isMaxPageFinal). The pagination bar only ever claims pages it has
  // actually confirmed, growing as the user pages forward.
  const [page, setPage] = useState(1);
  const [maxKnownPage, setMaxKnownPage] = useState(1);
  const [isMaxPageFinal, setIsMaxPageFinal] = useState(false);
  const [projectsPage, setProjectsPage] = useState(1);

  // Fetch leaderboard data
  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (leaderboardType === "contributors") {
        setIsLoading(true);
        try {
          const data = await getLeaderboard(
            PAGE_SIZE + 1,
            (page - 1) * PAGE_SIZE,
            selectedEcosystem.value !== "all"
              ? selectedEcosystem.value
              : undefined,
            leaderboardWindow,
          );
          const hasNextPage = data.length > PAGE_SIZE;
          // Transform API data to match LeaderData type
          const transformedData: LeaderData[] = data
            .slice(0, PAGE_SIZE)
            .map((item) => ({
              rank: item.rank,
              rank_tier: item.rank_tier,
              rank_tier_name: item.rank_tier_name,
              username: item.username,
              avatar: item.avatar || getGitHubAvatarUrl(item.username, 200),
              user_id: item.user_id || "",
              score: item.score,
              merged_prs: item.merged_prs,
              ecosystems: item.ecosystems || [],
            }));
          setLeaderboardData(transformedData);
          // Podium always reflects the true overall top 3, not whichever page
          // of the table is currently being viewed - only page 1's response
          // ever contains ranks 1-3, so only it updates this.
          if (page === 1) setTopThreeContributors(transformedData.slice(0, 3));
          setMaxKnownPage((prev) => Math.max(prev, hasNextPage ? page + 1 : page));
          setIsMaxPageFinal(!hasNextPage);
          setIsLoading(false);
        } catch (err) {
          console.error("Failed to fetch leaderboard:", err);
          setLeaderboardData([]);
          setIsLoading(false); // Set loading to false to show empty state instead of skeleton
        }
      } else {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
    // activeFilter is deliberately absent: it only changes which secondary
    // line each row renders, and including it refetched an identical page on
    // every dropdown change.
  }, [leaderboardType, selectedEcosystem.value, leaderboardWindow, page]);

  // Reset pagination when switching leaderboard type, ecosystem, or window -
  // otherwise page 3 of contributors could carry over to a filtered result
  // that only has 1 page.
  useEffect(() => {
    setPage(1);
    setMaxKnownPage(1);
    setIsMaxPageFinal(false);
  }, [leaderboardType, selectedEcosystem.value, leaderboardWindow]);

  // Fetch the projects leaderboard.
  //
  // This used to be assembled here in the browser: fetch the top 50 repos
  // from /projects/recommended, group by owner, and sum each repo's
  // contributor count. That was wrong twice - an org whose repos all fell
  // outside the top-50 sample never appeared at all, and anyone who
  // contributed to two repos in the same org was counted once per repo, so an
  // org could out-rank another on strictly fewer distinct people. The server
  // now ranks the full set by COUNT(DISTINCT contributor).
  useEffect(() => {
    if (leaderboardType !== "projects") return;
    let cancelled = false;
    const fetchProjects = async () => {
      setIsLoadingProjects(true);
      setProjectsPage(1);
      try {
        const res = await getProjectLeaderboard(
          100,
          0,
          selectedEcosystem.value !== "all"
            ? selectedEcosystem.value
            : undefined,
          leaderboardWindow,
        );
        if (cancelled) return;
        const mapped: ProjectData[] = (res?.projects ?? []).map((p) => ({
          rank: p.rank,
          name: p.name,
          logo: p.logo || getGitHubAvatarUrl(p.name, 200),
          score: p.score,
          contributors: p.contributors,
          merged_prs: p.merged_prs,
          open_issues: p.open_issues,
          ecosystems: p.ecosystems ?? [],
          activity: p.activity,
        }));
        setProjectsData(mapped);
      } catch (err) {
        console.error("Failed to fetch project leaderboard:", err);
        if (!cancelled) setProjectsData([]);
      } finally {
        if (!cancelled) setIsLoadingProjects(false);
      }
    };
    fetchProjects();
    return () => {
      cancelled = true;
    };
  }, [leaderboardType, selectedEcosystem.value, leaderboardWindow]);

  // Thirty animated SVG petals used to fall down this page, each carrying a
  // drop-shadow filter, with the whole set torn down and rebuilt every 15
  // seconds. They are gone: this is a page people open to find their own name
  // in a list, and decoration drifting across a table you are scanning is
  // working against the one thing the page is for. It also cost real frames -
  // see the measurements in the commit that removed it.
  useEffect(() => {
    const t = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Ensure we have at least 3 items for the podium (pad with empty data if needed)
  const contributorTopThree: LeaderData[] = [
    ...topThreeContributors,
    ...Array(Math.max(0, 3 - topThreeContributors.length))
      .fill(null)
      .map((_, i) => ({
        rank: topThreeContributors.length + i + 1,
        username: "-",
        avatar: "👤",
        score: 0,
        merged_prs: 0,
        ecosystems: [],
      })),
  ].slice(0, 3) as LeaderData[];

  const projectTopThree: ProjectData[] = [
    ...projectsData.slice(0, 3),
    ...Array(Math.max(0, 3 - projectsData.length))
      .fill(null)
      .map((_, i) => ({
        rank: projectsData.length + i + 1,
        name: "-",
        logo: "📦",
        score: 0,
        contributors: 0,
        ecosystems: [] as string[],
        activity: "Low",
      })),
  ].slice(0, 3) as ProjectData[];

  return (
    <div className="space-y-6 relative">
      {/* Leaderboard Type Toggle - Floating Above Everything */}
      <LeaderboardTypeToggle
        leaderboardType={leaderboardType}
        onToggle={setLeaderboardType}
        isLoaded={isLoaded}
      />

      {/* Hero Header Section */}
      <LeaderboardHero
        leaderboardType={leaderboardType}
        isLoaded={isLoaded}
        activeWindow={leaderboardWindow}
      >
        {/* Top 3 Podium - Contributors. Reflects the true overall top 3
            (topThreeContributors, only ever set from page 1) so it stays put
            while the table below is paged - it only shows its own skeleton
            on the very first load, not on every page change. */}
        {leaderboardType === "contributors" && isLoading && topThreeContributors.length === 0 && (
          <ContributorsPodiumSkeleton />
        )}
        {leaderboardType === "contributors" &&
          !(isLoading && topThreeContributors.length === 0) &&
          topThreeContributors.length > 0 && (
            <ContributorsPodium
              topThree={contributorTopThree}
              isLoaded={isLoaded}
              actualCount={topThreeContributors.length}
            />
          )}
        {leaderboardType === "contributors" &&
          !isLoading &&
          topThreeContributors.length === 0 && (
            <div
              className={`text-center py-8 transition-colors ${
                theme === "dark" ? "text-[#b8a898]" : "text-[#7a6b5a]"
              }`}
            >
              No contributors yet. Be the first to contribute!
            </div>
          )}

        {/* Top 3 Podium - Projects */}
        {leaderboardType === "projects" && isLoadingProjects && (
          <ContributorsPodiumSkeleton />
        )}
        {leaderboardType === "projects" && !isLoadingProjects && projectsData.length > 0 && (
          <ProjectsPodium topThree={projectTopThree} isLoaded={isLoaded} />
        )}
        {leaderboardType === "projects" && !isLoadingProjects && projectsData.length === 0 && (
          <div
            className={`text-center py-8 transition-colors ${
              theme === "dark" ? "text-[#b8a898]" : "text-[#7a6b5a]"
            }`}
          >
            No projects yet. Complete project setup to appear here.
          </div>
        )}
      </LeaderboardHero>

      {/* Filters Section */}
      <FiltersSection
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        selectedEcosystem={selectedEcosystem}
        onEcosystemChange={(ecosystem) => {
          setSelectedEcosystem(ecosystem);
        }}
        showDropdown={showEcosystemDropdown}
        onToggleDropdown={() =>
          setShowEcosystemDropdown(!showEcosystemDropdown)
        }
        isLoaded={isLoaded}
        activeWindow={leaderboardWindow}
        onWindowChange={setLeaderboardWindow}
      />

      {/* Leaderboard Table - Contributors */}
      {leaderboardType === "contributors" && (
        <>
          {isLoading ? (
            <ContributorsTableSkeleton />
          ) : (
            <>
              <ContributorsTable
                data={leaderboardData}
                activeFilter={activeFilter}
                isLoaded={isLoaded}
                onUserClick={(username, userId) => {
                  // Navigate to profile page with user identifier
                  const identifier = userId || username;
                  window.location.href = `/dashboard?tab=profile&user=${identifier}`;
                }}
              />
              <Pagination
                currentPage={page}
                maxKnownPage={maxKnownPage}
                isMaxPageFinal={isMaxPageFinal}
                onPageChange={setPage}
              />
            </>
          )}
        </>
      )}

      {/* Leaderboard Table - Projects */}
      {leaderboardType === "projects" && (
        <>
          {isLoadingProjects ? (
            <ContributorsTableSkeleton />
          ) : (
            <>
              <ProjectsTable
                data={projectsData.slice((projectsPage - 1) * PAGE_SIZE, projectsPage * PAGE_SIZE)}
                activeFilter={activeFilter}
                isLoaded={isLoaded}
              />
              <Pagination
                currentPage={projectsPage}
                maxKnownPage={Math.max(1, Math.ceil(projectsData.length / PAGE_SIZE))}
                isMaxPageFinal
                onPageChange={setProjectsPage}
              />
            </>
          )}
        </>
      )}

      {/* CSS Animations */}
      <LeaderboardStyles />
    </div>
  );
}
