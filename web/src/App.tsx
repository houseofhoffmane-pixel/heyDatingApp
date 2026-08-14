import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './stores/auth';
import { AppShell } from './components/AppShell';

// Auth
import { Splash } from './screens/auth/Splash';
import { Phone } from './screens/auth/Phone';
import { Otp } from './screens/auth/Otp';
import { EmailLogin } from './screens/auth/EmailLogin';

// Onboarding
import { OnboardingFlow } from './screens/onboarding/OnboardingFlow';

// Main
import { Discover } from './screens/main/Discover';
import { ProfileDetail } from './screens/main/ProfileDetail';
import { Places } from './screens/main/Places';
import { PlaceDetail } from './screens/main/PlaceDetail';
import { Events } from './screens/main/Events';
import { EventDetail } from './screens/main/EventDetail';
import { Chats } from './screens/main/Chats';
import { Chat } from './screens/main/Chat';
import { Me } from './screens/main/Me';
import { Settings } from './screens/main/Settings';

/**
 * Top-level router. Three zones:
 *   - Public: /splash /phone /otp /login/email
 *   - Onboarding: /onboarding (its own multi-step shell)
 *   - Main (inside AppShell): /discover /places /events /chats /me + details
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
      <Route path="/phone" element={authed ? <Navigate to={onboarding ? '/onboarding' : '/discover'} replace /> : <Phone />} />
      <Route path="/otp" element={authed ? <Navigate to={onboarding ? '/onboarding' : '/discover'} replace /> : <Otp />} />
      <Route path="/login/email" element={authed ? <Navigate to={onboarding ? '/onboarding' : '/discover'} replace /> : <EmailLogin />} />

      {/* Onboarding */}
      <Route path="/onboarding/*" element={authed ? <OnboardingFlow /> : <Navigate to="/splash" replace />} />

      {/* Main app */}
      <Route element={<AppShell />}>
        <Route path="/discover" element={<Discover />} />
        <Route path="/profile/:userId" element={<ProfileDetail />} />
        <Route path="/places" element={<Places />} />
        <Route path="/places/:id" element={<PlaceDetail />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<EventDetail />} />
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
