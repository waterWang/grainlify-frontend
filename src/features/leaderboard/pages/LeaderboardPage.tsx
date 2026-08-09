import { useState, useEffect } from "react";
import { LeaderboardType, FilterType, Petal, LeaderData, ProjectData } from "../types";
import { getLeaderboard, getRecommendedProjects } from "../../../shared/api/client";
import { getGitHubAvatarUrl } from "../../../shared/utils/avatar";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import { FallingPetals } from "../components/FallingPetals";
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
  const [showEcosystemDropdown, setShowEcosystemDropdown] = useState(false);
  const [selectedEcosystem, setSelectedEcosystem] = useState({
    label: "All Ecosystems",
    value: "all",
  });
  const [petals, setPetals] = useState<Petal[]>([]);
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
              trend: item.trend,
              trendValue: item.trendValue,
              contributions: item.contributions,
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
  }, [leaderboardType, activeFilter, selectedEcosystem.value, page]);

  // Reset pagination when switching leaderboard type, filter, or ecosystem -
  // otherwise page 3 of contributors could carry over to a filtered result
  // that only has 1 page.
  useEffect(() => {
    setPage(1);
    setMaxKnownPage(1);
    setIsMaxPageFinal(false);
  }, [leaderboardType, activeFilter, selectedEcosystem.value]);

  // Fetch projects leaderboard (top projects by contributors count)
  useEffect(() => {
    if (leaderboardType !== "projects") return;
    let cancelled = false;
    const fetchProjects = async () => {
      setIsLoadingProjects(true);
      setProjectsPage(1);
      try {
        const res = await getRecommendedProjects(50);
        const projects = res?.projects ?? [];
        if (cancelled) return;

        // Rank by organization, not by individual repo - a maintainer with
        // several repos would otherwise take up several leaderboard slots.
        const byOwner = new Map<string, typeof projects>();
        for (const p of projects) {
          const [owner, repo] = p.github_full_name.split("/");
          if (!owner || repo === ".github") continue;
          const list = byOwner.get(owner) ?? [];
          list.push(p);
          byOwner.set(owner, list);
        }

        const mapped: ProjectData[] = Array.from(byOwner.entries())
          .map(([owner, repos]) => {
            const contributors = repos.reduce((sum, r) => sum + (r.contributors_count ?? 0), 0);
            const openIssues = repos.reduce((sum, r) => sum + (r.open_issues_count ?? 0), 0);
            const activity =
              openIssues > 10 ? "Very High" : openIssues > 5 ? "High" : openIssues > 2 ? "Medium" : "Low";
            const ecosystems = Array.from(
              new Set(repos.map((r) => r.ecosystem_name).filter((e): e is string => Boolean(e))),
            );
            return {
              name: owner,
              logo: getGitHubAvatarUrl(owner, 200),
              score: contributors,
              trend: "same" as const,
              trendValue: 0,
              contributors,
              ecosystems,
              activity,
            };
          })
          .sort((a, b) => b.score - a.score)
          .map((org, idx) => ({ ...org, rank: idx + 1 }));
        setProjectsData(mapped);
      } catch (err) {
        if (!cancelled) setProjectsData([]);
      } finally {
        if (!cancelled) setIsLoadingProjects(false);
      }
    };
    fetchProjects();
    return () => {
      cancelled = true;
    };
  }, [leaderboardType]);

  // Generate falling petals on mount
  useEffect(() => {
    const generatePetals = () => {
      const newPetals: Petal[] = [];
      for (let i = 0; i < 30; i++) {
        newPetals.push({
          id: i,
          left: Math.random() * 100,
          delay: Math.random() * 5,
          duration: 8 + Math.random() * 6,
          rotation: Math.random() * 360,
          size: 0.6 + Math.random() * 0.8,
        });
      }
      setPetals(newPetals);
    };

    generatePetals();
    setTimeout(() => setIsLoaded(true), 100);

    // Regenerate petals every 15 seconds for continuous effect
    const interval = setInterval(generatePetals, 15000);
    return () => clearInterval(interval);
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
        trend: "same" as const,
        trendValue: 0,
        contributions: 0,
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
        trend: "same" as const,
        trendValue: 0,
        contributors: 0,
        ecosystems: [] as string[],
        activity: "Low",
      })),
  ].slice(0, 3) as ProjectData[];

  return (
    <div className="space-y-6 relative">
      {/* Falling Golden Petals - Full Page */}
      <FallingPetals petals={petals} />

      {/* Leaderboard Type Toggle - Floating Above Everything */}
      <LeaderboardTypeToggle
        leaderboardType={leaderboardType}
        onToggle={setLeaderboardType}
        isLoaded={isLoaded}
      />

      {/* Hero Header Section */}
      <LeaderboardHero leaderboardType={leaderboardType} isLoaded={isLoaded}>
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
