import { useState, useEffect } from 'react';
import { Search, ArrowRight, X, FileText, FolderGit2, User, ChevronLeft, Loader2 } from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { searchAll } from '../../../shared/api/client';
import { getRepoName } from '../../../shared/utils/projectFilter';

interface SearchPageProps {
  onBack: () => void;
  onIssueClick: (issueId: string, projectId: string) => void;
  onProjectClick: (projectId: string) => void;
  onContributorClick: (login: string) => void;
}

interface SearchResult {
  id: string;
  type: 'issue' | 'project' | 'contributor';
  title: string;
  subtitle?: string;
  icon: any;
  // Extra data each result type needs to navigate on click.
  projectId?: string;
  login?: string;
}

// Real, fixed categories the backend actually filters Browse by (see
// BrowsePage's own filterOptions.tags) - shown as suggestions so an empty
// search always leads somewhere real instead of a canned example that
// wouldn't match anything.
const searchSuggestions = [
  'Good first issues',
  'Bug',
  'Help wanted',
  'Documentation',
];

// Real API calls need debouncing (unlike the old in-memory mock, which could
// "search" on every keystroke for free) so typing doesn't fire a request per
// character.
const SEARCH_DEBOUNCE_MS = 300;

export function SearchPage({ onBack, onIssueClick, onProjectClick, onContributorClick }: SearchPageProps) {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const darkTheme = theme === 'dark';

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchFailed(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    setSearchFailed(false);

    const timer = setTimeout(async () => {
      try {
        const data = await searchAll(query);
        if (cancelled) return;

        const results: SearchResult[] = [
          ...data.projects.map((project) => ({
            id: project.id,
            type: 'project' as const,
            title: getRepoName(project.github_full_name),
            subtitle: project.description || project.ecosystem_name || project.github_full_name,
            icon: FolderGit2,
          })),
          ...data.issues.map((issue) => ({
            id: issue.id,
            type: 'issue' as const,
            title: issue.title,
            subtitle: getRepoName(issue.project_full_name),
            icon: FileText,
            projectId: issue.project_id,
          })),
          ...data.contributors.map((contributor) => ({
            id: contributor.login,
            type: 'contributor' as const,
            title: contributor.login,
            subtitle: `${contributor.contributions} contribution${contributor.contributions === 1 ? '' : 's'}`,
            icon: User,
            login: contributor.login,
          })),
        ];

        setSearchResults(results);
      } catch {
        if (!cancelled) {
          setSearchResults([]);
          setSearchFailed(true);
        }
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'issue' && result.projectId) {
      onIssueClick(result.id, result.projectId);
    } else if (result.type === 'project') {
      onProjectClick(result.id);
    } else if (result.type === 'contributor' && result.login) {
      onContributorClick(result.login);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
  };

  return (
    <div className="max-w-[1100px] mx-auto px-4 md:px-8 py-8 md:py-12">
        {/* Back Button */}
        <button
          onClick={onBack}
          className={`flex items-center gap-2 mb-8 px-4 py-2 rounded-[12px] transition-all hover:scale-[1.02] ${
            darkTheme
              ? 'bg-[#2d2820]/60 hover:bg-[#2d2820]/80 text-[#d4c5b0]'
              : 'bg-white/60 hover:bg-white/80 text-[#6b5d4d]'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-[14px] font-medium">Back</span>
        </button>

        {/* Main Heading */}
        <h1 className={`text-[42px] font-bold text-center mb-4 leading-tight transition-colors ${
          darkTheme ? 'text-[#f5efe5]' : 'text-[#2d2820]'
        }`}>
          Search Open Source Projects and<br />Build Your Confidence
        </h1>

        {/* Subtitle */}
        <p className={`text-center text-[15px] mb-8 transition-colors ${
          darkTheme ? 'text-[#b8a898]/80' : 'text-[#6b5d4d]/80'
        }`}>
          Build your open source portfolio to optimize your chances of getting funded.<br />
          Explore projects that help you stand out.
        </p>

        {/* Search Input */}
        <div
          className={`relative h-[64px] rounded-[32px] mb-8 transition-colors ${
            darkTheme
              ? 'bg-[#2d2820]/60 border border-white/10'
              : 'bg-white/60 border border-black/10'
          }`}
        >
          <div className="absolute inset-0 flex items-center px-6">
            <Search className={`w-5 h-5 mr-4 flex-shrink-0 transition-colors ${
              darkTheme ? 'text-white/50' : 'text-black/50'
            }`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search issues, projects, contributors..."
              autoFocus
              className={`flex-1 bg-transparent outline-none text-[16px] transition-colors ${
                darkTheme
                  ? 'text-white placeholder:text-white/40'
                  : 'text-[#2d2820] placeholder:text-black/40'
              }`}
            />
            {isSearching && (
              <Loader2 className={`w-4 h-4 mr-2 flex-shrink-0 animate-spin ${
                darkTheme ? 'text-white/50' : 'text-black/50'
              }`} />
            )}
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={`w-8 h-8 rounded-full flex items-center justify-center ml-4 flex-shrink-0 transition-all hover:scale-105 ${
                  darkTheme
                    ? 'bg-white/10 hover:bg-white/20 text-white/60'
                    : 'bg-black/10 hover:bg-black/20 text-black/60'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              className={`w-10 h-10 rounded-full flex items-center justify-center ml-3 flex-shrink-0 transition-all hover:scale-105 ${
                darkTheme
                  ? 'bg-[#c9983a] hover:bg-[#d4a645]'
                  : 'bg-[#c9983a] hover:bg-[#e8c571]'
              }`}
            >
              <ArrowRight className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mb-12">
            <h2 className={`font-semibold mb-4 transition-colors ${
              darkTheme ? 'text-[#f5efe5]' : 'text-[#2d2820]'
            }`}>
              Search Results ({searchResults.length})
            </h2>
            <div className="space-y-3">
              {searchResults.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}-${index}`}
                  onClick={() => handleResultClick(result)}
                  className={`group w-full flex items-center gap-4 px-6 py-4 rounded-[16px] transition-all hover:scale-[1.01] ${
                    darkTheme
                      ? 'bg-[#2d2820]/40 hover:bg-[#2d2820]/60 border border-white/5 hover:border-white/10'
                      : 'bg-white/40 hover:bg-white/60 border border-black/5 hover:border-black/10'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0 ${
                    darkTheme ? 'bg-[#c9983a]/20' : 'bg-[#c9983a]/30'
                  }`}>
                    <result.icon className={`w-5 h-5 ${
                      darkTheme ? 'text-[#e8c77f]' : 'text-[#a2792c]'
                    }`} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className={`font-medium text-[15px] mb-1 transition-colors ${
                      darkTheme ? 'text-[#f5efe5]' : 'text-[#2d2820]'
                    }`}>
                      {result.title}
                    </div>
                    {result.subtitle && (
                      <div className={`text-[13px] transition-colors ${
                        darkTheme ? 'text-[#b8a898]/70' : 'text-[#6b5d4d]/70'
                      }`}>
                        {result.subtitle}
                      </div>
                    )}
                  </div>
                  <div className={`px-3 py-1.5 rounded-[8px] text-[11px] font-medium transition-colors ${
                    darkTheme
                      ? 'bg-[#c9983a]/20 text-[#e8c77f]'
                      : 'bg-[#c9983a]/30 text-[#a2792c]'
                  }`}>
                    {result.type.charAt(0).toUpperCase() + result.type.slice(1)}
                  </div>
                  <ArrowRight className={`w-4 h-4 flex-shrink-0 transition-all group-hover:translate-x-1 ${
                    darkTheme ? 'text-[#c9983a]' : 'text-[#a2792c]'
                  }`} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* No Results */}
        {searchQuery.trim().length >= 2 && !isSearching && searchResults.length === 0 && (
          <div className={`text-center py-12 transition-colors ${
            darkTheme ? 'text-[#b8a898]/60' : 'text-[#6b5d4d]/60'
          }`}>
            <Search className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="text-[16px] font-medium mb-2">
              {searchFailed ? 'Search is temporarily unavailable' : 'No results found'}
            </p>
            <p className="text-[14px]">
              {searchFailed ? 'Please try again in a moment' : 'Try searching for something else'}
            </p>
          </div>
        )}

        {/* Search Suggestions */}
        {!searchQuery && (
          <div>
            <h2 className={`font-semibold mb-2 transition-colors ${
              darkTheme ? 'text-[#f5efe5]' : 'text-[#2d2820]'
            }`}>
              Search suggestions
            </h2>
            <p className={`text-[13px] mb-4 transition-colors ${
              darkTheme ? 'text-[#b8a898]/70' : 'text-[#6b5d4d]/70'
            }`}>
              Discover interesting projects across different technologies
            </p>

            {/* Suggestion Pills Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {searchSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`group flex items-center justify-between px-5 py-4 rounded-[16px] transition-all hover:scale-[1.02] ${
                    darkTheme
                      ? 'bg-[#2d2820]/40 hover:bg-[#2d2820]/60 border border-white/5 hover:border-white/10'
                      : 'bg-white/40 hover:bg-white/60 border border-black/5 hover:border-black/10'
                  }`}
                >
                  <span className={`text-left text-[14px] transition-colors ${
                    darkTheme ? 'text-[#d4c5b0]' : 'text-[#6b5d4d]'
                  }`}>
                    {suggestion}
                  </span>
                  <ArrowRight className={`w-4 h-4 ml-3 flex-shrink-0 transition-all group-hover:translate-x-1 ${
                    darkTheme ? 'text-[#c9983a]' : 'text-[#a2792c]'
                  }`} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
  );
}
