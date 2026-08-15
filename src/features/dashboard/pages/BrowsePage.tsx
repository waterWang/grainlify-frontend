import { X, SearchX, AlertCircle, Building2, FolderGit2 } from "lucide-react";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import { useState, useEffect, useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Dropdown } from "../../../shared/components/ui/Dropdown";
import { ProjectCard, Project } from "../components/ProjectCard";
import { ProjectCardSkeleton } from "../components/ProjectCardSkeleton";
import { OrganizationCardSkeleton } from "../components/OrganizationCardSkeleton";
import { OrganizationCard, Organization } from "../components/OrganizationCard";
import { LanguageIcon } from "../../../shared/components/LanguageIcon";
import { getPublicProjects, getEcosystems, getProjectFilters } from "../../../shared/api/client";
import { getGitHubAvatarUrl } from "../../../shared/utils/avatar";
import {
  isValidProject,
  getRepoName,
} from "../../../shared/utils/projectFilter";
import { EmptyState } from "../../../shared/components/EmptyState";
import {
  cardContainerVariants,
  cardVariants,
} from "../../../shared/utils/motionVariants";

import { useOptimisticData } from "../../../shared/hooks/useOptimisticData";

interface BrowsePageProps {
  onProjectClick?: (id: string) => void;
  /** Navigates to that org's own profile page - Browse itself no longer
   * has an inline org drill-down view (see viewMode below). */
  onOrgClick?: (org: string) => void;
}

type FilterKey = "languages" | "ecosystems" | "categories" | "tags";

const FILTER_TYPES: { key: FilterKey; label: string }[] = [
  { key: "languages", label: "Language" },
  { key: "ecosystems", label: "Ecosystem" },
  { key: "categories", label: "Category" },
  { key: "tags", label: "Tag" },
];

// BrowsePage's own project shape carries the owning org alongside whatever
// ProjectCard needs to render - Browse groups by org, ProjectCard doesn't
// need to know that grouping exists.
interface BrowseProject extends Project {
  owner: string;
  // Raw star count for org-level aggregation - `stars` above is already
  // formatted for display (e.g. "1.2K") and can't be summed directly.
  starsCount: number;
}

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

