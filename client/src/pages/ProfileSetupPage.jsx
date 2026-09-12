import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';

function ProfileSetupPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-huddle-light">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-huddle-purple rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
              </svg>
            </div>
            <span className="text-lg font-semibold text-huddle-dark">Huddle</span>
          </div>
          <button
            onClick={() => navigate('/')}
            className="text-gray-500 hover:text-huddle-purple transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-semibold text-huddle-dark mb-6">Profile Setup</h1>
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md mx-auto">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
              <FontAwesomeIcon icon={faUser} className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-xl font-medium text-huddle-dark">Complete your profile</h2>
            <p className="text-gray-500 text-sm">Add a photo and tell us about yourself</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
              <input
                type="text"
                defaultValue="Alex"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-huddle-purple"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea
                rows={3}
                placeholder="Tell us about yourself..."
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-huddle-purple resize-none"
              />
            </div>
            <button
              onClick={() => navigate('/workspace')}
              className="w-full bg-huddle-purple hover:bg-huddle-purple-hover text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Save Profile
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ProfileSetupPage;