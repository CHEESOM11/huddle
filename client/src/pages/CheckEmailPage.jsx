import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';

function CheckEmailPage() {
  return (
    <div className="min-h-screen bg-huddle-light flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-huddle-purple rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
            </svg>
          </div>
          <span className="text-xl font-semibold text-huddle-dark">Huddle</span>
        </div>

        {/* Success Icon */}
        <div className="w-16 h-16 bg-huddle-purple/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <div className="w-12 h-12 bg-huddle-purple rounded-full flex items-center justify-center">
            <FontAwesomeIcon icon={faCheck} className="w-6 h-6 text-white" />
          </div>
        </div>

        <h1 className="text-2xl font-semibold text-huddle-dark mb-3">Check your email</h1>
        <p className="text-gray-500 mb-8">
          We've sent a link to your email address. Please check your inbox and follow the instructions to continue.
        </p>

        {/* Back to Sign In Button */}
        <Link
          to="/sign-in"
          className="block w-full bg-huddle-purple hover:bg-huddle-purple-hover text-white font-medium py-3 px-6 rounded-lg transition-colors"
        >
          Back to Sign In
        </Link>

        {/* Resend Link */}
        <p className="text-gray-500 text-sm mt-6">
          Didn't receive the email?{' '}
          <span className="text-huddle-purple font-medium">Resend</span>
        </p>
      </div>
    </div>
  );
}

export default CheckEmailPage;