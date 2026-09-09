import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { forgotPassword } from '../api/auth';
import Spinner from '../components/Spinner';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const validate = () => {
    const nextErrors = {};

    if (!email.trim()) {
      nextErrors.email = 'Email address is required';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      nextErrors.email = 'Enter a valid email address';
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
      await forgotPassword({ email: email.trim() });
      navigate('/check-email');
    } catch (err) {
      // TODO(backend): standardize error shape { message | detail | error }
      setSubmitError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full px-4 py-3 border rounded-lg transition-all duration-200 focus:outline-none focus:border-huddle-purple focus:ring-2 focus:ring-huddle-purple/20';

  return (
    <div className="min-h-screen bg-huddle-light flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center form-rise">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-huddle-purple rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
            </svg>
          </div>
          <span className="text-xl font-semibold text-huddle-dark">Huddle</span>
        </div>

        <h1 className="text-2xl font-semibold text-huddle-dark mb-2">Forgot Password?</h1>
        <p className="text-gray-500 mb-8">
          Enter your email address and we'll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 text-left" noValidate>
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
              className={`${inputClass} ${errors.email ? 'border-red-500' : 'border-gray-200'}`}
            />
            {errors.email && (
              <p className="form-message-in text-sm text-red-500 mt-1">{errors.email}</p>
            )}
          </div>

          {submitError && (
            <p className="form-message-in text-sm text-red-500">{submitError}</p>
          )}

          {/* Send Reset Link Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-huddle-purple hover:bg-huddle-purple-hover disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition duration-200 active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Spinner />
                Sending...
              </>
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>

        {/* Back to Sign In */}
        <p className="text-gray-500 text-sm mt-6">
          Remembered your password?{' '}
          <Link to="/sign-in" className="text-huddle-purple font-medium hover:underline">
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;