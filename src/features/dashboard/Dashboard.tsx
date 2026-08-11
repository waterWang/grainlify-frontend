import { useState, useEffect, useRef, Suspense, lazy } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import {
  Search,
  Compass,
  Grid3x3,
  Calendar,
  Globe,
  Users,
  Trophy,
  Database,
  FileText,
  Moon,
  Sun,
  Shield,
  X,
  Menu,
  Flag,
  Ticket
} from "lucide-react";
import { useThemeToggleAnimation } from "../../shared/hooks/useThemeToggleAnimation";
import { useAuth } from "../../shared/contexts/AuthContext";
import grainlifyLogo from "../../assets/grainlify_log.svg";
import { useTheme } from "../../shared/contexts/ThemeContext";
import { UserProfileDropdown } from "../../shared/components/UserProfileDropdown";
import { NotificationsDropdown } from "../../shared/components/NotificationsDropdown";
import { RoleSwitcher } from "../../shared/components/RoleSwitcher";
import { ProductTour, type TourStep } from "../../shared/components/ProductTour";
import {
  Modal,
  ModalFooter,
  ModalButton,
  ModalInput,
} from "../../shared/components/ui/Modal";
import { bootstrapAdmin } from "../../shared/api/client";

// Every "page" here is a currentPage state swap, not a router path (see App.tsx),
// so without lazy-loading, the entire dashboard - Discover, Browse, Admin, Settings,
// Blog, every tab - shipped as one bundle regardless of which page a user actually
// opened. Splitting each into its own chunk means only the active tab's code (plus
// whatever it imports) downloads.
const ContributorsPage = lazy(() => import("./pages/ContributorsPage").then((m) => ({ default: m.ContributorsPage })));
const BrowsePage = lazy(() => import("./pages/BrowsePage").then((m) => ({ default: m.BrowsePage })));
const DiscoverPage = lazy(() => import("./pages/DiscoverPage").then((m) => ({ default: m.DiscoverPage })));
const OpenSourceWeekPage = lazy(() => import("./pages/OpenSourceWeekPage").then((m) => ({ default: m.OpenSourceWeekPage })));
const OpenSourceWeekDetailPage = lazy(() => import("./pages/OpenSourceWeekDetailPage").then((m) => ({ default: m.OpenSourceWeekDetailPage })));
const EcosystemsPage = lazy(() => import("./pages/EcosystemsPage").then((m) => ({ default: m.EcosystemsPage })));
const EcosystemDetailPage = lazy(() => import("./pages/EcosystemDetailPage").then((m) => ({ default: m.EcosystemDetailPage })));
const MaintainersPage = lazy(() => import("../maintainers/pages/MaintainersPage").then((m) => ({ default: m.MaintainersPage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const OrgProfilePage = lazy(() => import("./pages/OrgProfilePage").then((m) => ({ default: m.OrgProfilePage })));
const DataPage = lazy(() => import("./pages/DataPage").then((m) => ({ default: m.DataPage })));
const ProjectDetailPage = lazy(() => import("./pages/ProjectDetailPage").then((m) => ({ default: m.ProjectDetailPage })));
const IssueDetailPage = lazy(() => import("./pages/IssueDetailPage").then((m) => ({ default: m.IssueDetailPage })));
const LeaderboardPage = lazy(() => import("../leaderboard/pages/LeaderboardPage").then((m) => ({ default: m.LeaderboardPage })));
const BlogPage = lazy(() => import("../blog/pages/BlogPage").then((m) => ({ default: m.BlogPage })));
const SettingsPage = lazy(() => import("../settings/pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const AdminPage = lazy(() => import("../admin/pages/AdminPage").then((m) => ({ default: m.AdminPage })));
const GrainHackAdminPage = lazy(() => import("../grainhack/pages/GrainHackAdminPage").then((m) => ({ default: m.GrainHackAdminPage })));
const MyGrainHackPage = lazy(() => import("../grainhack/pages/MyGrainHackPage").then((m) => ({ default: m.MyGrainHackPage })));
const SearchPage = lazy(() => import("./pages/SearchPage").then((m) => ({ default: m.SearchPage })));

/** The Redeem page was removed with the points programme. Anything still
 *  pointing at it is sent to the rewards settings tab, which explains what
 *  replaced it. */
const RETIRED_REDEEM_TAB = "redeem";
const REDEEM_REPLACEMENT_TAB = "settings";

export function Dashboard() {
  const { logout, login, user, userId, userRole } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const { ref: themeToggleRef, toggleWithAnimation: toggleSwitchTheme } =
    useThemeToggleAnimation({ onToggle: toggleTheme });
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();
  // Every navUrl()-driven URL write should push a new history entry (so the
  // browser Back button actually steps through in-app navigation) except the
  // very first one, which would otherwise insert a redundant entry for "you
  // arrived at the page you're already on" before the user has done anything.
  const isFirstUrlSync = useRef(true);
  // const [currentPage, setCurrentPage] = useState('discover');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    () => {
      if (typeof window === "undefined") return null;
      const params = new URLSearchParams(window.location.search);
      return params.get("project");
    },
  );
  const [projectBackTarget, setProjectBackTarget] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("from");
  });
  // Where "Back" from a contributor's profile should return to - defaults to
  // Discover (a sensible universal fallback) and is overridden at the one
  // known entry point (Search) below. Previously hardcoded to "leaderboard"
  // regardless of actual origin, with a URL write using the wrong param name
  // ("page=" instead of "tab=") that bypassed the main sync effect entirely.
  const [profileBackTarget, setProfileBackTarget] = useState("discover");
  // Reads unconditionally (any currentPage), not just when tab=browse - a
  // fix for issue overlays opened from Ecosystems/OSW/Maintainers/Discover
  // not surviving reload.
  const [selectedIssue, setSelectedIssue] = useState<{
    issueId: string;
    projectId?: string;
  } | null>(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const issueId = params.get("issue");
    const projectId = params.get("project");
    if (!issueId) return null;
    return { issueId, projectId: projectId || undefined };
  });
  const [selectedEcosystemId, setSelectedEcosystemId] = useState<string | null>(
    null,
  );
  const [selectedEcosystemName, setSelectedEcosystemName] = useState<
    string | null
  >(null);
  const [selectedEcosystemDescription, setSelectedEcosystemDescription] = useState<string | null>(null);
  const [selectedEcosystemLogoUrl, setSelectedEcosystemLogoUrl] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEventName, setSelectedEventName] = useState<string | null>(
    null,
  );
  const [hoveredNavItem, setHoveredNavItem] = useState<{
    label: string;
    top: number;
    left: number;
  } | null>(null);
  const [activeRole, setActiveRole] = useState<
    "contributor" | "maintainer" | "admin"
  >("contributor");
  // Initialize viewing user from URL so profile page gets correct user on first render (avoids race with own profile fetch)
  const [viewingUserId, setViewingUserId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const userParam = params.get("user");
    const tabParam = params.get("tab") || params.get("page");
    if (tabParam === "profile" && userParam) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(userParam)) return userParam;
      return null;
    }
    return null;
  });
  const [viewingUserLogin, setViewingUserLogin] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const userParam = params.get("user");
    const tabParam = params.get("tab") || params.get("page");
    if (tabParam === "profile" && userParam) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userParam)) return userParam;
      return null;
    }
    return null;
  });
  // Org login has no id/login ambiguity (unlike users, orgs are only ever a
  // plain GitHub login string) - a single state, mirroring viewingUserLogin.
  const [viewingOrgLogin, setViewingOrgLogin] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const orgParam = params.get("org");
    const tabParam = params.get("tab") || params.get("page");
    return tabParam === "org" && orgParam ? orgParam : null;
  });
  // Where "Back" from an org's page should return to - mirrors profileBackTarget.
  const [orgBackTarget, setOrgBackTarget] = useState("discover");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [deviceWidth, setDeviceWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : null
  );

  useEffect(() => { 
    const handleResize = () => {
      setDeviceWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  // ******************************************

  // Persist current tab across reload
  const [currentPage, setCurrentPage] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tabFromUrl = params.get("tab");
    // The Redeem page is gone with the points programme. Redirect rather than
    // 404: links to it exist in the UI, in notifications, and possibly
    // outside the product, and landing on "page not found" tells somebody
    // their rewards vanished. Resolved here so a ?tab=redeem URL and a stale
    // localStorage value both land in the same place.
    if (tabFromUrl === RETIRED_REDEEM_TAB) return REDEEM_REPLACEMENT_TAB;
    if (tabFromUrl) return tabFromUrl;

    const stored = localStorage.getItem("dashboardTab");
    if (stored === RETIRED_REDEEM_TAB) return REDEEM_REPLACEMENT_TAB;
    return stored || "discover";
  });

  // Rewrite a retired ?tab=redeem URL into the tab that replaced it, so the
  // address bar, a reload, and a shared link all agree. Done as an effect
  // rather than in the state initialiser because the router has already read
  // the location by then, and setSearchParams is what it actually observes.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") !== RETIRED_REDEEM_TAB) return;
    params.set("tab", REDEEM_REPLACEMENT_TAB);
    params.set("subtab", "rewards");
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Admin password gating (bootstrap token)
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [adminAuthenticated, setAdminAuthenticated] = useState(() => {
    return sessionStorage.getItem("admin_authenticated") === "true";
  });

  // Check URL params for viewing other users' profiles (tab=profile or page=profile)
  // Re-run when location.search changes so profile user is correct after navigation or reload
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const userParam = params.get("user");
    const tabParam = params.get("tab") || params.get("page");

    if (tabParam === "profile" && userParam) {
      setCurrentPage("profile");
      // Check if it's a UUID (user_id) or a username (login)
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(userParam)) {
        setViewingUserId(userParam);
        setViewingUserLogin(null);
      } else {
        setViewingUserLogin(userParam);
        setViewingUserId(null);
      }
    } else if (tabParam === "profile" && !userParam) {
      setViewingUserId(null);
      setViewingUserLogin(null);
    }
  }, [location.search]);

  // Check URL params for viewing an org's page (tab=org&org=X) - mirrors the
  // profile effect above; org logins have no id/login ambiguity to resolve.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const orgParam = params.get("org");
    const tabParam = params.get("tab") || params.get("page");

    if (tabParam === "org" && orgParam) {
      setCurrentPage("org");
      setViewingOrgLogin(orgParam);
    } else if (tabParam === "org" && !orgParam) {
      setViewingOrgLogin(null);
    }
  }, [location.search]);

  // Note: a former "deep link" effect that special-cased tab=browse&project=&issue=
  // URLs used to live here. It's now redundant - selectedIssue's own useState
  // initializer above reads ?issue=/?project= unconditionally (any tab), and
  // currentPage's own initializer independently reads ?tab= from the same URL,
  // so any deep link that sets all three params is already handled by each
  // piece of state resolving itself on mount - no extra coordination effect needed.

  // *******************************
  // Keep URL in sync with tab, profile user, and (when viewing an issue) project
  // + issue for shareable links. Pushes a new history entry for every change
  // (after the first) so the browser Back button steps through in-app
  // navigation instead of leaving the app entirely - see isFirstUrlSync above.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("tab", currentPage);
    if (currentPage === "profile" && (viewingUserId || viewingUserLogin)) {
      params.set("user", viewingUserId || viewingUserLogin || "");
    } else if (currentPage === "profile") {
      params.delete("user");
    }
    if (currentPage === "org" && viewingOrgLogin) {
      params.set("org", viewingOrgLogin);
    } else if (currentPage === "org") {
      params.delete("org");
    }
    if (selectedProjectId) {
      params.set("project", selectedProjectId);
      if (projectBackTarget) {
        params.set("from", projectBackTarget);
      }
    } else {
      params.delete("project");
      params.delete("from");
    }
    // selectedProjectId is always kept in sync alongside selectedIssue at every
    // call site in this file, so project= is already handled by the block above.
    if (selectedIssue?.issueId) params.set("issue", selectedIssue.issueId);
    else params.delete("issue");
    setSearchParams(params, { replace: isFirstUrlSync.current });
    isFirstUrlSync.current = false;

    localStorage.setItem("dashboardTab", currentPage);
  }, [currentPage, selectedProjectId, selectedIssue, viewingUserId, viewingUserLogin, viewingOrgLogin, projectBackTarget, setSearchParams]);

  // Forget the viewed org once the user has navigated away from its page -
  // viewingOrgLogin has no meaning outside currentPage === "org".
  useEffect(() => {
    if (currentPage !== "org" && viewingOrgLogin) {
      setViewingOrgLogin(null);
    }
  }, [currentPage, viewingOrgLogin]);

  // Keyboard shortcut for search (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCurrentPage("search");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleNavigation = (page: string) => {
    setCurrentPage(page);
    setSelectedProjectId(null);
    setProjectBackTarget(null);
    setSelectedIssue(null);
    setSelectedEcosystemId(null);
    setSelectedEcosystemName(null);
    setSelectedEcosystemDescription(null);
    setSelectedEcosystemLogoUrl(null);
    setSelectedEventId(null);
    setSelectedEventName(null);
    setProfileBackTarget("discover");
    // When switching to profile tab (e.g. "Public Profile" click), show own profile, not last viewed user
    if (page === "profile") {
      setViewingUserId(null);
      setViewingUserLogin(null);
    }
  };

  const handleLogout = () => {
    logout();
    setAdminAuthenticated(false);
    sessionStorage.removeItem("admin_authenticated");
    navigate("/");
  };

  const openAdminAuthModal = () => {
    setShowAdminPasswordModal(true);
  };

  const handleAdminPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword.trim()) return;
    setIsAuthenticating(true);
    try {
      const response = await bootstrapAdmin(adminPassword.trim());
      await login(response.token);
      setAdminAuthenticated(true);
      sessionStorage.setItem("admin_authenticated", "true");
      setShowAdminPasswordModal(false);
      setAdminPassword("");
      setActiveRole("admin");
      handleNavigation("admin");
    } catch (error) {
      console.error("Admin authentication failed:", error);
      // Keep UI clean: show a simple message; avoid browser alert spam.
      // The ModalInput will remain so user can retry.
      setAdminPassword("");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleRoleChange = (role: "contributor" | "maintainer" | "admin") => {
    if (role === "admin") {
      if (adminAuthenticated) {
        setActiveRole("admin");
        handleNavigation("admin");
      } else {
        // Non-admin users can click admin, but must authenticate first.
        openAdminAuthModal();
      }
      return;
    }
    setActiveRole(role);
    // Auto-navigate based on role and clear selections
    setSelectedProjectId(null);
    setProjectBackTarget(null);
    setSelectedIssue(null);
    setSelectedEcosystemId(null);
    setSelectedEcosystemName(null);
    setSelectedEcosystemDescription(null);
    setSelectedEcosystemLogoUrl(null);
    setSelectedEventId(null);
    setSelectedEventName(null);
    setProfileBackTarget("discover");
    if (role === "maintainer") {
      setCurrentPage("maintainers");
    } else {
      setCurrentPage("discover");
    }
  };

  const handleEcosystemClick = (
    ecosystemId: string,
    ecosystemName: string,
    description?: string | null,
    logoUrl?: string | null,
  ) => {
    setSelectedEcosystemId(ecosystemId);
    setSelectedEcosystemName(ecosystemName);
    setSelectedEcosystemDescription(description ?? null);
    setSelectedEcosystemLogoUrl(logoUrl ?? null);
  };

  const handleBackFromEcosystem = () => {
    setSelectedEcosystemId(null);
    setSelectedEcosystemName(null);
    setSelectedEcosystemDescription(null);
    setSelectedEcosystemLogoUrl(null);
  };

  // Role-based navigation items
  const navItems = [
    { id: "discover", icon: Compass, label: "Discover" },
    { id: "browse", icon: Grid3x3, label: "Browse" },
    { id: "osw", icon: Calendar, label: "Open-Source Week" },
    { id: "ecosystems", icon: Globe, label: "Ecosystems" },
    // Show Contributors for contributors, Maintainers for maintainers
    activeRole === "maintainer" || activeRole === "admin"
      ? { id: "maintainers", icon: Users, label: "Maintainers" }
      : { id: "contributors", icon: Users, label: "Contributors" },
    // Data page is only visible to admin
    ...(activeRole === "admin"
      ? [{ id: "data", icon: Database, label: "Data" }]
      : []),
    // A contributor's own GrainHack applications and assignments. Visible
    // to any signed-in user - it only ever shows their own rows.
    ...(userId ? [{ id: "my-grainhack", icon: Ticket, label: "My GrainHack" }] : []),
    // GrainHack administration is gated on the real backend-verified role,
    // not activeRole - that's a client-side view toggle, not an authorization
    // boundary, and this surface can accept/reject applications and edit
    // live event config.
    ...(userRole === "admin"
      ? [{ id: "grainhack", icon: Flag, label: "GrainHack admin" }]
      : []),
    { id: "leaderboard", icon: Trophy, label: "Leaderboard" },
    { id: "blog", icon: FileText, label: "Grainlify Blog" },
  ];

  const darkTheme = theme === "dark";
    const closeMobileNav = () => {
     if (showMobileNav){
          setMobileMenuOpen(false);
     }
  }
  const isSmallDevice = deviceWidth && deviceWidth < 1024;
  const showMobileNav = mobileMenuOpen&& isSmallDevice;

  // First-time product tour — shown once per account (localStorage-gated below),
  // desktop-only (the fixed icon-rail sidebar it points at isn't present in the
  // mobile hamburger layout).
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    if (!userId || isSmallDevice) return;
    const key = `grainlify_tour_seen_${userId}`;
    if (localStorage.getItem(key)) return;
    // Marked "seen" the moment we decide to show it, not on completion — a
    // mid-tour refresh shouldn't re-trigger it.
    localStorage.setItem(key, "true");
    const t = setTimeout(() => setShowTour(true), 900);
    return () => clearTimeout(t);
  }, [userId, isSmallDevice]);

  const roleNavItem = navItems.find((item) => item.id === "maintainers" || item.id === "contributors");
  const tourSteps: TourStep[] = [
    {
      targetId: "center",
      title: `Welcome to Grainlify${user?.github?.login ? `, ${user.github.login}` : ""}!`,
      description: "A quick look around so you know exactly how to earn on-chain rewards for open source work.",
    },
    {
      targetId: "discover",
      title: "Discover",
      description: "Your personalized feed — projects and issues matched to your skills and interests.",
    },
    {
      targetId: "browse",
      title: "Browse",
      description: "Explore every project on the platform yourself, organized by ecosystem.",
    },
    {
      targetId: roleNavItem?.id ?? "contributors",
      title: roleNavItem?.label ?? "Contributors",
      description:
        roleNavItem?.id === "maintainers"
          ? "Manage your repositories, review issues, and track pull requests."
          : "See other contributors and their activity across the platform.",
    },
    {
      targetId: "leaderboard",
      title: "Leaderboard",
      description: "Track rankings by contributions and compete for the top spot.",
    },
    {
      targetId: "search",
      title: "Quick search",
      description: "Press ⌘K (or Ctrl+K) anytime to jump straight to a project, issue, or contributor.",
    },
    {
      targetId: "center",
      title: "You're all set",
      description: "One more thing — add your billing profile and verify KYC in Settings so we can actually route your rewards. Enjoy Grainlify!",
    },
  ];

  return (
    <div
      className={`min-h-screen relative overflow-hidden transition-colors ${
        darkTheme
          ? "bg-gradient-to-br from-[#1a1512] via-[#231c17] to-[#2d241d]"
          : "bg-gradient-to-br from-[#c4b5a0] via-[#b8a590] to-[#a89780]"
      }`}
    >
      {/* Subtle Background Texture */}
      <div className="fixed inset-0 opacity-40">
        <div
          className={`absolute top-0 left-0 w-[800px] h-[800px] bg-gradient-radial blur-[100px] ${
            darkTheme
              ? "from-[#c9983a]/10 to-transparent"
              : "from-[#d4c4b0]/30 to-transparent"
          }`}
        />
        <div
          className={`absolute bottom-0 right-0 w-[900px] h-[900px] bg-gradient-radial blur-[120px] ${
            darkTheme
              ? "from-[#c9983a]/5 to-transparent"
              : "from-[#b8a898]/20 to-transparent"
          }`}
        />
      </div>

      {/* Sidebar — permanently collapsed to an icon rail; labels show via hover tooltip */}
      <aside className="fixed top-2 left-2 bottom-2 z-50 w-[65px] mr-2">
        <div
          className={`h-full backdrop-blur-[90px] rounded-[29px] border shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] relative overflow-y-auto scrollbar-hide transition-colors ${
            darkTheme
              ? "bg-[#2d2820]/[0.4] border-white/10"
              : "bg-white/[0.35] border-white/20"
          }`}
        >
          <div className="flex flex-col h-full px-0 py-[40px]">
            {/* Logo */}
            <div className="flex items-center justify-center mb-6 px-[8px]">
              <img
                src={grainlifyLogo}
                alt="Grainlify"
                className="w-12 h-12 grainlify-logo"
              />
            </div>

            {/* Divider */}
            <div
              className="h-[0.5px] opacity-[0.24] mb-6 mx-auto"
              style={{
                width: "60px",
                backgroundImage:
                  'url(\'data:image/svg+xml;utf8,<svg viewBox="0 0 104 0.5" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"><rect x="0" y="0" height="100%" width="100%" fill="url(%23grad)" opacity="1"/><defs><radialGradient id="grad" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="10" gradientTransform="matrix(3.1841e-16 0.025 -5.2 1.5308e-18 52 0.25)"><stop stop-color="rgba(67,44,44,1)" offset="0"/><stop stop-color="rgba(80,28,28,0)" offset="1"/></radialGradient></defs></svg>\')',
              }}
            />

            {/* Main Navigation */}
            <nav className="space-y-2 mb-auto px-[8px]">
              {navItems.map((item) => {
                const isActive = currentPage === item.id;
                const Icon = item.icon as any;
                return (
                  <button
                    key={item.id}
                    data-tour-id={item.id}
                    onClick={() => handleNavigation(item.id)}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredNavItem({
                        label: item.label,
                        top: rect.top + rect.height / 2,
                        left: rect.right,
                      });
                    }}
                    onMouseLeave={() => setHoveredNavItem(null)}
                    className={`group relative w-full flex items-center justify-center px-0 h-[49px] rounded-[12px] backdrop-blur-[40px] transition-all duration-300 ${
                      isActive
                        ? "bg-[#c9983a] shadow-[inset_0px_0px_4px_0px_rgba(255,255,255,0.25)] border-[0.5px] border-[rgba(245,239,235,0.16)]"
                        : darkTheme
                          ? "bg-[#2d2820] shadow-[0px_6px_6.5px_-1px_rgba(0,0,0,0.36),0px_0px_4.2px_0px_rgba(0,0,0,0.69)] hover:scale-[1.01]"
                          : "bg-[#d4c5b0] shadow-[0px_6px_6.5px_-1px_rgba(0,0,0,0.36),0px_0px_4.2px_0px_rgba(0,0,0,0.69)] hover:scale-[1.01]"
                    }`}
                  >
                    {!isActive && (
                      <div
                        className={`absolute inset-0 pointer-events-none rounded-[12px] ${
                          darkTheme
                            ? "shadow-[inset_1px_-1px_1px_0px_rgba(0,0,0,0.5),inset_-2px_2px_1px_-1px_rgba(255,255,255,0.11)]"
                            : "shadow-[inset_1px_-1px_1px_0px_rgba(0,0,0,0.15),inset_-2px_2px_1px_-1px_rgba(255,255,255,0.35)]"
                        }`}
                      />
                    )}
                    <Icon
                      className={`w-6 h-6 transition-colors ${
                        isActive
                          ? "text-white"
                          : darkTheme
                            ? "text-[#e8c77f]"
                            : "text-[#a2792c]"
                      }`}
                    />
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </aside>

      {/* Sidebar hover tooltip — portaled to body so it can't be clipped by the
          sidebar's own overflow-y-auto (which implicitly clips overflow-x too) */}
      {createPortal(
        <AnimatePresence>
          {hoveredNavItem && (
            <motion.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              transition={{ duration: 0.15 }}
              className={`fixed z-[300] pointer-events-none px-3 py-1.5 rounded-[10px] text-[13px] font-medium whitespace-nowrap backdrop-blur-[20px] border shadow-[0_4px_16px_rgba(0,0,0,0.24)] ${
                darkTheme
                  ? "bg-[#2d2820]/95 border-white/15 text-[#f5efe5]"
                  : "bg-white/95 border-white/40 text-[#2d2820]"
              }`}
              style={{
                top: hoveredNavItem.top,
                left: hoveredNavItem.left + 12,
                transform: "translateY(-50%)",
              }}
            >
              {hoveredNavItem.label}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* Main Content */}
      <main className="mr-2 my-2 relative z-10 ml-[81px]">
        <div className="max-w-[1400px] mx-auto">
          {/* Premium Pill-Style Header - Greatest of All Time */}
          <div
            className={`fixed top-2 right-2 left-auto z-[9999] flex items-center gap-1 md:gap-2 lg:gap-3 lg:h-[52px] py-3 rounded-[26px] backdrop-blur-[90px] border ml-[81px] transition-all duration-300 ${
              darkTheme
                ? "bg-[#2d2820]/[0.4] border-white/10 shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25),inset_0px_0px_9px_0px_rgba(201,152,58,0.1)]"
                : "bg-white/[0.35] border-white shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25),inset_0px_0px_9px_0px_rgba(255,255,255,0.5)]"
            }
          ${showMobileNav? "h-screen flex-col":"" } 
          `}
            style={{
              width: `calc(100vw - 81px - 8px - 8px)`,
            }}
          >
          
          {/* opened mobile nav view header  */}
         {showMobileNav &&  
          <div className="flex items-center justify-between w-full px-4"> 
         <Link to="/" className="flex items-center space-x-3 mr-auto">
            <img src={grainlifyLogo} alt="Grainlify" className="w-8 h-8 grainlify-logo" />
            <span className={`text-xl font-semibold transition-colors ${
                 theme === 'dark' ? 'text-[#e8dfd0]' : 'text-[#2d2820]'
               }`}>Grainlify</span>
          </Link>

          {/* mobile nav close button */}
          <button
            className={`lg:hidden transition-colors self-end ${showMobileNav ? 'block' : 'hidden'} ${
                 theme === 'dark' ? 'text-[#e8dfd0]' : 'text-[#2d2820]'
               }`}
               onClick={() => setMobileMenuOpen(false)}
               >
            <X size={24} />
          </button>
          </div>
          }

            {/* Search - Premium Pill Style */}
            <button
              data-tour-id="search"
              onClick={() => {setCurrentPage("search");closeMobileNav();}}
              className={`relative h-[46px] lg:flex-1 rounded-[23px] overflow-visible backdrop-blur-[40px] shadow-[0px_6px_6.5px_-1px_rgba(0,0,0,0.36),0px_0px_4.2px_0px_rgba(0,0,0,0.69)] ml-[3px] transition-all hover:scale-[1.01] cursor-pointer ${
                darkTheme ? "bg-[#2d2820]" : "bg-[#d4c5b0]"
              } ${showMobileNav ? 'min-h-[46px] w-[80%] max-w-[800px] block': 'lg:block hidden'}
              `}
            >
              <div
                className={`absolute inset-0 pointer-events-none rounded-[23px] ${
                  darkTheme
                    ? "shadow-[inset_1px_-1px_1px_0px_rgba(0,0,0,0.5),inset_-2px_2px_1px_-1px_rgba(255,255,255,0.11)]"
                    : "shadow-[inset_1px_-1px_1px_0px_rgba(0,0,0,0.15),inset_-2px_2px_1px_-1px_rgba(255,255,255,0.35)]"
                }`}
              />
              <div className="relative h-full flex items-center px-2 lg:px-5 justify-between">
                <div className="flex items-center flex-1">
                  <Search
                    className={`w-4 h-4 mr-3 flex-shrink-0 transition-colors ${
                      darkTheme
                        ? "text-[rgba(255,255,255,0.69)]"
                        : "text-[rgba(45,40,32,0.75)]"
                    }`}
                  />
                  <span
                    className={`text-[13px] transition-colors ${
                      darkTheme
                        ? "text-[rgba(255,255,255,0.5)]"
                        : "text-[rgba(45,40,32,0.5)]"
                    }`}
                  >
                    <span className="sm:hidden">Search</span>
                    <span className="hidden sm:inline md:hidden">
                      Search projects
                    </span>
                    <span className="hidden md:inline lg:hidden">
                      Search projects, issues
                    </span>
                    <span className="hidden lg:inline">
                      Search projects, issues, contributors...
                    </span>
                  </span>
                </div>

                <div
                  className="hidden lg:flex  items-center gap-1.5 px-2 py-1 rounded border"
                  style={{
                    backgroundColor: darkTheme
                      ? "rgba(255, 255, 255, 0.08)"
                      : "rgba(0, 0, 0, 0.08)",
                    borderColor: darkTheme
                      ? "rgba(255, 255, 255, 0.2)"
                      : "rgba(0, 0, 0, 0.15)",
                  }}
                >
                  <span
                    className="text-[11px] font-medium"
                    style={{
                      color: darkTheme
                        ? "rgba(255, 255, 255, 0.7)"
                        : "rgba(0, 0, 0, 0.7)",
                    }}
                  >
                    ⌘
                  </span>
                  <span
                    className="text-[11px] font-medium"
                    style={{
                      color: darkTheme
                        ? "rgba(255, 255, 255, 0.7)"
                        : "rgba(0, 0, 0, 0.7)",
                    }}
                  >
                    K
                  </span>
                </div>
              </div>
            </button>
               
          
            {/* Role Switcher */}
            <RoleSwitcher
              currentRole={activeRole}
              isSmallDevice={!!isSmallDevice}
              showMobileNav={!!showMobileNav}
              closeMobileNav={closeMobileNav}
              onRoleChange={handleRoleChange}
            />

            {/* Theme Toggle - Separate Pill Button (animated) */}
            <button
              ref={themeToggleRef}
              onClick={() => {
                toggleSwitchTheme();
                closeMobileNav();
              }}
              className={`h-[46px] lg:w-[46px]  overflow-clip relative items-center justify-center backdrop-blur-[40px] transition-all hover:scale-105 shadow-[0px_6px_6.5px_-1px_rgba(0,0,0,0.36),0px_0px_4.2px_0px_rgba(0,0,0,0.69)] ${
                darkTheme ? "bg-[#2d2820] text-[#e8dfd0]" : "bg-[#d4c5b0] text-[#2d2820]"
              }
              ${showMobileNav ? ' flex rounded-sm w-[80%] max-w-[800px] ' : ' hidden lg:flex rounded-full '}`}
              title={darkTheme ? "Switch to light mode" : "Switch to dark mode"}
            >
              <div
                className={`absolute inset-0 pointer-events-none ${
                  darkTheme
                    ? "shadow-[inset_1px_-1px_1px_0px_rgba(0,0,0,0.5),inset_-2px_2px_1px_-1px_rgba(255,255,255,0.11)]"
                    : "shadow-[inset_1px_-1px_1px_0px_rgba(0,0,0,0.15),inset_-2px_2px_1px_-1px_rgba(255,255,255,0.35)]"
                } ${showMobileNav? 'rounded-sm': 'rounded-full'}`}
              />
              {darkTheme ? (
                <Sun
                  className={`w-4 h-4 relative z-10 transition-colors ${
                    darkTheme
                      ? "text-[rgba(255,255,255,0.69)]"
                      : "text-[rgba(45,40,32,0.75)]"
                  }`}
                />
              ) : (
                <Moon
                  className={`w-4 h-4 relative z-10 transition-colors ${
                    darkTheme
                      ? "text-[rgba(255,255,255,0.69)]"
                      : "text-[rgba(45,40,32,0.75)]"
                  }`}
                />
              )}
               <span className='ml-2 lg:hidden'>
              {

               showMobileNav && darkTheme ?"Light Mode" :"Dark Mode"
               }
               </span>
            </button>

            {/* Notifications Dropdown */}
            <NotificationsDropdown showMobileNav={!!showMobileNav} closeMobileNav={closeMobileNav}/>

            {/* User Profile Dropdown - Shows profile when authenticated, Sign In when not */}
            <UserProfileDropdown onPageChange={handleNavigation} showMobileNav={!!showMobileNav} onLogout={handleLogout} />
            {/* mobile nav open button  */}
             <button
            className={`lg:hidden transition-colors ml-auto mr-[8px] ${showMobileNav? 'hidden' : 'block'} ${
              theme === 'dark' ? 'text-[#e8dfd0]' : 'text-[#2d2820]'
            }`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          </div>

          {/* Page Content */}
          <div className="pt-[68px]">
            <Suspense
              fallback={
                <div className="flex items-center justify-center min-h-[50vh]">
                  <div className="w-8 h-8 rounded-full border-2 border-[#c9983a]/30 border-t-[#c9983a] animate-spin" />
                </div>
              }
            >
            {selectedIssue ? (
              <IssueDetailPage
                issueId={selectedIssue.issueId}
                projectId={selectedIssue.projectId}
                onClose={() => setSelectedIssue(null)}
                userRole={userRole}
                activeRole={activeRole}
              />
            ) : selectedProjectId ? (
              <ProjectDetailPage
                projectId={selectedProjectId}
                backLabel={
                  projectBackTarget === "browse"
                    ? "Back to Browse"
                    : projectBackTarget === "profile"
                      ? "Back to Profile"
                      : projectBackTarget === "leaderboard"
                        ? "Back to Leaderboard"
                        : projectBackTarget === "ecosystems"
                          ? "Back to Ecosystems"
                          : projectBackTarget === "discover"
                            ? "Back to Discover"
                            : projectBackTarget === "org"
                              ? "Back to Organization"
                              : "Back"
                }
                onBack={() => {
                  setSelectedProjectId(null);
                  if (projectBackTarget) {
                    setCurrentPage(projectBackTarget as any);
                  }
                  setProjectBackTarget(null);
                }}
                onIssueClick={(issueId, projectId) =>
                  setSelectedIssue({ issueId, projectId })
                }
              />
            ) : (
              <>
                {currentPage === "discover" && (
                  <DiscoverPage
                    activeRole={activeRole}
                    onGoToBilling={() => {
                      // SettingsPage/MaintainersPage now own their sub-tab via
                      // their own ?subtab= read (see those files) - writing it
                      // here too means it's already in place by the time they
                      // mount, without Dashboard needing to know their tab types.
                      const params = new URLSearchParams(location.search);
                      params.set("tab", "settings");
                      params.set("subtab", "billing");
                      setSearchParams(params);
                      setCurrentPage("settings");
                    }}
                    onGoToOpenSourceWeek={() => setCurrentPage("osw")}
                  />
                )}
                {currentPage === "browse" && (
                  <BrowsePage
                    onProjectClick={(id) => {
                      setSelectedProjectId(id);
                      setProjectBackTarget("browse");
                    }}
                    onOrgClick={(org) => {
                      setViewingOrgLogin(org);
                      setOrgBackTarget("browse");
                      setCurrentPage("org");
                    }}
                  />
                )}
                {currentPage === "osw" && !selectedEventId && (
                  <OpenSourceWeekPage
                    onEventClick={(id, name) => {
                      setSelectedEventId(id);
                      setSelectedEventName(name);
                    }}
                  />
                )}
                {currentPage === "osw" &&
                  selectedEventId &&
                  selectedEventName && (
                    <OpenSourceWeekDetailPage
                      eventId={selectedEventId}
                      eventName={selectedEventName}
                      onBack={() => {
                        setSelectedEventId(null);
                        setSelectedEventName(null);
                      }}
                    />
                  )}
                {currentPage === "ecosystems" && !selectedEcosystemId && (
                  <EcosystemsPage onEcosystemClick={handleEcosystemClick} />
                )}
                {currentPage === "ecosystems" &&
                  selectedEcosystemId &&
                  selectedEcosystemName && (
                    <EcosystemDetailPage
                      ecosystemId={selectedEcosystemId}
                      ecosystemName={selectedEcosystemName}
                      initialDescription={selectedEcosystemDescription}
                      initialLogoUrl={selectedEcosystemLogoUrl}
                      onBack={handleBackFromEcosystem}
                      onProjectClick={(id) => {
                        setSelectedProjectId(id);
                        setProjectBackTarget("ecosystems");
                      }}
                    />
                  )}
                {currentPage === "contributors" && <ContributorsPage />}
                {currentPage === "maintainers" && (
                  <MaintainersPage
                    onNavigate={handleNavigation}
                    viewMode={activeRole === "maintainer" || activeRole === "admin" ? "maintainer" : "contributor"}
                  />
                )}
                {currentPage === "profile" && (
                  <ProfilePage
                    viewingUserId={viewingUserId}
                    viewingUserLogin={viewingUserLogin}
                    onBack={() => {
                      setViewingUserId(null);
                      setViewingUserLogin(null);
                      setCurrentPage(profileBackTarget);
                      setProfileBackTarget("discover");
                    }}
                    onProjectClick={(id) => {
                      setSelectedProjectId(id);
                      setProjectBackTarget("profile");
                      setCurrentPage("discover");
                    }}
                    onIssueClick={(issueId, projectId) => {
                      setSelectedProjectId(projectId);
                      setSelectedIssue({ issueId, projectId });
                      setCurrentPage("discover");
                    }}
                  />
                )}
                {currentPage === "org" && viewingOrgLogin && (
                  <OrgProfilePage
                    viewingOrgLogin={viewingOrgLogin}
                    onBack={() => {
                      setViewingOrgLogin(null);
                      setCurrentPage(orgBackTarget);
                      setOrgBackTarget("discover");
                    }}
                    onProjectClick={(id) => {
                      setSelectedProjectId(id);
                      setProjectBackTarget("org");
                    }}
                  />
                )}
                {currentPage === "data" && adminAuthenticated && <DataPage />}
                {currentPage === "leaderboard" && <LeaderboardPage />}
                {currentPage === "blog" && <BlogPage />}
                {currentPage === "settings" && (
                  <SettingsPage />
                )}
                {currentPage === "admin" && adminAuthenticated && <AdminPage />}
                {currentPage === "admin" && !adminAuthenticated && (
                  <div className="flex items-center justify-center min-h-[60vh]">
                    <div
                      className={`text-center p-8 rounded-[24px] backdrop-blur-[40px] border ${
                        darkTheme
                          ? "bg-white/[0.08] border-white/10 text-[#d4d4d4]"
                          : "bg-white/[0.15] border-white/25 text-[#7a6b5a]"
                      }`}
                    >
                      <Shield className="w-16 h-16 mx-auto mb-4 text-[#c9983a]" />
                      <h2
                        className={`text-2xl font-bold mb-2 ${darkTheme ? "text-[#f5f5f5]" : "text-[#2d2820]"}`}
                      >
                        Admin Access Required
                      </h2>
                      <p className="mb-4">
                        Enter the admin password to continue.
                      </p>
                      <button
                        onClick={() => openAdminAuthModal()}
                        className="px-6 py-3 bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white rounded-[16px] font-semibold text-[14px] shadow-[0_6px_20px_rgba(162,121,44,0.35)] hover:shadow-[0_10px_30px_rgba(162,121,44,0.5)] transition-all"
                      >
                        Authenticate
                      </button>
                    </div>
                  </div>
                )}
                {currentPage === "my-grainhack" && <MyGrainHackPage />}
                {currentPage === "grainhack" && userRole === "admin" && <GrainHackAdminPage />}
                {currentPage === "grainhack" && userRole !== "admin" && (
                  <div className="flex items-center justify-center min-h-[60vh]">
                    <div
                      className={`text-center p-8 rounded-[24px] backdrop-blur-[40px] border ${
                        darkTheme
                          ? "bg-white/[0.08] border-white/10 text-[#d4d4d4]"
                          : "bg-white/[0.15] border-white/25 text-[#7a6b5a]"
                      }`}
                    >
                      <Shield className="w-16 h-16 mx-auto mb-4 text-[#c9983a]" />
                      <h2
                        className={`text-2xl font-bold mb-2 ${darkTheme ? "text-[#f5f5f5]" : "text-[#2d2820]"}`}
                      >
                        Admin Access Required
                      </h2>
                      <p className="mb-4">
                        You don't have permission to view this page.
                      </p>
                    </div>
                  </div>
                )}
                {currentPage === "search" && (
                  <SearchPage
                    onBack={() => setCurrentPage("discover")}
                    onIssueClick={(issueId, projectId) => {
                      setSelectedProjectId(projectId);
                      setSelectedIssue({ issueId, projectId });
                      setCurrentPage("discover");
                    }}
                    onProjectClick={(id) => {
                      setSelectedProjectId(id);
                      setProjectBackTarget("discover");
                      setCurrentPage("discover");
                    }}
                    onContributorClick={(login) => {
                      setViewingUserLogin(login);
                      setViewingUserId(null);
                      setProfileBackTarget("search");
                      setCurrentPage("profile");
                    }}
                  />
                )}
              </>
            )}
            </Suspense>
          </div>
        </div>
      </main>

      {/* Admin Password Modal */}
      <Modal
        isOpen={showAdminPasswordModal}
        onClose={() => {
          setShowAdminPasswordModal(false);
          setAdminPassword("");
        }}
        title="Admin Authentication"
        icon={<Shield className="w-6 h-6 text-[#c9983a]" />}
        width="md"
      >
        <form onSubmit={handleAdminPasswordSubmit}>
          <div className="space-y-4">
            <p
              className={`text-sm ${darkTheme ? "text-[#d4d4d4]" : "text-[#7a6b5a]"}`}
            >
              Enter the admin password to access the admin panel.
            </p>
            <ModalInput
              type="password"
              placeholder="Enter admin password"
              value={adminPassword}
              onChange={(value) => setAdminPassword(value)}
              required
              autoFocus
            />
            <p
              className={`text-xs ${darkTheme ? "text-[#b8a898]" : "text-[#7a6b5a]"}`}
            >
              Tip: This must match the backend `ADMIN_BOOTSTRAP_TOKEN`.
            </p>
          </div>
          <ModalFooter>
            <ModalButton
              variant="secondary"
              onClick={() => {
                setShowAdminPasswordModal(false);
                setAdminPassword("");
              }}
              disabled={isAuthenticating}
            >
              Cancel
            </ModalButton>
            <ModalButton
              variant="primary"
              type="submit"
              disabled={isAuthenticating || !adminPassword.trim()}
            >
              {isAuthenticating ? "Authenticating..." : "Authenticate"}
            </ModalButton>
          </ModalFooter>
        </form>
      </Modal>

      {showTour && <ProductTour steps={tourSteps} onDone={() => setShowTour(false)} />}
    </div>
  );
}
