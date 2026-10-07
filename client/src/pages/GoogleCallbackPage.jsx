import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentSession } from '../api/auth';
import { setToken, clearToken } from '../utils/storage';
import FullPageLoader from '../components/FullPageLoader';

// Google OAuth lands here as `/auth/callback#access_token=...&refresh_token=...`
// (Supabase puts the tokens in the URL fragment). Read them, persist the access
// token, verify the session, then send the user on to the workspace.
function GoogleCallbackPage() {
  const navigate = useNavigate();
  const tokenRef = useRef(null);
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function handleCallback() {
      // Read everything we need off the hash before we clear it.
      const hash = window.location.hash.replace(/^#/, '');
      const params = new URLSearchParams(hash);
      const token = tokenRef.current ?? params.get('access_token');
      const oauthError =
        params.get('error') || params.get('error_description');

      tokenRef.current = token;
      window.history.replaceState(null, '', window.location.pathname);

      if (!token) {
        if (cancelled) return;

        if (oauthError) {
          setErrorMessage(oauthError);
          setStatus('error');
        } else {
          navigate('/sign-in', { replace: true });
        }
        return;
      }

      setToken(token);

      const { user, error } = await getCurrentSession();

      if (cancelled) return;

      if (user) {
        navigate('/workspace', { replace: true });
        return;
      }

      clearToken();

      if (error) {
        setErrorMessage(
          "Couldn't reach the server. Check your connection and try again.",
        );
        setStatus('error');
        return;
      }

      navigate('/sign-in', { replace: true });
    }

    handleCallback();

    return () => {
      cancelled = true;
    };
  }, [navigate, attempt]);

  if (status === 'loading') {
    return <FullPageLoader />;
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream px-6 text-center">
        <p className="text-plum/70">{errorMessage}</p>
        <button
          type="button"
          onClick={() => {
            setStatus('loading');
            setAttempt((n) => n + 1);
          }}
          className="rounded-lg bg-plum px-5 py-2.5 text-sm font-medium text-white transition duration-200 hover:bg-plum/90 active:scale-[0.99]"
        >
          Retry
        </button>
      </div>
    );
  }

  return null;
}

export default GoogleCallbackPage;
