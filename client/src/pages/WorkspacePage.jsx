import { useNavigate } from 'react-router-dom';
import { clearToken } from '../utils/storage';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBuilding } from '@fortawesome/free-solid-svg-icons';

function WorkspacePage() {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearToken();
    navigate('/');
  };

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
            onClick={handleLogout}
            className="text-gray-500 hover:text-huddle-purple transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-semibold text-huddle-dark mb-6">Workspace</h1>
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-huddle-purple/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <FontAwesomeIcon icon={faBuilding} className="w-8 h-8 text-huddle-purple" />
          </div>
          <h2 className="text-xl font-medium text-huddle-dark mb-2">Your workspace is ready</h2>
          <p className="text-gray-500">Start collaborating with your team members.</p>
        </div>
      </main>
    </div>
  );
}

export default WorkspacePage;