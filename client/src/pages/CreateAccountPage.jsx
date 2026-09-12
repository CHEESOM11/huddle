import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser, getCurrentSession } from '../api/auth';
import { setToken, clearToken } from '../utils/storage';
import Spinner from '../components/Spinner';
import Typewriter from '../components/Typewriter';
import AuthBubbles from '../components/AuthBubbles';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash, faComments, faEnvelope, faBell } from '@fortawesome/free-solid-svg-icons';
import { faCommentDots as faCommentDotsRegular } from '@fortawesome/free-regular-svg-icons';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function CreateAccountPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const validate = () => {
    const nextErrors = {};

    if (!fullName.trim()) {
      nextErrors.fullName = 'Full name is required';
    }

    if (!email.trim()) {
      nextErrors.email = 'Email address is required';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      nextErrors.email = 'Enter a valid email address';
    }

    if (!password) {
      nextErrors.password = 'Password is required';
    } else if (password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters';
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
      const data = await registerUser({ name: fullName.trim(), email: email.trim(), password });
      const token = data?.session?.access_token;

      if (token) {
        setToken(token);

        const { user, error } = await getCurrentSession();

        if (user) {
          navigate('/workspace');
          return;
        }

        if (!error) {
          clearToken();
        } else {
          setSubmitError("Couldn't reach the server. Please try again.");
          return;
        }
      }

      navigate('/check-email');
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

  return (
    <main className="flex min-h-screen flex-col bg-cream lg:flex-row">
      <section className="relative isolate flex min-h-[420px] flex-col overflow-hidden bg-plum px-8 py-8 text-cream sm:px-12 lg:min-h-screen lg:w-[47%] lg:px-14 lg:py-10 auth-panel-in">
        <AuthBubbles />

        <div className="flex items-center gap-2.5">
          <FontAwesomeIcon icon={faCommentDotsRegular} className="h-8 w-8 text-white" aria-hidden="true" />
          <span className="text-lg font-semibold tracking-wide text-cream/90">Huddle</span>
        </div>

        <div className="auth-fade-up d1 mt-14 max-w-xl lg:mt-24">
          <h1 className="text-4xl font-bold leading-tight tracking-normal text-cream sm:text-5xl">
            Your team,
            <span className="block min-h-[1.25em] text-lime-300">
              <Typewriter />
            </span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-cream/80">
            Huddle keeps remote teams connected through channels — simple, fast, and focused on what matters.
          </p>

          <div className="mt-8 space-y-5">
            <div className="flex gap-4">
              <FontAwesomeIcon icon={faComments} className="text-2xl text-lime-300" aria-hidden="true" />
              <div>
                <p className="font-bold text-cream">Channel conversations</p>
                <p className="text-sm text-cream/65">Organize discussions by topic or project</p>
              </div>
            </div>
            <div className="flex gap-4">
              <FontAwesomeIcon icon={faEnvelope} className="text-2xl text-lime-300" aria-hidden="true" />
              <div>
                <p className="font-bold text-cream">Direct messages</p>
                <p className="text-sm text-cream/65">Private conversations with teammates</p>
              </div>
            </div>
            <div className="flex gap-4">
              <FontAwesomeIcon icon={faBell} className="text-2xl text-lime-300" aria-hidden="true" />
              <div>
                <p className="font-bold text-cream">Smart notifications</p>
                <p className="text-sm text-cream/65">Stay informed without the noise</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      <section className="flex flex-1 items-center justify-center bg-cream px-6 py-10 sm:px-10 lg:w-[53%] lg:py-12">
        <div className="w-full max-w-md form-rise">
          <div>
            <h1 className="text-3xl font-bold tracking-normal text-black">Create your account</h1>
            <p className="mt-2 text-sm text-gray-600">Join your team on Huddle</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
            <div>
              <label htmlFor="fullName" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-700">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                placeholder="FullName"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (errors.fullName) {
                    setErrors((prev) => ({ ...prev, fullName: undefined }));
                  }
                }}
                required
                className={inputClass(errors.fullName)}
              />
              {errors.fullName && (
                <p className="form-message-in mt-1 text-sm text-red-500">{errors.fullName}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="name@gmail.com"
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
              <label htmlFor="password" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 8 characters"
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
                  Creating account...
                </>
              ) : (
                'Create account & join'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/sign-in" className="font-bold text-plum hover:underline">
              Sign in
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}

export default CreateAccountPage;
