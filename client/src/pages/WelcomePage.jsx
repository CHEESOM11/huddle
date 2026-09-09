import { useNavigate } from 'react-router-dom';

function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-huddle-light flex flex-col">
      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-8">
        {/* Huddle Logo */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-huddle-purple rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
            </svg>
          </div>
          <span className="text-xl font-semibold text-huddle-dark">Huddle</span>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          {/* Success Icon */}
          <div className="w-16 h-16 bg-huddle-purple rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Welcome Text */}
          <h1 className="text-2xl font-semibold text-huddle-dark mb-3">
            Welcome to Huddle, Alex!
          </h1>
          <p className="text-gray-500 mb-8">
            Your account has been created successfully. You're all set to start collaborating with your team.
          </p>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => navigate('/workspace')}
              className="w-full bg-huddle-purple hover:bg-huddle-purple-hover text-white font-medium py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Go to Workspace
            </button>
            <button
              onClick={() => navigate('/profile-setup')}
              className="w-full border-2 border-gray-200 hover:border-huddle-purple text-huddle-dark font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Set up profile
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-gray-400 text-sm">
        © 2024 Huddle Inc. All rights reserved.
      </footer>
    </div>
  );
}

export default WelcomePage;