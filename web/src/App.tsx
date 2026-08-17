import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './stores/auth';
import { AppShell } from './components/AppShell';

// Auth
import { Splash } from './screens/auth/Splash';
import { EmailSignup } from './screens/auth/EmailSignup';
import { EmailLogin } from './screens/auth/EmailLogin';
// Phone/OTP flow is commented out until SMS provider (Twilio/Firebase)
// is wired up. Uncomment these two imports + the routes below when
// bringing OTP back.
// import { Phone } from './screens/auth/Phone';
// import { Otp } from './screens/auth/Otp';

// Onboarding
import { OnboardingFlow } from './screens/onboarding/OnboardingFlow';

// Main
import { Discover } from './screens/main/Discover';
import { ProfileDetail } from './screens/main/ProfileDetail';
import { Chats } from './screens/main/Chats';
import { Chat } from './screens/main/Chat';
import { Me } from './screens/main/Me';
import { Settings } from './screens/main/Settings';

/**
 * Top-level router. Three zones:
 *   - Public: /splash /signup /login/email
 *   - Onboarding: /onboarding (its own multi-step shell)
 *   - Main (inside AppShell): /discover /chats /me + details
 *
 * Auth is email + password only right now. Phone/OTP will come back
 * when SMS provider is wired up — see the commented imports above.
 * Any /phone or /otp URL redirects to /signup so old bookmarks still
 * land somewhere useful.
 *
 * Places + Events routes were removed with those modules in Sprint 1.
 *
 * Redirects:
 *   - No user + protected route → /splash
 *   - user.status='onboarding' + main route → /onboarding
 */
export function App() {
  const user = useAuthStore((s) => s.user);
  const authed = !!user;
  const onboarding = user?.status === 'onboarding';

  return (
    <Routes>
      {/* Public */}
      <Route path="/splash" element={authed ? <Navigate to={onboarding ? '/onboarding' : '/discover'} replace /> : <Splash />} />
      <Route path="/signup" element={authed ? <Navigate to={onboarding ? '/onboarding' : '/discover'} replace /> : <EmailSignup />} />
      <Route path="/login/email" element={authed ? <Navigate to={onboarding ? '/onboarding' : '/discover'} replace /> : <EmailLogin />} />
      {/* Phone/OTP disabled until SMS is wired — old links go to signup. */}
      <Route path="/phone" element={<Navigate to="/signup" replace />} />
      <Route path="/otp" element={<Navigate to="/signup" replace />} />

      {/* Onboarding */}
      <Route path="/onboarding/*" element={authed ? <OnboardingFlow /> : <Navigate to="/splash" replace />} />

      {/* Main app */}
      <Route element={<AppShell />}>
        <Route path="/discover" element={<Discover />} />
        <Route path="/profile/:userId" element={<ProfileDetail />} />
        <Route path="/chats" element={<Chats />} />
        <Route path="/chats/:matchId" element={<Chat />} />
        <Route path="/me" element={<Me />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* Root */}
      <Route path="/" element={<Navigate to={authed ? (onboarding ? '/onboarding' : '/discover') : '/splash'} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
