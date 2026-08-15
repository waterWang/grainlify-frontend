import { useEffect, Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "../shared/contexts/AuthContext";
import { ThemeProvider, useTheme } from "../shared/contexts/ThemeContext";
import { LandingPage } from "../features/landing";
import Toast from "../shared/components/Toast";
import { SupportWidget } from "../shared/components/SupportWidget";
import { captureReferralCodeFromURL } from "../shared/api/client";

// Code-split from the landing page's bundle: an anonymous visitor hitting "/"
// previously downloaded the entire authenticated app (Dashboard + all its pages)
// before seeing anything. Each of these now loads only once actually navigated to.
const SignInPage = lazy(() => import("../features/auth").then((m) => ({ default: m.SignInPage })));
const SignUpPage = lazy(() => import("../features/auth").then((m) => ({ default: m.SignUpPage })));
const AuthCallbackPage = lazy(() => import("../features/auth").then((m) => ({ default: m.AuthCallbackPage })));
const Dashboard = lazy(() => import("../features/dashboard").then((m) => ({ default: m.Dashboard })));

// Suspense fallback for lazy-loaded routes — matches Dashboard's own background
// gradient so the swap from "loading" to "loaded" doesn't flash a different backdrop.
function RouteFallback() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <div
      className={`min-h-screen flex items-center justify-center transition-colors ${
        isDark
          ? "bg-gradient-to-br from-[#1a1512] via-[#231c17] to-[#2d241d]"
          : "bg-gradient-to-br from-[#c4b5a0] via-[#b8a590] to-[#a89780]"
      }`}
    >
      <div className="w-10 h-10 rounded-full border-2 border-[#c9983a]/30 border-t-[#c9983a] animate-spin" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return children; // let AuthProvider finish initial check
  if (!isAuthenticated) {
    const returnTo = location.pathname + (location.search || "");
    const signinUrl = returnTo ? `/signin?returnTo=${encodeURIComponent(returnTo)}` : "/signin";
    return <Navigate to={signinUrl} replace />;
  }
  return children;
}

export default function App() {
  // Captures "?ref=" from whatever page the user first lands on (landing
  // page, a shared project link, etc.) so it's available later when they
  // actually click Sign in - see shared/api/client.ts getGitHubLoginUrl.
  useEffect(() => {
    captureReferralCodeFromURL();
  }, []);

  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <div className="overflow-x-hidden">
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/signin" element={<SignInPage />} />
                <Route path="/signup" element={<SignUpPage />} />
                <Route path="/auth/callback" element={<AuthCallbackPage />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Suspense>
            <Toast />
            <SupportWidget />
          </div>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
