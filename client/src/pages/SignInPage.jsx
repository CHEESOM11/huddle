import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { loginUser, getCurrentSession } from '../api/auth';
import { setToken, clearToken, setOnboardingSeen } from '../utils/storage';
import Spinner from '../components/Spinner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const demoUsers = [
  {
    name: 'Alex Johnson',
    email: 'alex@huddle.test',
    note: 'as yourself',
  },
  {
    name: 'Maya Chen',
    email: 'maya@huddle.test',
    note: "see Maya's view",
  },
];

function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const confirmed = location.state?.confirmed === true;

  const validate = () => {
    const nextErrors = {};

    if (!email.trim()) {
      nextErrors.email = 'Email address is required';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      nextErrors.email = 'Enter a valid email address';
    }

    if (!password) {
      nextErrors.password = 'Password is required';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSubmitError('');

    if (!validate()) return;

    setLoading(true);
    try {
      const data = await loginUser({ email: email.trim(), password });
      const token = data?.session?.access_token;

      if (!token) {
        setSubmitError('Unable to start a session. Please try again.');
        return;
      }

      setToken(token);

      const { user, error } = await getCurrentSession();

      if (error) {
        setSubmitError("Couldn't reach the server. Please try again.");
        return;
      }

      if (!user) {
        clearToken();
        setSubmitError('Session could not be verified. Please try again.');
        return;
      }

      setOnboardingSeen();
      navigate('/workspace');
    } catch (err) {
      // TODO(backend): standardize error shape { message | detail | error }
      setSubmitError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (hasError) =>
    `w-full rounded-lg border bg-white px-4 py-3 text-gray-950 transition-all duration-200 placeholder:text-gray-400 focus:border-plum focus:outline-none focus:ring-2 focus:ring-plum/20 ${
      hasError ? 'border-red-500' : 'border-gray-200'
    }`;

  const chooseDemoUser = (user) => {
    setEmail(user.email);
    setPassword('demo123');
    setErrors({});
    setSubmitError('');
  };

  return (
    <main className="flex min-h-screen flex-col bg-cream lg:flex-row">
      <section className="flex min-h-[420px] flex-col bg-plum px-8 py-8 text-cream sm:px-12 lg:min-h-screen lg:w-[47%] lg:px-14 lg:py-10">
        <div className="text-sm font-semibold tracking-wide text-cream/90">•••&nbsp;&nbsp;Huddle</div>

        <div className="mt-14 max-w-xl lg:mt-24">
          <h1 className="text-4xl font-bold leading-tight tracking-normal text-cream sm:text-5xl">
            Your team,
            <span className="block text-lime-300">always in sync</span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-cream/80">
            Huddle keeps remote teams connected through channels — simple, fast, and focused on what matters.
          </p>

          <div className="mt-8 space-y-5">
            <div className="flex gap-4">
              <span className="text-2xl" aria-hidden="true">💬</span>
              <div>
                <p className="font-bold text-cream">Channel conversations</p>
                <p className="text-sm text-cream/65">Organize discussions by topic or project</p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="text-2xl" aria-hidden="true">✉️</span>
              <div>
                <p className="font-bold text-cream">Direct messages</p>
                <p className="text-sm text-cream/65">Private conversations with teammates</p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="text-2xl" aria-hidden="true">🔔</span>
              <div>
                <p className="font-bold text-cream">Smart notifications</p>
                <p className="text-sm text-cream/65">Stay informed without the noise</p>
              </div>
            </div>
          </div>

          <div className="mt-9 rounded-2xl bg-white/10 p-5 text-sm leading-6 text-cream/85 ring-1 ring-white/15">
            <strong className="text-lime-300">Sprint 1 scope:</strong>{' '}
            Account creation, sign in, and channel messaging. Additional features ship in future sprints.
          </div>
        </div>

        <p className="mt-10 text-xs text-cream/45 lg:mt-auto">Huddle — v0.1 sprint prototype</p>
      </section>

      <section className="flex flex-1 items-center justify-center bg-cream px-6 py-10 sm:px-10 lg:w-[53%] lg:py-12">
        <div className="w-full max-w-md form-rise">
          <div>
            <h1 className="text-3xl font-bold tracking-normal text-black">Welcome back</h1>
            <p className="mt-2 text-sm text-gray-600">Sign in to continue to Huddle</p>
          </div>

          {confirmed && (
            <p className="form-message-in mt-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-600">
              Email confirmed. Please sign in to continue.
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) {
                    setErrors((prev) => ({ ...prev, email: undefined }));
                  }
                }}
                required
                className={inputClass(errors.email)}
              />
              {errors.email && (
                <p className="form-message-in mt-1 text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="text-xs font-bold uppercase tracking-wide text-gray-700">
                  Password
                </label>
                <Link to="/forgot-password" className="text-sm font-semibold text-plum hover:underline">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) {
                      setErrors((prev) => ({ ...prev, password: undefined }));
                    }
                  }}
                  required
                  className={`${inputClass(errors.password)} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <span key="show" className="form-icon-in inline-flex">
                      <FontAwesomeIcon icon={faEyeSlash} className="h-5 w-5" />
                    </span>
                  ) : (
                    <span key="hide" className="form-icon-in inline-flex">
                      <FontAwesomeIcon icon={faEye} className="h-5 w-5" />
                    </span>
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="form-message-in mt-1 text-sm text-red-500">{errors.password}</p>
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
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            New to Huddle?{' '}
            <Link to="/create-account" className="font-bold text-plum hover:underline">
              Create account
            </Link>
          </p>

          <div className="mt-8">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Quick demo access</p>
            <div className="mt-3 space-y-2">
              {demoUsers.map((user) => (
                <button
                  key={user.email}
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-left transition hover:border-plum/40 hover:bg-white/80"
                  onClick={() => chooseDemoUser(user)}
                >
                  <span className="font-semibold text-black">{user.name}</span>
                  <span className="text-sm text-gray-500">{user.note}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default SignInPage;
