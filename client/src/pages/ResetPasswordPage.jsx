import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { resetPassword } from '../api/auth';
import { getToken, setToken, clearToken } from '../utils/storage';
import Spinner from '../components/Spinner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faEye, faEyeSlash, faCommentDots } from '@fortawesome/free-solid-svg-icons';

function getTokenFromHash() {
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return null;
  return new URLSearchParams(hash).get('access_token');
}

function ResetPasswordPage() {
  const navigate = useNavigate();
  const tokenRef = useRef(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [missingToken, setMissingToken] = useState(false);

  useEffect(() => {
    tokenRef.current = tokenRef.current ?? getTokenFromHash() ?? getToken();

    if (tokenRef.current) {
      window.history.replaceState(null, '', window.location.pathname);
      setToken(tokenRef.current);
    } else {
      setMissingToken(true);
    }
  }, []);

  const validate = () => {
    const nextErrors = {};

    if (!password) {
      nextErrors.password = 'New password is required';
    } else if (password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters';
    }

    if (!confirm) {
      nextErrors.confirm = 'Please confirm your new password';
    } else if (confirm !== password) {
      nextErrors.confirm = 'Passwords do not match';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSubmitError('');

    if (!tokenRef.current) {
      setMissingToken(true);
      return;
    }

    if (!validate()) return;

    setLoading(true);
    try {
      await resetPassword({ password });
      clearToken();
      navigate('/sign-in', { replace: true, state: { passwordReset: true } });
    } catch (err) {
      setSubmitError(err.message || 'Unable to reset your password.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field) =>
    `w-full rounded-lg border bg-white px-4 py-3 text-gray-950 transition-all duration-200 placeholder:text-gray-400 focus:border-plum focus:outline-none focus:ring-2 focus:ring-plum/20 ${
      errors[field] ? 'border-red-500' : 'border-gray-200'
    }`;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-cream px-6 py-10">
      <div className="w-full max-w-md form-rise">
        {/* Logo */}
        <div className="auth-fade-up mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-plum">
            <FontAwesomeIcon icon={faCommentDots} className="h-6 w-6 text-white" aria-hidden="true" />
          </div>
          <span className="text-xl font-semibold text-plum">Huddle</span>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-lg shadow-gray-200/80">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-plum/10 text-plum">
            <FontAwesomeIcon icon={faLock} className="h-6 w-6" />
          </div>

          <h1 className="text-2xl font-bold text-black">Set a new password</h1>
          <p className="mt-2 text-sm text-gray-600">
            Choose a new password for your account. It must be at least 8 characters.
          </p>

          {missingToken ? (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              This reset link is invalid or has expired.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-700"
                >
                  New password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={show ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) {
                        setErrors((prev) => ({ ...prev, password: undefined }));
                      }
                    }}
                    required
                    className={inputClass('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-plum"
                    aria-label={show ? 'Hide password' : 'Show password'}
                  >
                    <FontAwesomeIcon icon={show ? faEyeSlash : faEye} className="h-4 w-4" />
                  </button>
                </div>
                {errors.password && (
                  <p className="form-message-in mt-1 text-sm text-red-500">{errors.password}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="confirm"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-700"
                >
                  Confirm password
                </label>
                <input
                  id="confirm"
                  type={show ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => {
                    setConfirm(e.target.value);
                    if (errors.confirm) {
                      setErrors((prev) => ({ ...prev, confirm: undefined }));
                    }
                  }}
                  required
                  className={inputClass('confirm')}
                />
                {errors.confirm && (
                  <p className="form-message-in mt-1 text-sm text-red-500">{errors.confirm}</p>
                )}
              </div>

              {submitError && (
                <p className="form-message-in text-sm text-red-500">{submitError}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-plum px-6 py-3 font-medium text-white transition duration-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Spinner />
                    Updating...
                  </>
                ) : (
                  'Update password'
                )}
              </button>
            </form>
          )}
        </div>

        <Link
          to="/forgot-password"
          className="mt-6 inline-flex items-center justify-center gap-2 text-sm font-semibold text-plum transition hover:underline"
        >
          Request a new link
        </Link>
      </div>
    </main>
  );
}

export default ResetPasswordPage;
