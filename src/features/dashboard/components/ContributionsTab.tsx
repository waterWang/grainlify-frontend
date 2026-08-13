import { useEffect, useState } from "react";
import {
  Filter,
  Clock,
  GitFork,
  Star,
  Search,
  X,
  Circle,
  Check,
  ChevronDown,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import { getMyIssueApplications, type IssueApplicationSummary } from "../../../shared/api/client";
import { SkeletonLoader } from "../../../shared/components/SkeletonLoader";

type ColumnKey = "applied" | "assigned" | "pending_review" | "complete";

function formatTimeAgo(dateString: string | null | undefined): string {
  if (!dateString) return "Unknown";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Unknown";
  return formatDistanceToNow(date, { addSuffix: true });
}

// Applied/Assigned show when that event happened; Pending review/Complete
// show PR activity when there's a matched PR to reflect, falling back to the
// assignment time otherwise (e.g. a maintainer just assigned this and no PR
// exists yet, but a column bug elsewhere put it in the wrong bucket).
function timeFor(item: IssueApplicationSummary, column: ColumnKey): string {
  switch (column) {
    case "applied":
      return formatTimeAgo(item.applied_at);
    case "assigned":
      return formatTimeAgo(item.assigned_at);
    case "pending_review":
      return formatTimeAgo(item.pr_created_at || item.assigned_at);
    case "complete":
      return formatTimeAgo(item.pr_merged_at || item.assigned_at);
  }
}

// A real issue can carry zero, one, or many labels; the card layout only has
// room for one pill, so the first label stands in for "the tag".
function primaryTag(item: IssueApplicationSummary): string | null {
  return item.labels[0] ?? null;
}

function isBugTag(item: IssueApplicationSummary): boolean {
  return item.labels.some((l) => l.toLowerCase() === "bug");
}

// "See application"/"See detail" open the underlying GitHub thread - the PR
// if one has been matched, otherwise the issue itself.
function actionUrl(item: IssueApplicationSummary): string {
  return item.pr_url || item.issue_url;
}

export function ContributionsTab() {
  const { theme } = useTheme();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  // Project-filter value isn't consulted anywhere yet (only ever reset by
  // "Clear Filters") - keep the setter for that reset, drop the unread value.
  const [, setSelectedProject] = useState("");
  const [selectedRewards, setSelectedRewards] = useState<string[]>([
    "Rewarded",
    "Unrewarded",
  ]);
  const [isProjectSectionOpen, setIsProjectSectionOpen] = useState(true);
  const [isRewardedSectionOpen, setIsRewardedSectionOpen] = useState(true);

  const [allItems, setAllItems] = useState<IssueApplicationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getMyIssueApplications()
      .then((res) => {
        if (!cancelled) setAllItems(res.issue_applications);
      })
      .catch((error) => {
        console.error("Failed to load issue applications:", error);
        if (!cancelled) toast.error("Failed to load your contributions.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const applied = allItems.filter((i) => i.status === "applied");
  const assigned = allItems.filter((i) => i.status === "assigned");
  const pendingReview = allItems.filter((i) => i.status === "pending_review");
  const complete = allItems.filter((i) => i.status === "complete");

  return (
    <>
      <div className="space-y-4">
        {/* Filter and Search Bar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Filter Button */}
          <button
            onClick={() => setIsFilterOpen(true)}
            className={`h-10 sm:h-12 flex-shrink-0 w-10 sm:w-12 flex items-center justify-center rounded-[12px] bg-white/[0.15] border border-white/25 hover:bg-white/[0.2] hover:border-[#c9983a]/40 transition-all ${
              theme === "dark" ? "text-[#b8a898]" : "text-[#7a6b5a]"
            }`}
          >
            <Filter className="w-5 h-5" />
          </button>

          {/* Search Bar */}
          <div className="relative flex-1">
            <Search
              className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 z-10 transition-colors ${
                theme === "dark" ? "text-[#b8a898]" : "text-[#7a6b5a]"
              }`}
            />
            <input
              type="text"
              placeholder="Search"
              className={`w-full pl-12 pr-4 py-2.5 sm:py-3 rounded-[12px] bg-white/[0.15] border border-white/25 focus:outline-none focus:bg-white/[0.2] focus:border-[#c9983a]/40 transition-all text-[13px] ${
                theme === "dark"
                  ? "text-[#f5efe5] placeholder-[#b8a898]"
                  : "text-[#2d2820] placeholder-[#7a6b5a]"
              }`}
            />
          </div>
        </div>

        {/* Desktop Kanban Board - Hidden on Mobile */}
        <div className="hidden md:block overflow-x-auto scrollbar-hide">
          <div className="flex gap-5 min-w-max pb-4">
            {/* Applied Column */}
            <div className="w-[320px] flex-shrink-0">
              <div
                className={`rounded-[16px] border p-5 transition-colors ${
                  theme === "dark"
                    ? "bg-white/[0.08] border-white/10"
                    : "bg-white/[0.15] border-white/25"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3
                    className={`text-[16px] font-bold transition-colors ${
                      theme === "dark" ? "text-[#f5f5f5]" : "text-[#2d2820]"
                    }`}
                  >
                    Applied{" "}
                    <span
                      className={
                        theme === "dark" ? "text-[#d4d4d4]" : "text-[#7a6b5a]"
                      }
                    >
                      {applied.length}
                    </span>
                  </h3>
                </div>
                {isLoading ? (
                  <DesktopColumnSkeleton isDark={theme === "dark"} />
                ) : applied.length === 0 ? (
                  <EmptyColumnMessage isDark={theme === "dark"} />
                ) : (
                  <div className="space-y-3">
                    {applied.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-[12px] border p-4 transition-all ${
                          theme === "dark"
                            ? "bg-white/[0.08] border-white/15 hover:border-white/25"
                            : "bg-white/[0.2] border-white/30 hover:border-white/40"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h4
                            className={`text-[14px] font-semibold flex-1 pr-2 transition-colors ${
                              theme === "dark"
                                ? "text-[#f5f5f5]"
                                : "text-[#2d2820]"
                            }`}
                          >
                            {item.issue_title}
                          </h4>
                          <span className="px-2 py-0.5 bg-green-500/20 border border-green-600/30 rounded-[6px] text-[10px] font-semibold text-green-800">
                            #{item.issue_number}
                          </span>
                        </div>
                        <div
                          className={`flex items-center space-x-2 mb-3 text-[12px] transition-colors ${
                            theme === "dark" ? "text-[#d4d4d4]" : "text-[#7a6b5a]"
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>{timeFor(item, "applied")}</span>
                        </div>
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
                          <span
                            className={`text-[12px] transition-colors ${
                              theme === "dark"
                                ? "text-[#d4d4d4]"
                                : "text-[#7a6b5a]"
                            }`}
                          >
                            {item.project_name}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <TagPill label={primaryTag(item)} isBug={false} isDark={theme === "dark"} />
                          <a
                            href={actionUrl(item)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[12px] text-[#c9983a] hover:text-[#a67c2e] font-medium flex items-center space-x-1"
                          >
                            <span>See application</span>
                            <GitFork className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Assigned Issue Column */}
            <div className="w-[320px] flex-shrink-0">
              <div
                className={`rounded-[16px] border p-5 transition-colors ${
                  theme === "dark"
                    ? "bg-white/[0.08] border-white/10"
                    : "bg-white/[0.15] border-white/25"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3
                    className={`text-[16px] font-bold transition-colors ${
                      theme === "dark" ? "text-[#f5f5f5]" : "text-[#2d2820]"
                    }`}
                  >
                    Assigned issue{" "}
                    <span
                      className={
                        theme === "dark" ? "text-[#d4d4d4]" : "text-[#7a6b5a]"
                      }
                    >
                      {assigned.length}
                    </span>
                  </h3>
                </div>
                {isLoading ? (
                  <DesktopColumnSkeleton isDark={theme === "dark"} />
                ) : assigned.length === 0 ? (
                  <EmptyColumnMessage isDark={theme === "dark"} />
                ) : (
                  <div className="space-y-3">
                    {assigned.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-[12px] border p-4 transition-all ${
                          theme === "dark"
                            ? "bg-white/[0.08] border-white/15 hover:border-white/25"
                            : "bg-white/[0.2] border-white/30 hover:border-white/40"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h4
                            className={`text-[14px] font-semibold flex-1 pr-2 transition-colors ${
                              theme === "dark"
                                ? "text-[#f5f5f5]"
                                : "text-[#2d2820]"
                            }`}
                          >
                            {item.issue_title}
                          </h4>
                          <span className="px-2 py-0.5 bg-green-500/20 border border-green-600/30 rounded-[6px] text-[10px] font-semibold text-green-800">
                            #{item.issue_number}
                          </span>
                        </div>
                        <div
                          className={`flex items-center space-x-2 mb-3 text-[12px] transition-colors ${
                            theme === "dark" ? "text-[#d4d4d4]" : "text-[#7a6b5a]"
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>{timeFor(item, "assigned")}</span>
                        </div>
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500" />
                          <span
                            className={`text-[12px] transition-colors ${
                              theme === "dark"
                                ? "text-[#d4d4d4]"
                                : "text-[#7a6b5a]"
                            }`}
                          >
                            {item.project_name}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <TagPill label={primaryTag(item)} isBug={false} isDark={theme === "dark"} />
                          <a
                            href={actionUrl(item)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[12px] text-[#c9983a] hover:text-[#a67c2e] font-medium flex items-center space-x-1"
                          >
                            <span>See application</span>
                            <GitFork className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Pending Review Column */}
            <div className="w-[320px] flex-shrink-0">
              <div
                className={`rounded-[16px] border p-5 transition-colors ${
                  theme === "dark"
                    ? "bg-white/[0.08] border-white/10"
                    : "bg-white/[0.15] border-white/25"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3
                    className={`text-[16px] font-bold transition-colors ${
                      theme === "dark" ? "text-[#f5f5f5]" : "text-[#2d2820]"
                    }`}
                  >
                    Pending review{" "}
                    <span
                      className={
                        theme === "dark" ? "text-[#d4d4d4]" : "text-[#7a6b5a]"
                      }
                    >
                      {pendingReview.length}
                    </span>
                  </h3>
                </div>
                {isLoading ? (
                  <DesktopColumnSkeleton isDark={theme === "dark"} />
                ) : pendingReview.length === 0 ? (
                  <EmptyColumnMessage isDark={theme === "dark"} />
                ) : (
                  <div className="space-y-3">
                    {pendingReview.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-[12px] border p-4 transition-all ${
                          theme === "dark"
                            ? "bg-white/[0.08] border-white/15 hover:border-white/25"
                            : "bg-white/[0.2] border-white/30 hover:border-white/40"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h4
                            className={`text-[14px] font-semibold flex-1 pr-2 transition-colors ${
                              theme === "dark"
                                ? "text-[#f5f5f5]"
                                : "text-[#2d2820]"
                            }`}
                          >
                            {item.issue_title}
                          </h4>
                          <span className="px-2 py-0.5 bg-purple-500/20 border border-purple-600/30 rounded-[6px] text-[10px] font-semibold text-purple-800">
                            #{item.issue_number}
                          </span>
                        </div>
                        <div
                          className={`flex items-center space-x-2 mb-3 text-[12px] transition-colors ${
                            theme === "dark" ? "text-[#d4d4d4]" : "text-[#7a6b5a]"
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>{timeFor(item, "pending_review")}</span>
                        </div>
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-green-500 to-emerald-500" />
                          <span
                            className={`text-[12px] transition-colors ${
                              theme === "dark"
                                ? "text-[#d4d4d4]"
                                : "text-[#7a6b5a]"
                            }`}
                          >
                            {item.project_name}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <TagPill label={primaryTag(item)} isBug={false} isDark={theme === "dark"} />
                          <a
                            href={actionUrl(item)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[12px] text-[#c9983a] hover:text-[#a67c2e] font-medium flex items-center space-x-1"
                          >
                            <span>See detail</span>
                            <Star className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Complete Column */}
            <div className="w-[320px] flex-shrink-0">
              <div
                className={`rounded-[16px] border p-5 transition-colors ${
                  theme === "dark"
                    ? "bg-white/[0.08] border-white/10"
                    : "bg-white/[0.15] border-white/25"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3
                    className={`text-[16px] font-bold transition-colors ${
                      theme === "dark" ? "text-[#f5f5f5]" : "text-[#2d2820]"
                    }`}
                  >
                    Complete{" "}
                    <span
                      className={
                        theme === "dark" ? "text-[#d4d4d4]" : "text-[#7a6b5a]"
                      }
                    >
                      {complete.length}
                    </span>
                  </h3>
                </div>
                {isLoading ? (
                  <DesktopColumnSkeleton isDark={theme === "dark"} />
                ) : complete.length === 0 ? (
                  <EmptyColumnMessage isDark={theme === "dark"} />
                ) : (
                  <div className="space-y-3">
                    {complete.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-[12px] border p-4 transition-all ${
                          theme === "dark"
                            ? "bg-white/[0.08] border-white/15 hover:border-white/25"
                            : "bg-white/[0.2] border-white/30 hover:border-white/40"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h4
                            className={`text-[14px] font-semibold flex-1 pr-2 transition-colors ${
                              theme === "dark"
                                ? "text-[#f5f5f5]"
                                : "text-[#2d2820]"
                            }`}
                          >
                            {item.issue_title}
                          </h4>
                        </div>
                        <div
                          className={`flex items-center space-x-2 mb-3 text-[12px] transition-colors ${
                            theme === "dark" ? "text-[#d4d4d4]" : "text-[#7a6b5a]"
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>{timeFor(item, "complete")}</span>
                        </div>
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-orange-500 to-red-500" />
                          <span
                            className={`text-[12px] transition-colors ${
                              theme === "dark"
                                ? "text-[#d4d4d4]"
                                : "text-[#7a6b5a]"
                            }`}
                          >
                            {item.project_name}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <TagPill label={primaryTag(item)} isBug={isBugTag(item)} isDark={theme === "dark"} />
                          <a
                            href={actionUrl(item)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[12px] text-[#c9983a] hover:text-[#a67c2e] font-medium flex items-center space-x-1"
                          >
                            <span>See detail</span>
                            <Star className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Vertical Layout - Hidden on Desktop */}
        <div className="md:hidden space-y-4">
          {/* Applied Section */}
          <div
            className={`rounded-[16px] border p-4 transition-colors ${
              theme === "dark"
                ? "bg-white/[0.08] border-white/10"
                : "bg-white/[0.15] border-white/25"
            }`}
          >
            <h3
              className={`text-[15px] font-bold mb-3 transition-colors ${
                theme === "dark" ? "text-[#f5f5f5]" : "text-[#2d2820]"
              }`}
            >
              Applied{" "}
              <span
                className={
                  theme === "dark" ? "text-[#d4d4d4]" : "text-[#7a6b5a]"
                }
              >
                ({applied.length})
              </span>
            </h3>
            {isLoading ? (
              <MobileSectionSkeleton isDark={theme === "dark"} />
            ) : applied.length === 0 ? (
              <EmptyColumnMessage isDark={theme === "dark"} />
            ) : (
              <div className="space-y-2">
                {applied.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-[10px] border p-3 transition-all ${
                      theme === "dark"
                        ? "bg-white/[0.08] border-white/15 hover:border-white/25"
                        : "bg-white/[0.2] border-white/30 hover:border-white/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4
                        className={`text-[13px] font-semibold flex-1 transition-colors ${
                          theme === "dark" ? "text-[#f5f5f5]" : "text-[#2d2820]"
                        }`}
                      >
                        {item.issue_title}
                      </h4>
                      <span className="px-1.5 py-0.5 bg-green-500/20 border border-green-600/30 rounded-[4px] text-[9px] font-semibold text-green-800 flex-shrink-0">
                        #{item.issue_number}
                      </span>
                    </div>
                    <div
                      className={`flex items-center space-x-1.5 mb-2 text-[11px] transition-colors ${
                        theme === "dark" ? "text-[#d4d4d4]" : "text-[#7a6b5a]"
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      <span>{timeFor(item, "applied")}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <TagPill label={primaryTag(item)} isBug={false} isDark={theme === "dark"} compact />
                    </div>
                    <a
                      href={actionUrl(item)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-center text-[11px] text-[#c9983a] hover:text-[#a67c2e] font-medium w-full py-1.5"
                    >
                      See application
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assigned Issue Section */}
          <div
            className={`rounded-[16px] border p-4 transition-colors ${
              theme === "dark"
                ? "bg-white/[0.08] border-white/10"
                : "bg-white/[0.15] border-white/25"
            }`}
          >
            <h3
              className={`text-[15px] font-bold mb-3 transition-colors ${
                theme === "dark" ? "text-[#f5f5f5]" : "text-[#2d2820]"
              }`}
            >
              Assigned issue{" "}
              <span
                className={
                  theme === "dark" ? "text-[#d4d4d4]" : "text-[#7a6b5a]"
                }
              >
                ({assigned.length})
              </span>
            </h3>
            {isLoading ? (
              <MobileSectionSkeleton isDark={theme === "dark"} />
            ) : assigned.length === 0 ? (
              <EmptyColumnMessage isDark={theme === "dark"} />
            ) : (
              <div className="space-y-2">
                {assigned.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-[10px] border p-3 transition-all ${
                      theme === "dark"
                        ? "bg-white/[0.08] border-white/15 hover:border-white/25"
                        : "bg-white/[0.2] border-white/30 hover:border-white/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4
                        className={`text-[13px] font-semibold flex-1 transition-colors ${
                          theme === "dark" ? "text-[#f5f5f5]" : "text-[#2d2820]"
                        }`}
                      >
                        {item.issue_title}
                      </h4>
                      <span className="px-1.5 py-0.5 bg-green-500/20 border border-green-600/30 rounded-[4px] text-[9px] font-semibold text-green-800 flex-shrink-0">
                        #{item.issue_number}
                      </span>
                    </div>
                    <div
                      className={`flex items-center space-x-1.5 mb-2 text-[11px] transition-colors ${
                        theme === "dark" ? "text-[#d4d4d4]" : "text-[#7a6b5a]"
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      <span>{timeFor(item, "assigned")}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <TagPill label={primaryTag(item)} isBug={false} isDark={theme === "dark"} compact />
                    </div>
                    <a
                      href={actionUrl(item)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-center text-[11px] text-[#c9983a] hover:text-[#a67c2e] font-medium w-full py-1.5"
                    >
                      See application
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Review Section */}
          <div
            className={`rounded-[16px] border p-4 transition-colors ${
              theme === "dark"
                ? "bg-white/[0.08] border-white/10"
                : "bg-white/[0.15] border-white/25"
            }`}
          >
            <h3
              className={`text-[15px] font-bold mb-3 transition-colors ${
                theme === "dark" ? "text-[#f5f5f5]" : "text-[#2d2820]"
              }`}
            >
              Pending review{" "}
              <span
                className={
                  theme === "dark" ? "text-[#d4d4d4]" : "text-[#7a6b5a]"
                }
              >
                ({pendingReview.length})
              </span>
            </h3>
            {isLoading ? (
              <MobileSectionSkeleton isDark={theme === "dark"} />
            ) : pendingReview.length === 0 ? (
              <EmptyColumnMessage isDark={theme === "dark"} />
            ) : (
              <div className="space-y-2">
                {pendingReview.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-[10px] border p-3 transition-all ${
                      theme === "dark"
                        ? "bg-white/[0.08] border-white/15 hover:border-white/25"
                        : "bg-white/[0.2] border-white/30 hover:border-white/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4
                        className={`text-[13px] font-semibold flex-1 transition-colors ${
                          theme === "dark" ? "text-[#f5f5f5]" : "text-[#2d2820]"
                        }`}
                      >
                        {item.issue_title}
                      </h4>
                      <span className="px-1.5 py-0.5 bg-purple-500/20 border border-purple-600/30 rounded-[4px] text-[9px] font-semibold text-purple-800 flex-shrink-0">
                        #{item.issue_number}
                      </span>
                    </div>
                    <div
                      className={`flex items-center space-x-1.5 mb-2 text-[11px] transition-colors ${
                        theme === "dark" ? "text-[#d4d4d4]" : "text-[#7a6b5a]"
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      <span>{timeFor(item, "pending_review")}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <TagPill label={primaryTag(item)} isBug={false} isDark={theme === "dark"} compact />
                    </div>
                    <a
                      href={actionUrl(item)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-center text-[11px] text-[#c9983a] hover:text-[#a67c2e] font-medium w-full py-1.5"
                    >
                      See detail
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Complete Section */}
          <div
            className={`rounded-[16px] border p-4 transition-colors ${
              theme === "dark"
                ? "bg-white/[0.08] border-white/10"
                : "bg-white/[0.15] border-white/25"
            }`}
          >
            <h3
              className={`text-[15px] font-bold mb-3 transition-colors ${
                theme === "dark" ? "text-[#f5f5f5]" : "text-[#2d2820]"
              }`}
            >
              Complete{" "}
              <span
                className={
                  theme === "dark" ? "text-[#d4d4d4]" : "text-[#7a6b5a]"
                }
              >
                ({complete.length})
              </span>
            </h3>
            {isLoading ? (
              <MobileSectionSkeleton isDark={theme === "dark"} />
            ) : complete.length === 0 ? (
              <EmptyColumnMessage isDark={theme === "dark"} />
            ) : (
              <div className="space-y-2">
                {complete.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-[10px] border p-3 transition-all ${
                      theme === "dark"
                        ? "bg-white/[0.08] border-white/15 hover:border-white/25"
                        : "bg-white/[0.2] border-white/30 hover:border-white/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4
                        className={`text-[13px] font-semibold flex-1 transition-colors ${
                          theme === "dark" ? "text-[#f5f5f5]" : "text-[#2d2820]"
                        }`}
                      >
                        {item.issue_title}
                      </h4>
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    </div>
                    <div
                      className={`flex items-center space-x-1.5 mb-2 text-[11px] transition-colors ${
                        theme === "dark" ? "text-[#d4d4d4]" : "text-[#7a6b5a]"
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      <span>{timeFor(item, "complete")}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <TagPill label={primaryTag(item)} isBug={isBugTag(item)} isDark={theme === "dark"} compact />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter Modal */}
      {isFilterOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[50] transition-opacity"
            onClick={() => setIsFilterOpen(false)}
          />

          {/* Filter Panel */}
          <div
            className={`fixed top-0 right-0 h-full w-[400px] border-l z-[60] shadow-[0_0_40px_rgba(0,0,0,0.15)] p-6 flex flex-col animate-slide-in-right transition-colors ${
              theme === "dark"
                ? "bg-[#2d2820]/95 border-white/10 text-[#f5efe5]"
                : "bg-[#e5ddd1]/95 border-white/30 text-[#2d2820]"
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2
                className={`text-[18px] font-bold ${
                  theme === "dark" ? "text-[#f5efe5]" : "text-[#2d2820]"
                }`}
              >
                Filter contributions
              </h2>
              <button
                onClick={() => setIsFilterOpen(false)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                  theme === "dark"
                    ? "hover:bg-white/[0.1]"
                    : "hover:bg-white/[0.3]"
                }`}
              >
                <X
                  className={`w-6 h-6 stroke-[2.5] ${
                    theme === "dark" ? "text-[#f5efe5]" : "text-[#2d2820]"
                  }`}
                />
              </button>
            </div>

            {/* Filter Content */}
            <div className="flex-1 space-y-5 overflow-y-auto scrollbar-hide">
              {/* Projects Section */}
              <div>
                <button
                  onClick={() => setIsProjectSectionOpen(!isProjectSectionOpen)}
                  className="w-full flex items-center justify-between mb-3"
                >
                  <div className="flex items-center gap-3">
                    <Circle
                      className={`w-5 h-5 ${theme === "dark" ? "text-[#b8a898]" : "text-[#7a6b5a]"}`}
                    />
                    <span
                      className={`text-[14px] font-semibold ${theme === "dark" ? "text-[#f5efe5]" : "text-[#2d2820]"}`}
                    >
                      Projects
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${isProjectSectionOpen ? "rotate-180" : ""} ${
                      theme === "dark" ? "text-[#f5efe5]" : "text-[#2d2820]"
                    }`}
                  />
                </button>

                {isProjectSectionOpen && (
                  <div className="space-y-3">
                    {/* Search Field */}
                    <div className="relative">
                      <Search
                        className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                          theme === "dark" ? "text-[#b8a898]" : "text-[#2d2820]"
                        }`}
                      />
                      <input
                        type="text"
                        placeholder="Search"
                        className={`w-full pl-10 pr-4 py-3 rounded-[12px] border transition-all text-[13px] focus:outline-none focus:border-[#c9983a]/40 ${
                          theme === "dark"
                            ? "bg-white/[0.05] border-white/10 text-[#f5efe5] placeholder-[#b8a898] focus:bg-white/[0.1]"
                            : "bg-white/[0.15] border-white/25 text-[#2d2820] placeholder-[#7a6b5a] focus:bg-white/[0.2]"
                        }`}
                      />
                    </div>

                    {/* Results Section */}
                    <div
                      className={`rounded-[12px] border p-4 ${
                        theme === "dark"
                          ? "bg-white/[0.05] border-white/10"
                          : "bg-white/[0.1] border-white/20"
                      }`}
                    >
                      <p
                        className={`text-[12px] text-center ${theme === "dark" ? "text-[#b8a898]" : "text-[#7a6b5a]"}`}
                      >
                        No items found
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Rewarded Section */}
              <div>
                <button
                  onClick={() =>
                    setIsRewardedSectionOpen(!isRewardedSectionOpen)
                  }
                  className="w-full flex items-center justify-between mb-3"
                >
                  <div className="flex items-center gap-3">
                    <Circle
                      className={`w-5 h-5 ${theme === "dark" ? "text-[#b8a898]" : "text-[#7a6b5a]"}`}
                    />
                    <span
                      className={`text-[14px] font-semibold ${theme === "dark" ? "text-[#f5efe5]" : "text-[#2d2820]"}`}
                    >
                      Rewarded
                    </span>
                    <span className="px-2 py-0.5 bg-[#c9983a] text-white text-[11px] font-semibold rounded-full">
                      {selectedRewards.length}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${isRewardedSectionOpen ? "rotate-180" : ""} ${
                      theme === "dark" ? "text-[#f5efe5]" : "text-[#2d2820]"
                    }`}
                  />
                </button>

                {isRewardedSectionOpen && (
                  <div className="space-y-2">
                    {/* Main Dropdown showing current selection */}
                    <div
                      className={`px-4 py-3 rounded-[12px] border ${
                        theme === "dark"
                          ? "bg-white/[0.05] border-white/10"
                          : "bg-white/[0.15] border-white/25"
                      }`}
                    >
                      <span
                        className={`text-[13px] ${theme === "dark" ? "text-[#f5efe5]" : "text-[#2d2820]"}`}
                      >
                        {selectedRewards.join(", ")}
                      </span>
                    </div>

                    {/* Options List */}
                    <div className="space-y-1">
                      {["Rewarded", "Unrewarded"].map((reward) => (
                        <button
                          key={reward}
                          onClick={() => {
                            if (selectedRewards.includes(reward)) {
                              setSelectedRewards(
                                selectedRewards.filter((r) => r !== reward),
                              );
                            } else {
                              setSelectedRewards([...selectedRewards, reward]);
                            }
                          }}
                          className={`w-full px-4 py-3 rounded-[12px] text-left text-[13px] font-medium transition-all flex items-center justify-between ${
                            selectedRewards.includes(reward)
                              ? "bg-[#c9983a] text-white shadow-[0_4px_12px_rgba(201,152,58,0.3)]"
                              : theme === "dark"
                                ? "bg-white/[0.05] border border-white/10 text-[#f5efe5] hover:bg-white/[0.1]"
                                : "bg-white/[0.1] border border-white/20 text-[#2d2820] hover:bg-white/[0.15]"
                          }`}
                        >
                          <span>{reward}</span>
                          {selectedRewards.includes(reward) && (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div
              className={`flex items-center gap-3 mt-6 pt-6 border-t ${
                theme === "dark" ? "border-white/10" : "border-white/20"
              }`}
            >
              <button
                onClick={() => {
                  setSelectedProject("");
                  setSelectedRewards(["Rewarded", "Unrewarded"]);
                }}
                className={`flex-1 px-4 py-3 rounded-[12px] border text-[13px] font-semibold transition-all ${
                  theme === "dark"
                    ? "bg-white/[0.05] border-white/10 text-[#b8a898] hover:bg-white/[0.1]"
                    : "bg-white/[0.15] border-white/25 text-[#6b5d4d] hover:bg-white/[0.2]"
                }`}
              >
                Reset
              </button>
              <button
                onClick={() => setIsFilterOpen(false)}
                className="flex-1 px-4 py-3 rounded-[12px] bg-[#c9983a] text-white text-[13px] font-semibold shadow-[0_4px_12px_rgba(201,152,58,0.3)] hover:shadow-[0_6px_16px_rgba(201,152,58,0.4)] transition-all"
              >
                Save
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function TagPill({
  label,
  isBug,
  isDark,
  compact,
}: {
  label: string | null;
  isBug: boolean;
  isDark: boolean;
  compact?: boolean;
}) {
  if (!label) return <span />;
  return (
    <span
      className={`${compact ? "px-1.5 py-0.5 rounded-[4px] text-[10px]" : "px-2 py-1 rounded-[6px] text-[11px]"} font-medium transition-colors ${
        isBug
          ? "bg-red-500/15 border border-red-600/25 text-red-800"
          : isDark
            ? "bg-[#c9983a]/20 border border-[#c9983a]/30 text-[#f5c563]"
            : "bg-[#c9983a]/15 border border-[#c9983a]/25 text-[#8b6f3a]"
      }`}
    >
      {label}
    </span>
  );
}

function EmptyColumnMessage({ isDark }: { isDark: boolean }) {
  return (
    <p className={`text-[12px] text-center py-6 ${isDark ? "text-[#8a7c6c]" : "text-[#9a8d7c]"}`}>
      No applications yet
    </p>
  );
}

function DesktopColumnSkeleton({ isDark }: { isDark: boolean }) {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`rounded-[12px] border p-4 ${isDark ? "bg-white/[0.08] border-white/15" : "bg-white/[0.2] border-white/30"}`}
        >
          <SkeletonLoader variant="text" height="14px" className="mb-3" />
          <SkeletonLoader variant="text" height="12px" width="60%" className="mb-3" />
          <SkeletonLoader variant="text" height="12px" width="40%" />
        </div>
      ))}
    </div>
  );
}

function MobileSectionSkeleton({ isDark }: { isDark: boolean }) {
  return (
    <div className="space-y-2">
      {[0, 1].map((i) => (
        <div
          key={i}
          className={`rounded-[10px] border p-3 ${isDark ? "bg-white/[0.08] border-white/15" : "bg-white/[0.2] border-white/30"}`}
        >
          <SkeletonLoader variant="text" height="13px" className="mb-2" />
          <SkeletonLoader variant="text" height="11px" width="50%" />
        </div>
      ))}
    </div>
  );
}
