import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelopeOpenText, faCommentDots } from '@fortawesome/free-solid-svg-icons';

function CheckEmailPage() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/80 p-8 max-w-md w-full text-center form-rise">
        {/* Logo */}
        <div className="auth-fade-up flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-plum rounded-lg flex items-center justify-center">
            <FontAwesomeIcon icon={faCommentDots} className="w-6 h-6 text-white" aria-hidden="true" />
          </div>
          <span className="text-xl font-semibold text-plum">Huddle</span>
        </div>

        {/* Icon */}
        <div className="w-16 h-16 bg-plum/10 rounded-full flex items-center justify-center mx-auto mb-6 text-plum">
          <FontAwesomeIcon icon={faEnvelopeOpenText} className="w-7 h-7" />
        </div>

        <h1 className="text-2xl font-bold text-black mb-3">Check your email</h1>
        <p className="text-gray-600 mb-8">
          We've sent a link to your email address. Please check your inbox and follow the
          instructions to continue.
        </p>

        <Link
          to="/sign-in"
          className="block w-full bg-plum hover:bg-plum/90 text-white font-medium py-3 px-6 rounded-lg transition-colors"
        >
          Back to Sign In
        </Link>

        <p className="text-gray-500 text-sm mt-6">
          Didn't receive the email?{' '}
          <Link to="/sign-in" className="text-plum font-semibold hover:underline">
            Return to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default CheckEmailPage;
