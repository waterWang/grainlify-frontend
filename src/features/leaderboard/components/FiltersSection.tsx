import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import { getEcosystems } from "../../../shared/api/client";
import { FilterType, LeaderboardWindow } from "../types";

interface FiltersSectionProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  selectedEcosystem: EcosystemOption;
  onEcosystemChange: (ecosystem: EcosystemOption) => void;
  showDropdown: boolean;
  onToggleDropdown: () => void;
  isLoaded: boolean;
  activeWindow: LeaderboardWindow;
  onWindowChange: (w: LeaderboardWindow) => void;
}

interface EcosystemOption {
  label: string;
  value: string;
}

interface FilterOption {
  label: string;
  value: FilterType;
}

export function FiltersSection({
  activeFilter,
  onFilterChange,
  selectedEcosystem,
  onEcosystemChange,
  showDropdown,
  onToggleDropdown,
  isLoaded,
  activeWindow,
  onWindowChange,
}: FiltersSectionProps) {
  const { theme } = useTheme();

  const [ecosystemOptions, setEcosystemOptions] = useState<EcosystemOption[]>([
    { label: "All Ecosystems", value: "all" },
  ]);
  const [loading, setLoading] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // "Total Rewards" used to sit between these two. No branch in either table
  // handled it and no response field backed it, so choosing it re-fetched an
  // identical page and changed nothing on screen.
  const filterOptions: FilterOption[] = [
    { label: "Overall Leaderboard", value: "overall" },
    { label: "Total Contributions", value: "contributions" },
  ];

  // Get the label for the currently active filter
  const getActiveFilterLabel = () => {
    const activeOption = filterOptions.find(
      (option) => option.value === activeFilter
    );
    return activeOption?.label || "Overall Leaderboard";
  };

  useEffect(() => {
    const fetchEcosystems = async () => {
      try {
        setLoading(true);
        const data = await getEcosystems();

        const activeEcosystems = data.ecosystems
          .filter((e) => e.status === "active")
          .map((e) => ({
            label: e.name,
            value: e.slug,
          }));

        setEcosystemOptions([
          { label: "All Ecosystems", value: "all" },
          ...activeEcosystems,
        ]);
      } catch (err) {
        console.error("Failed to fetch ecosystems:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEcosystems();
  }, []);

  return (
    <div
      className={`bg-white/[0.12] rounded-[20px] border border-white/20 shadow-[0_4px_16px_rgba(0,0,0,0.06)] p-5 transition-opacity duration-150 relative z-50 ${
        isLoaded ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="flex items-center justify-end flex-wrap gap-4">
        {/* Window toggle: which period the board covers. Season is the
            default and is listed first; all-time is the secondary view. */}
        <div
          role="group"
          aria-label="Leaderboard period"
          className={`flex items-center p-1 rounded-[12px] border mr-auto ${
            theme === "dark"
              ? "bg-white/[0.08] border-white/15"
              : "bg-white/[0.15] border-white/25"
          }`}
        >
          {(
            [
              { value: "season", label: "This season", hint: "Merged in the last 90 days" },
              { value: "all", label: "All time", hint: "Every merge on record" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              title={opt.hint}
              aria-pressed={activeWindow === opt.value}
              onClick={() => onWindowChange(opt.value)}
              className={`px-3.5 py-1.5 rounded-[9px] text-[12.5px] font-semibold transition-all duration-300 ${
                activeWindow === opt.value
                  ? "bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white shadow-md"
                  : theme === "dark"
                    ? "text-[#d4d4d4] hover:bg-white/[0.08]"
                    : "text-[#7a6b5a] hover:bg-white/[0.12]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Filter Dropdown Button */}
        <div className="relative z-[100]">
          <button
            onClick={() => {
              setShowFilterDropdown(!showFilterDropdown);
              // Close ecosystem dropdown if it's open
              if (showDropdown) {
                onToggleDropdown();
              }
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] border transition-all duration-300 ${
              theme === "dark"
                ? "bg-white/[0.08] border-white/15 hover:bg-white/[0.12]"
                : "bg-white/[0.15] border-white/25 hover:bg-white/[0.2]"
            }`}
          >
            <span
              className={`text-[13px] font-semibold transition-colors ${
                theme === "dark" ? "text-[#f5f5f5]" : "text-[#2d2820]"
              }`}
            >
              {getActiveFilterLabel()}
            </span>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-300 ${
                showFilterDropdown ? "rotate-180" : ""
              } ${theme === "dark" ? "text-[#d4d4d4]" : "text-[#7a6b5a]"}`}
            />
          </button>
          {showFilterDropdown && (
            <div className={`absolute right-0 mt-2 w-[220px] border-2 border-[#c9983a]/30 rounded-[12px] shadow-[0_8px_32px_rgba(0,0,0,0.15)] overflow-hidden z-[100] animate-dropdown-in ${
              theme === "dark" ? "bg-[#2d2820]/95" : "bg-[#d4c5b0]/95"
            }`}>
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onFilterChange(option.value);
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full px-4 py-3 text-left text-[13px] font-medium transition-all ${
                    activeFilter === option.value
                      ? `${theme === "dark" ? "bg-white/[0.08]" : "bg-white/[0.1]"} font-bold ${theme === "dark" ? "hover:bg-white/[0.12]" : "hover:bg-white/[0.15]"}`
                      : `${theme === "dark" ? "hover:bg-white/[0.08]" : "hover:bg-white/[0.1]"}`
                  } ${theme === "dark" ? "text-[#f5f5f5]" : "text-[#2d2820]"}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Ecosystem Dropdown Button */}
        <div className="relative z-[100]">
          <button
            onClick={() => {
              onToggleDropdown();
              // Close filter dropdown if it's open
              if (showFilterDropdown) {
                setShowFilterDropdown(false);
              }
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] border transition-all duration-300 ${
              theme === "dark"
                ? "bg-white/[0.08] border-white/15 hover:bg-white/[0.12]"
                : "bg-white/[0.15] border-white/25 hover:bg-white/[0.2]"
            }`}
          >
            <span
              className={`text-[13px] font-semibold transition-colors ${
                theme === "dark" ? "text-[#f5f5f5]" : "text-[#2d2820]"
              }`}
            >
              {selectedEcosystem.label}
            </span>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-300 ${
                showDropdown ? "rotate-180" : ""
              } ${theme === "dark" ? "text-[#d4d4d4]" : "text-[#7a6b5a]"}`}
            />
          </button>
          {showDropdown && (
            <div className={`absolute right-0 mt-2 w-[200px] border-2 border-[#c9983a]/30 rounded-[12px] shadow-[0_8px_32px_rgba(0,0,0,0.15)] overflow-hidden z-[100] animate-dropdown-in ${
              theme === "dark" ? "bg-[#2d2820]/95" : "bg-[#d4c5b0]/95"
            }`}>
              {loading ? (
                <div className="px-4 py-3 flex justify-center">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              ) : (
                ecosystemOptions.map((eco, index) => (
                  <button
                    key={eco.value}
                    onClick={() => {
                      onEcosystemChange({ label: eco.label, value: eco.value });
                      onToggleDropdown();
                    }}
                    className={`w-full px-4 py-3 text-left text-[13px] font-medium transition-all ${
                      index === 0
                        ? `${theme === "dark" ? "bg-white/[0.08]" : "bg-white/[0.1]"} font-bold ${theme === "dark" ? "hover:bg-white/[0.12]" : "hover:bg-white/[0.15]"}`
                        : `${theme === "dark" ? "hover:bg-white/[0.08]" : "hover:bg-white/[0.1]"}`
                    } ${theme === "dark" ? "text-[#f5f5f5]" : "text-[#2d2820]"}`}
                  >
                    {eco.label}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}