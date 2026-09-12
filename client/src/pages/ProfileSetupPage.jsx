import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faArrowRight, faCommentDots } from '@fortawesome/free-solid-svg-icons';

function ProfileSetupPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="auth-fade-up bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-plum rounded-lg flex items-center justify-center">
              <FontAwesomeIcon icon={faCommentDots} className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <span className="text-lg font-semibold text-plum">Huddle</span>
          </div>
          <button
            onClick={() => navigate('/')}
            className="text-gray-500 hover:text-plum transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-semibold text-plum mb-6">Profile Setup</h1>
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md mx-auto form-rise">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-plum/10 rounded-full mx-auto mb-4 flex items-center justify-center">
              <FontAwesomeIcon icon={faUser} className="w-10 h-10 text-plum" />
            </div>
            <h2 className="text-xl font-medium text-plum">Complete your profile</h2>
            <p className="text-gray-500 text-sm">Add a photo and tell us about yourself</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
              <input
                type="text"
                placeholder="Your name"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-plum focus:ring-2 focus:ring-plum/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea
                rows={3}
                placeholder="Tell us about yourself..."
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-plum focus:ring-2 focus:ring-plum/20 resize-none"
              />
            </div>
            <button
              onClick={() => navigate('/workspace')}
              className="w-full bg-plum hover:bg-plum/90 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              Save Profile
              <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ProfileSetupPage;
