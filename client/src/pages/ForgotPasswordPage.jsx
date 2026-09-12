import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { forgotPassword } from '../api/auth';
import Spinner from '../components/Spinner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faArrowLeft, faCommentDots } from '@fortawesome/free-solid-svg-icons';

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
      setSubmitError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = `w-full rounded-lg border bg-white px-4 py-3 text-gray-950 transition-all duration-200 placeholder:text-gray-400 focus:border-plum focus:outline-none focus:ring-2 focus:ring-plum/20 ${
    errors.email ? 'border-red-500' : 'border-gray-200'
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
            <FontAwesomeIcon icon={faEnvelope} className="h-6 w-6" />
          </div>

          <h1 className="text-2xl font-bold text-black">Forgot password?</h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter your email address and we'll send you a link to reset your password.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-700">
                Email address
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
                className={inputClass}
              />
              {errors.email && (
                <p className="form-message-in mt-1 text-sm text-red-500">{errors.email}</p>
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
                  Sending...
                </>
              ) : (
                'Send reset link'
              )}
            </button>
          </form>
        </div>

        <Link
          to="/sign-in"
          className="mt-6 inline-flex items-center justify-center gap-2 text-sm font-semibold text-plum transition hover:underline"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      </div>
    </main>
  );
}

export default ForgotPasswordPage;
