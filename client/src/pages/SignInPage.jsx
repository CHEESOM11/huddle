import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { loginUser, getCurrentSession } from '../api/auth';
import { setToken, clearToken, setOnboardingSeen } from '../utils/storage';
import Spinner from '../components/Spinner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { faGoogle } from '@fortawesome/free-brands-svg-icons';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    `w-full px-4 py-3 border rounded-lg transition-all duration-200 focus:outline-none focus:border-huddle-purple focus:ring-2 focus:ring-huddle-purple/20 ${
      hasError ? 'border-red-500' : 'border-gray-200'
    }`;

  return (
    <div className="min-h-screen bg-huddle-light flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-10 h-10 bg-huddle-purple rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
          </svg>
        </div>
        <span className="text-xl font-semibold text-huddle-dark">Huddle</span>
      </div>

      {/* Sign In Card */}
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full form-rise">
        <h1 className="text-2xl font-semibold text-huddle-dark text-center mb-2">Welcome back</h1>
        <p className="text-gray-500 text-center mb-6">Enter your details to access your workspace</p>

        {confirmed && (
          <p className="form-message-in text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-4">
            Email confirmed. Please sign in to continue.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              placeholder="name@company.com"
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
              <p className="form-message-in text-sm text-red-500 mt-1">{errors.email}</p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password <span className="text-red-500">*</span>
              </label>
              <Link to="/forgot-password" className="text-sm text-huddle-purple hover:underline">Forgot Password?</Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <span key="show" className="form-icon-in inline-flex">
                    <FontAwesomeIcon icon={faEyeSlash} className="w-5 h-5" />
                  </span>
                ) : (
                  <span key="hide" className="form-icon-in inline-flex">
                    <FontAwesomeIcon icon={faEye} className="w-5 h-5" />
                  </span>
                )}
              </button>
            </div>
            {errors.password && (
              <p className="form-message-in text-sm text-red-500 mt-1">{errors.password}</p>
            )}
          </div>

          {submitError && (
            <p className="form-message-in text-sm text-red-500">{submitError}</p>
          )}

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-huddle-purple hover:bg-huddle-purple-hover disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition duration-200 active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Spinner />
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-gray-200"></div>
          <span className="text-xs text-gray-400 uppercase">or continue with</span>
          <div className="flex-1 h-px bg-gray-200"></div>
        </div>

        {/* Google Sign In */}
        <button className="w-full border-2 border-gray-200 hover:border-gray-300 text-huddle-dark font-medium py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition duration-200 active:scale-[0.99]">
          <FontAwesomeIcon icon={faGoogle} className="w-5 h-5" />
          Sign in with Google
        </button>

        {/* Create Account Link */}
        <p className="text-center text-gray-500 text-sm mt-6">
          Don't have an account?{' '}
          <Link to="/create-account" className="text-huddle-purple font-medium hover:underline">
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default SignInPage;