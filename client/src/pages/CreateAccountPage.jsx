import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser, getCurrentSession } from '../api/auth';
import { setToken, clearToken } from '../utils/storage';
import Spinner from '../components/Spinner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { faGoogle } from '@fortawesome/free-brands-svg-icons';

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

      {/* Create Account Card */}
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full form-rise">
        <h1 className="text-2xl font-semibold text-huddle-dark text-center mb-2">Create Account</h1>
        <p className="text-gray-500 text-center mb-6">Start collaborating with your team</p>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Full Name Field */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="fullName"
              type="text"
              placeholder="John Doe"
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
              <p className="form-message-in text-sm text-red-500 mt-1">{errors.fullName}</p>
            )}
          </div>

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
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password <span className="text-red-500">*</span>
            </label>
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

          {/* Create Account Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-huddle-purple hover:bg-huddle-purple-hover disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition duration-200 active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Spinner />
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-gray-200"></div>
          <span className="text-xs text-gray-400 uppercase">or continue with</span>
          <div className="flex-1 h-px bg-gray-200"></div>
        </div>

        {/* Google Sign Up */}
        <button className="w-full border-2 border-gray-200 hover:border-gray-300 text-huddle-dark font-medium py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition duration-200 active:scale-[0.99]">
          <FontAwesomeIcon icon={faGoogle} className="w-5 h-5" />
          Sign up with Google
        </button>

        {/* Sign In Link */}
        <p className="text-center text-gray-500 text-sm mt-6">
          Already have an account?{' '}
          <Link to="/sign-in" className="text-huddle-purple font-medium hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

export default CreateAccountPage;