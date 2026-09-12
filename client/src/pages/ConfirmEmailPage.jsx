import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentSession } from '../api/auth';
import { setToken, clearToken } from '../utils/storage';
import FullPageLoader from '../components/FullPageLoader';

function getTokenFromHash() {
  const hash = window.location.hash.replace(/^#/, '');

  if (!hash) {
    return null;
  }

  return new URLSearchParams(hash).get('access_token');
}

function ConfirmEmailPage() {
  const navigate = useNavigate();
  const tokenRef = useRef(null);
  const [status, setStatus] = useState('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function handleConfirmation() {
      tokenRef.current = tokenRef.current ?? getTokenFromHash();

      window.history.replaceState(null, '', window.location.pathname);

      if (!tokenRef.current) {
        if (!cancelled) {
          navigate('/sign-in', { replace: true, state: { confirmed: true } });
        }
        return;
      }

      setToken(tokenRef.current);

      const { user, error } = await getCurrentSession();

      if (cancelled) {
        return;
      }

      if (user) {
        navigate('/workspace', { replace: true });
        return;
      }

      clearToken();

      if (error) {
        setStatus('error');
        return;
      }

      navigate('/sign-in', { replace: true, state: { confirmed: true } });
    }

    handleConfirmation();

    return () => {
      cancelled = true;
    };
  }, [navigate, attempt]);

  if (status === 'loading') {
    return <FullPageLoader />;
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-huddle-light px-6 text-center">
        <p className="text-gray-600">
          Couldn't reach the server. Check your connection and try again.
        </p>
        <button
          type="button"
          onClick={() => {
            setStatus('loading');
            setAttempt((n) => n + 1);
          }}
          className="rounded-lg bg-huddle-purple px-5 py-2.5 text-sm font-medium text-white transition duration-200 hover:bg-huddle-purple-hover active:scale-[0.99]"
        >
          Retry
        </button>
      </div>
    );
  }

  return null;
}

export default ConfirmEmailPage;