import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Splash from './pages/splash';
import WelcomePage from './pages/WelcomePage';
import SignInPage from './pages/SignInPage';
import CreateAccountPage from './pages/CreateAccountPage';
import CheckEmailPage from './pages/CheckEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import Onboarding from './pages/Onboarding';
import ProfileSetupPage from './pages/ProfileSetupPage';
import WorkspacePage from './pages/WorkspacePage';
import ConfirmEmailPage from './pages/ConfirmEmailPage';
import { getCurrentSession } from './api/auth';
import { getToken, clearToken, hasSeenOnboarding } from './utils/storage';
import FullPageLoader from './components/FullPageLoader';

function StartupGate() {
  const [state, setState] = useState('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      if (!getToken()) {
        if (!cancelled) {
          setState('unauthenticated');
        }
        return;
      }

      const { user, error } = await getCurrentSession();

      if (cancelled) {
        return;
      }

      if (error) {
        setState('error');
        return;
      }

      if (user) {
        setState('authenticated');
        return;
      }

      clearToken();
      setState('unauthenticated');
    }

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (state === 'loading') {
    return <FullPageLoader />;
  }

  if (state === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-huddle-light px-6 text-center">
        <p className="text-gray-600">
          Couldn't reach the server. Check your connection and try again.
        </p>
        <button
          type="button"
          onClick={() => {
            setState('loading');
            setAttempt((n) => n + 1);
          }}
          className="rounded-lg bg-huddle-purple px-5 py-2.5 text-sm font-medium text-white transition duration-200 hover:bg-huddle-purple-hover active:scale-[0.99]"
        >
          Retry
        </button>
      </div>
    );
  }

  if (state === 'authenticated') {
    return <Navigate to="/workspace" replace />;
  }

  if (hasSeenOnboarding()) {
    return <Navigate to="/sign-in" replace />;
  }

  return <Splash />;
}

function RequireAuth({ children }) {
  const [state, setState] = useState('loading');

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      if (!getToken()) {
        if (!cancelled) {
          setState('unauthenticated');
        }
        return;
      }

      const { user, error } = await getCurrentSession();

      if (cancelled) {
        return;
      }

      if (user) {
        setState('authenticated');
        return;
      }

      if (!error) {
        clearToken();
      }

      setState('unauthenticated');
    }

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state === 'loading') {
    return <FullPageLoader />;
  }

  if (state !== 'authenticated') {
    return <Navigate to="/sign-in" replace />;
  }

  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<StartupGate />} />
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/create-account" element={<CreateAccountPage />} />
        <Route path="/check-email" element={<CheckEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/confirm-email" element={<ConfirmEmailPage />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/profile-setup" element={<ProfileSetupPage />} />
        <Route
          path="/workspace"
          element={
            <RequireAuth>
              <WorkspacePage />
            </RequireAuth>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;