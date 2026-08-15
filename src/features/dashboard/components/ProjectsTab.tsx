import { useEffect, useState } from "react";
import { Github, FolderGit2 } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import { getProjectsContributed } from "../../../shared/api/client";
import { SkeletonLoader } from "../../../shared/components/SkeletonLoader";

// The projects a contributor has actually contributed to, from
// /profile/projects (ProjectsContributed).
//
// This tab previously rendered a hardcoded array of five projects - React
// Ecosystem, Next.js Framework, Vue.js, Express.js, Django - with invented
// contributor counts, invented issue counts, "My rewards" of "3,600 USD" and
// billing profiles reading "React Foundation" and "Vercel Inc.". Nothing in
// the file made a request.
//
// TWO COLUMNS ARE GONE RATHER THAN ZEROED. "My contributions" and "My rewards"
// have no backing: /profile/projects returns id, github_full_name, status,
// ecosystem_name, language and owner_avatar_url, and there is no per-project
// contribution count or reward figure behind it. A column of zeros invites
// "why zero?" and implies the number is real and currently nil; an absent
// column asks nothing. When a real per-project count exists - internal/ranking
// already computes merged PRs per repo for the leaderboard - add the column
// back with the endpoint that serves it.
//
// Not /projects/mine: that is `WHERE p.owner_user_id = $1`, the projects you
// own as a maintainer, which is a different question from the one this tab asks.

type ContributedProject = Awaited<ReturnType<typeof getProjectsContributed>>[number];

const LANGUAGE_BADGE: Record<string, { icon: string; color: string }> = {
  TypeScript: { icon: "TS", color: "bg-blue-500" },
  JavaScript: { icon: "JS", color: "bg-yellow-500" },
  Python: { icon: "Py", color: "bg-green-600" },
  Java: { icon: "Jv", color: "bg-red-600" },
  Rust: { icon: "Rs", color: "bg-orange-600" },
  Go: { icon: "Go", color: "bg-cyan-600" },
};

function languageBadge(language: string) {
  return LANGUAGE_BADGE[language] ?? { icon: language.slice(0, 2), color: "bg-gray-500" };
}

export function ProjectsTab() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [projects, setProjects] = useState<ContributedProject[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getProjectsContributed()
      .then((data) => {
        if (!cancelled) setProjects(data ?? []);
      })
      .catch((error) => {
        console.error("Failed to load contributed projects:", error);
        if (cancelled) return;
        // Kept distinct from the empty state: showing "no projects" on a failed
        // request tells somebody with real contributions that they have none.
        setFailed(true);
        toast.error(error instanceof Error ? error.message : "Failed to load your projects.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const shell = `backdrop-blur-[40px] rounded-[20px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-colors ${
    isDark ? "bg-[#2d2820]/[0.4] border-white/10" : "bg-white/[0.12] border-white/20"
  }`;
  const strong = isDark ? "text-[#f5efe5]" : "text-[#2d2820]";
  const muted = isDark ? "text-[#b8a898]" : "text-[#4a4038]";

  if (isLoading) {
    return (
      <div className={`${shell} p-8 space-y-3`}>
        {[0, 1, 2].map((i) => (
          <SkeletonLoader key={i} variant="text" height="18px" />
        ))}
      </div>
    );
  }

  if (failed) {
    return (
      <div className={`${shell} p-8 text-center`}>
        <p className={`text-[14px] ${muted}`}>Couldn't load your projects. Please try again later.</p>
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <div className={`${shell} p-12 text-center`}>
        <div
          className={`w-14 h-14 rounded-full mx-auto mb-5 flex items-center justify-center ${
            isDark ? "bg-white/[0.06]" : "bg-black/[0.04]"
          }`}
        >
          <FolderGit2 className={`w-6 h-6 ${muted}`} />
        </div>
        <h3 className={`text-[18px] font-bold mb-2 ${strong}`}>No projects yet</h3>
        <p className={`text-[14px] max-w-md mx-auto ${muted}`}>
          Projects you contribute to will appear here. Find an issue on Discover to get started.
        </p>
      </div>
    );
  }

  const cellHead = `px-6 py-4 text-left text-[12px] font-semibold uppercase tracking-wider whitespace-nowrap ${muted}`;

  return (
    <>
      {/* Desktop */}
      <div className={`hidden md:block ${shell} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={isDark ? "bg-white/[0.04]" : "bg-white/[0.08]"}>
              <tr className={`border-b ${isDark ? "border-white/10" : "border-black/[0.06]"}`}>
                <th className={cellHead}>Project</th>
                <th className={cellHead}>Ecosystem</th>
                <th className={cellHead}>Language</th>
                <th className={cellHead}>Repository</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr
                  key={p.id}
                  className={`border-b last:border-0 ${isDark ? "border-white/[0.06]" : "border-black/[0.04]"}`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {p.owner_avatar_url ? (
                        <img
                          src={p.owner_avatar_url}
                          alt=""
                          className="w-8 h-8 rounded-[8px] shrink-0"
                          loading="lazy"
                        />
                      ) : (
                        <div
                          className={`w-8 h-8 rounded-[8px] shrink-0 flex items-center justify-center ${
                            isDark ? "bg-white/10" : "bg-black/5"
                          }`}
                        >
                          <Github className={`w-4 h-4 ${muted}`} />
                        </div>
                      )}
                      <span className={`text-[14px] font-semibold ${strong}`}>
                        {p.github_full_name}
                      </span>
                    </div>
                  </td>
                  <td className={`px-6 py-4 text-[14px] ${muted}`}>{p.ecosystem_name ?? "—"}</td>
                  <td className="px-6 py-4">
                    {p.language ? (
                      <span className="inline-flex items-center gap-2">
                        <span
                          className={`w-5 h-5 rounded-[4px] text-white text-[9px] font-bold flex items-center justify-center ${
                            languageBadge(p.language).color
                          }`}
                        >
                          {languageBadge(p.language).icon}
                        </span>
                        <span className={`text-[14px] ${muted}`}>{p.language}</span>
                      </span>
                    ) : (
                      <span className={`text-[14px] ${muted}`}>—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <a
                      href={`https://github.com/${p.github_full_name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1.5 text-[13px] font-medium ${
                        isDark ? "text-[#d4af37] hover:text-[#ffc926]" : "text-[#7d5c20] hover:text-[#a67c2e]"
                      }`}
                    >
                      <Github className="w-3.5 h-3.5" /> View
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-3">
        {projects.map((p) => (
          <div key={p.id} className={`${shell} p-4`}>
            <div className="flex items-center gap-3 mb-3">
              {p.owner_avatar_url ? (
                <img src={p.owner_avatar_url} alt="" className="w-9 h-9 rounded-[8px] shrink-0" loading="lazy" />
              ) : (
                <div
                  className={`w-9 h-9 rounded-[8px] shrink-0 flex items-center justify-center ${
                    isDark ? "bg-white/10" : "bg-black/5"
                  }`}
                >
                  <Github className={`w-4 h-4 ${muted}`} />
                </div>
              )}
              <span className={`text-[14px] font-semibold min-w-0 break-words ${strong}`}>
                {p.github_full_name}
              </span>
            </div>
            <div className={`flex flex-wrap gap-x-4 gap-y-1 text-[13px] ${muted}`}>
              {p.ecosystem_name && <span>{p.ecosystem_name}</span>}
              {p.language && <span>{p.language}</span>}
              <a
                href={`https://github.com/${p.github_full_name}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 font-medium ${
                  isDark ? "text-[#d4af37]" : "text-[#7d5c20]"
                }`}
              >
                <Github className="w-3.5 h-3.5" /> View
              </a>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
