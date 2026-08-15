import { useState } from "react";
import { ContributionsTab } from "../components/ContributionsTab";
import { ProjectsTab } from "../components/ProjectsTab";
import { RewardsTab } from "../components/RewardsTab";
import { useTheme } from "../../../shared/contexts/ThemeContext";

export function ContributorsPage() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<
    "contributions" | "projects" | "rewards"
  >("contributions");

  return (
    <div className="space-y-4 md:space-y-6 px-0 md:px-0">
      {/* Tabs */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="inline-flex items-center bg-white/[0.12] rounded-[16px] border border-white/25 p-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.06)] w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab("contributions")}
            className={`px-4 md:px-6 py-2.5 rounded-[12px] font-semibold text-[13px] md:text-[14px] transition-all whitespace-nowrap flex-1 md:flex-none ${
              activeTab === "contributions"
                ? "bg-[#c9983a] text-white shadow-[0_4px_12px_rgba(201,152,58,0.4)]"
                : theme === "dark"
                  ? "bg-transparent text-[#b8a898] hover:text-[#d4c5b0]"
                  : "bg-transparent text-[#7a6b5a] hover:text-[#2d2820]"
            }`}
          >
            Contributions
          </button>
          <button
            onClick={() => setActiveTab("projects")}
            className={`px-4 md:px-6 py-2.5 rounded-[12px] font-semibold text-[13px] md:text-[14px] transition-all whitespace-nowrap flex-1 md:flex-none ${
              activeTab === "projects"
                ? "bg-[#c9983a] text-white shadow-[0_4px_12px_rgba(201,152,58,0.4)]"
                : theme === "dark"
                  ? "bg-transparent text-[#b8a898] hover:text-[#d4c5b0]"
                  : "bg-transparent text-[#7a6b5a] hover:text-[#2d2820]"
            }`}
          >
            Projects
          </button>
          <button
            onClick={() => setActiveTab("rewards")}
            className={`px-4 md:px-6 py-2.5 rounded-[12px] font-semibold text-[13px] md:text-[14px] transition-all whitespace-nowrap flex-1 md:flex-none ${
              activeTab === "rewards"
                ? "bg-[#c9983a] text-white shadow-[0_4px_12px_rgba(201,152,58,0.4)]"
                : theme === "dark"
                  ? "bg-transparent text-[#b8a898] hover:text-[#d4c5b0]"
                  : "bg-transparent text-[#7a6b5a] hover:text-[#2d2820]"
            }`}
          >
            Rewards
          </button>
        </div>

        {/* "See transactions" and "Request payment" used to sit here on the
            Rewards tab. Neither had an onClick - they were styled buttons that
            did nothing, advertising a payout flow that does not exist. A
            primary-styled "Request payment" is a promise; removed until there
            is something to request. */}
      </div>

      {/* Tab Content */}
      <div className="px-4 md:px-0">
        {activeTab === "contributions" && <ContributionsTab />}
        {activeTab === "projects" && <ProjectsTab />}
        {activeTab === "rewards" && <RewardsTab />}
      </div>
    </div>
  );
}
