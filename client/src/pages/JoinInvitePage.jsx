import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getCurrentSession } from '../api/auth';
import { acceptInvite, getInvite } from '../api/invites';
import { getToken, setPendingInvite, clearPendingInvite } from '../utils/storage';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHashtag, faCommentDots } from '@fortawesome/free-solid-svg-icons';
import Spinner from '../components/Spinner';

function JoinInvitePage() {
  const { code } = useParams();
  const navigate = useNavigate();

  const [channelName, setChannelName] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | needs-auth | accepting | error
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) {
      setStatus('error');
      setError('This invite link is invalid.');
      return;
    }

    // Remember the code so it can be redeemed after sign-in/sign-up.
    setPendingInvite(code);

    // Best-effort: show the channel name if the public endpoint is available.
    getInvite(code)
      .then((data) => setChannelName(data?.channel?.name ?? null))
      .catch(() => {});

    (async () => {
      if (!getToken()) {
        setStatus('needs-auth');
        return;
      }

      const { user } = await getCurrentSession();

      if (!user) {
        setStatus('needs-auth');
        return;
      }

      await acceptAndGo(code);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, navigate]);

  async function acceptAndGo(inviteCode) {
    setStatus('accepting');
    try {
      await acceptInvite(inviteCode);
      clearPendingInvite();
      navigate('/workspace', { replace: true });
    } catch (err) {
      // Already a member — just take them to the workspace.
      if (err?.status === 409) {
        clearPendingInvite();
        navigate('/workspace', { replace: true });
        return;
      }
      setStatus('error');
      setError(err.message || 'Unable to accept this invite.');
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream p-6">
      <div className="auth-fade-up flex items-center gap-2 mb-8">
        <div className="w-10 h-10 bg-plum rounded-lg flex items-center justify-center">
          <FontAwesomeIcon icon={faCommentDots} className="w-6 h-6 text-white" aria-hidden="true" />
        </div>
        <span className="text-xl font-semibold text-plum">Huddle</span>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center form-rise">
        {status === 'loading' || status === 'accepting' ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <Spinner className="h-8 w-8 text-plum" />
            <p className="text-sm text-gray-500">
              {status === 'accepting' ? 'Joining…' : 'Checking invite…'}
            </p>
          </div>
        ) : status === 'needs-auth' ? (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-plum/10 text-plum">
              <FontAwesomeIcon icon={faHashtag} className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-semibold text-plum">You've been invited</h1>
            <p className="mt-2 text-gray-500">
              {channelName ? (
                <>
                  to join{' '}
                  <span className="font-semibold text-gray-700">#{channelName}</span> on
                  Huddle
                </>
              ) : (
                'to join a channel on Huddle'
              )}
              . Sign in or create an account to accept.
            </p>
            <div className="mt-6 space-y-3">
              <Link
                to="/sign-in"
                className="block w-full rounded-lg bg-plum px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-plum/90"
              >
                Sign in
              </Link>
              <Link
                to="/create-account"
                className="block w-full rounded-lg border border-gray-200 px-4 py-3 text-center text-sm font-medium text-plum transition hover:bg-gray-50"
              >
                Create account
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-plum">Couldn't join</h1>
            <p className="mt-2 text-sm text-red-500">{error}</p>
            <div className="mt-6 space-y-3">
              <Link
                to="/sign-in"
                className="block w-full rounded-lg bg-plum px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-plum/90"
              >
                Sign in
              </Link>
              <Link
                to="/create-account"
                className="block w-full rounded-lg border border-gray-200 px-4 py-3 text-center text-sm font-medium text-plum transition hover:bg-gray-50"
              >
                Create account
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default JoinInvitePage;