// Helper function to get gradient color based on project name
const getProjectColor = (name: string): string => {
  const colors = [
    "from-blue-500 to-cyan-500",
    "from-purple-500 to-pink-500",
    "from-green-500 to-emerald-500",
    "from-red-500 to-pink-500",
    "from-orange-500 to-red-500",
    "from-gray-600 to-gray-800",
    "from-green-600 to-green-800",
    "from-cyan-500 to-blue-600",
  ];
  const hash = name
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

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

export function BrowsePage({ onProjectClick, onOrgClick }: BrowsePageProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const prefersReducedMotion = useReducedMotion();
  const [viewMode, setViewMode] = useState<"orgs" | "repos">("orgs");
  const [activeFilterType, setActiveFilterType] = useState<FilterKey>("languages");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [searchTerms, setSearchTerms] = useState<{ [key: string]: string }>({
    languages: "",
    ecosystems: "",
    categories: "",
    tags: "",
  });
  const [selectedFilters, setSelectedFilters] = useState<{
    [key: string]: string[];
  }>({
    languages: [],
    ecosystems: [],
    categories: [],
    tags: [],
  });

  // Use optimistic data hook for projects with 30-second cache
  const {
    data: projects,
    isLoading,
    hasError,
    fetchData: fetchProjects,
  } = useOptimisticData<BrowseProject[]>([], { cacheDuration: 30000 });

  // Group projects by their GitHub org/owner for the "Organizations" view.
  const organizations = useMemo<Organization[]>(() => {
    const byOwner = new Map<string, BrowseProject[]>();
    for (const project of projects) {
      const list = byOwner.get(project.owner) ?? [];
      list.push(project);
      byOwner.set(project.owner, list);
    }
    return Array.from(byOwner.entries())
      .map(([owner, repos]) => ({
        name: owner,
        avatar: getGitHubAvatarUrl(owner, 200),
        repoCount: repos.length,
        totalStars: repos.reduce((sum, r) => sum + r.starsCount, 0),
        totalContributors: repos.reduce((sum, r) => sum + r.contributors, 0),
      }))
      .sort((a, b) => b.repoCount - a.repoCount || a.name.localeCompare(b.name));
  }, [projects]);

  const [ecosystems, setEcosystems] = useState<Array<{ name: string }>>([]);
  const [dynamicFilters, setDynamicFilters] = useState<{ languages: string[]; categories: string[]; tags: string[] }>({
    languages: [],
    categories: [],
    tags: [],
  });

  // Language/category/tag values are whatever's actually on verified
  // projects right now (no hardcoded allow-list anywhere in the schema) -
  // fetched once via the existing, previously-unused /projects/filters
  // endpoint so a maintainer adding a project with a new language/category/
  // tag makes it show up here automatically, no code change needed.
  useEffect(() => {
    getProjectFilters()
      .then((data) => setDynamicFilters({ languages: data.languages, categories: data.categories, tags: data.tags }))
      .catch(() => { /* leave dynamicFilters empty - that filter type just shows no options */ });
  }, []);

  // Filter options data - languages/categories/tags are DB-driven (see
  // dynamicFilters above), only ecosystems was already dynamic before this.
  const filterOptions: Record<FilterKey, { name: string }[]> = {
    languages: dynamicFilters.languages.map((name) => ({ name })),
    ecosystems: ecosystems,
    categories: dynamicFilters.categories.map((name) => ({ name })),
    tags: dynamicFilters.tags.map((name) => ({ name })),
  };

  // Fetch ecosystems from API
  useEffect(() => {
    const fetchEcosystems = async () => {
      try {
        const response = await getEcosystems();
        // Handle different response structures
        let ecosystemsArray: any[] = [];

        if (response && Array.isArray(response)) {
          ecosystemsArray = response;
        } else if (
          response &&
          response.ecosystems &&
          Array.isArray(response.ecosystems)
        ) {
          ecosystemsArray = response.ecosystems;
        } else if (response && typeof response === "object") {
          // Try to find any array property
          const keys = Object.keys(response);
          for (const key of keys) {
            if (Array.isArray((response as any)[key])) {
              ecosystemsArray = (response as any)[key];
              break;
            }
          }
        }

        // Filter only active ecosystems and map to expected format
        const activeEcosystems = ecosystemsArray
          .filter((eco: any) => eco.status === "active")
          .map((eco: any) => ({ name: eco.name }));

        setEcosystems(activeEcosystems);
      } catch (err) {
        console.error("BrowsePage: Failed to fetch ecosystems:", err);
        // Fallback to empty array on error
        setEcosystems([]);
      }
    };

    fetchEcosystems();
  }, []);

  const toggleFilter = (filterType: string, value: string) => {
    setSelectedFilters((prev) => ({
      ...prev,
      [filterType]: prev[filterType].includes(value)
        ? prev[filterType].filter((v) => v !== value)
        : [...prev[filterType], value],
    }));
  };

  const clearFilter = (filterType: string, value: string) => {
    setSelectedFilters((prev) => ({
      ...prev,
      [filterType]: prev[filterType].filter((v) => v !== value),
    }));
  };

  // Fetch projects from API. This effect only re-runs when selectedFilters
  // (or fetchProjects itself) actually changes, so useOptimisticData's own
  // 30s cache can only ever get in the way here, never usefully prevent a
  // redundant call - without forceRefresh=true, selecting a filter within
  // 30s of the previous fetch (i.e. almost always) silently re-served the
  // stale unfiltered cache instead of ever calling this closure with the
  // new filter params: the chip/button UI shows the filter as selected
  // (selectedFilters itself updates fine) while the grid never narrows,
  // since the actual API call carrying that filter never happened.
  useEffect(() => {
    const loadProjects = async () => {
      await fetchProjects(async () => {
        try {
          const params: {
            language?: string;
            ecosystem?: string;
            category?: string;
            tags?: string;
          } = {};

          // Apply filters
          if (selectedFilters.languages.length > 0) {
            params.language = selectedFilters.languages[0]; // API supports single language
          }
          if (selectedFilters.ecosystems.length > 0) {
            params.ecosystem = selectedFilters.ecosystems[0]; // API supports single ecosystem
          }
          if (selectedFilters.categories.length > 0) {
            params.category = selectedFilters.categories[0]; // API supports single category
          }
          if (selectedFilters.tags.length > 0) {
            params.tags = selectedFilters.tags.join(','); // API supports comma-separated tags
          }

          const response = await getPublicProjects(params);

          console.log('BrowsePage: API response received', { response });

          // Handle response - check if it's valid
          let projectsArray: any[] = [];
          if (response && response.projects && Array.isArray(response.projects)) {
            projectsArray = response.projects;
          } else if (Array.isArray(response)) {
            // Handle case where API returns array directly
            projectsArray = response;
          } else {
            console.warn('BrowsePage: Unexpected response format', response);
            projectsArray = [];
          }

          // Map API response to BrowseProject (Project + org grouping info)
          const mappedProjects: BrowseProject[] = projectsArray
            .filter(isValidProject)
            .map((p) => {
              const repoName = getRepoName(p.github_full_name);
              return {
                // Fallback ID if missing. Derived from github_full_name, which
                // is unique and stable, rather than from Date.now()/Math.random():
                // a fresh id on every render makes this row's React key change
                // every render, remounting it and discarding its state.
                id: p.id || `project-${p.github_full_name}`,
                name: repoName,
                owner: p.github_full_name.split('/')[0] || repoName,
                icon: getProjectIcon(p.github_full_name),
                stars: formatNumber(p.stars_count || 0),
                starsCount: p.stars_count || 0,
                forks: formatNumber(p.forks_count || 0),
                contributors: p.contributors_count || 0,
                openIssues: p.open_issues_count || 0,
                prs: p.open_prs_count || 0,
                description: truncateDescription(p.description) || `${p.language || 'Project'} repository${p.category ? ` - ${p.category}` : ''}`,
                tags: Array.isArray(p.tags) ? p.tags : [],
                color: getProjectColor(repoName),
              };
            });

          console.log('BrowsePage: Mapped projects', { count: mappedProjects.length });
          return mappedProjects;
        } catch (err) {
          console.error('BrowsePage: Failed to fetch projects:', err);
          throw err; // Re-throw to let the hook handle the error
        }
      }, true);
    };

    loadProjects();
    // fetchProjects is deliberately NOT a dependency: useOptimisticData's
    // fetchData is a useCallback closed over its own `data` state, so its
    // identity changes on every successful fetch. Combined with
    // forceRefresh=true above (needed so a real filter change is never
    // silently swallowed by the 30s cache - see the comment above this
    // effect), including it here creates a genuine infinite loop: fetch
    // resolves -> data changes -> fetchProjects gets a new identity ->
    // this effect re-fires because fetchProjects "changed" -> fetches
    // again -> forever. selectedFilters is the only real trigger this
    // effect should react to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFilters]);

  return (
    <div className="space-y-6">
      {/* Active Filters Display */}
      {Object.values(selectedFilters).some((arr) => arr.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(selectedFilters).map(([filterType, values]) =>
            values.map((value) => (
              <span
                key={`${filterType}-${value}`}
                className={`px-3.5 py-2 rounded-full text-[13px] font-semibold border-[1.5px] flex items-center gap-2 transition-all shadow-lg ${
                  isDark
                    ? "bg-[#a17932] border-[#c9983a] text-white"
                    : "bg-[#b8872f] border-[#a17932] text-white"
                }`}
              >
                {value}
                <button
                  onClick={() => clearFilter(filterType, value)}
                  className="hover:text-red-200 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )),
          )}
        </div>
      )}

      {/* Orgs / Repos toggle */}
      <div className={`inline-flex items-center p-1 rounded-[14px] border ${isDark ? "bg-white/[0.06] border-white/15" : "bg-white/[0.2] border-white/30"}`}>
        {(
          [
            { key: "orgs" as const, label: "Organizations", icon: Building2 },
            { key: "repos" as const, label: "Repositories", icon: FolderGit2 },
          ]
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setViewMode(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-[10px] text-[13px] font-semibold transition-all ${
              viewMode === key
                ? isDark
                  ? "bg-[#a17932] text-white shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
                  : "bg-[#b8872f] text-white shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
                : isDark
                  ? "text-[#d4d4d4] hover:text-[#f5f5f5]"
                  : "text-[#6b5d4d] hover:text-[#2d2820]"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Filters: pick a type, then pick values for that type - the value
          list (options prop) swaps based on which type pill is active,
          keeping every selected value across all 4 types active at once
          (shown below in Active Filters). */}
      <div className="flex items-center flex-wrap gap-3">
        <div className={`inline-flex items-center gap-1 p-1 rounded-[12px] border ${isDark ? "bg-white/[0.06] border-white/15" : "bg-white/[0.2] border-white/30"}`}>
          {FILTER_TYPES.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveFilterType(key)}
              className={`px-3 py-1.5 rounded-[9px] text-[13px] font-semibold transition-all ${
                activeFilterType === key
                  ? isDark
                    ? "bg-[#a17932] text-white"
                    : "bg-[#b8872f] text-white"
                  : isDark
                    ? "text-[#d4d4d4] hover:text-[#f5f5f5]"
                    : "text-[#6b5d4d] hover:text-[#2d2820]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <Dropdown
          filterType={activeFilterType}
          options={filterOptions[activeFilterType]}
          selectedValues={selectedFilters[activeFilterType]}
          onToggle={(value) => toggleFilter(activeFilterType, value)}
          searchValue={searchTerms[activeFilterType]}
          onSearchChange={(value) =>
            setSearchTerms((prev) => ({ ...prev, [activeFilterType]: value }))
          }
          isOpen={openDropdown === activeFilterType}
          onToggleOpen={() =>
            setOpenDropdown(openDropdown === activeFilterType ? null : activeFilterType)
          }
          onClose={() => setOpenDropdown(null)}
          renderOption={
            activeFilterType === "languages"
              ? (option, isSelected) => (
                  <div className="flex-1 min-w-0 flex items-center gap-2 text-left">
                    <LanguageIcon language={option.name} className="w-4 h-4 flex-shrink-0" />
                    <div
                      className={`text-[14px] font-semibold truncate ${
                        isSelected
                          ? isDark ? "text-[#f5c563]" : "text-[#8b6f3a]"
                          : isDark ? "text-[#f5f5f5]" : "text-[#2d2820]"
                      }`}
                    >
                      {option.name}
                    </div>
                  </div>
                )
              : undefined
          }
        />
      </div>

      {/* Projects / Organizations Grid */}
      {isLoading ? (
        // The two view modes render very differently shaped cards, so each
        // needs its own placeholder or the grid resizes on load.
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {[...Array(8)].map((_, idx) =>
            viewMode === "repos" ? (
              <ProjectCardSkeleton key={idx} />
            ) : (
              <OrganizationCardSkeleton key={idx} />
            ),
          )}
        </div>
      ) : hasError ? (
        <EmptyState
          icon={AlertCircle}
          title="Couldn't load projects"
          description="Something went wrong while fetching projects. Please try again in a moment."
        />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No projects found"
          description="Try adjusting your filters or check back later."
        />
      ) : viewMode === "repos" ? (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-5"
          variants={cardContainerVariants}
          initial={prefersReducedMotion ? false : "hidden"}
          animate="visible"
        >
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={onProjectClick}
              variants={cardVariants}
            />
          ))}
        </motion.div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-5"
          variants={cardContainerVariants}
          initial={prefersReducedMotion ? false : "hidden"}
          animate="visible"
        >
          {organizations.map((organization) => (
            <OrganizationCard
              key={organization.name}
              organization={organization}
              onClick={onOrgClick}
              variants={cardVariants}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}
