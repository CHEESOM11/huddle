function ForgotPasswordPage() {
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Reset link sent');
  };

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

        <h1 className="text-2xl font-semibold text-huddle-dark mb-2">Forgot Password?</h1>
        <p className="text-gray-500 mb-8">
          Enter your email address and we'll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              placeholder="name@company.com"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-huddle-purple"
            />
          </div>

          {/* Send Reset Link Button */}
          <button
            type="submit"
            className="w-full bg-huddle-purple hover:bg-huddle-purple-hover text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Send Reset Link
          </button>
        </form>

        {/* Back to Sign In */}
        <p className="text-gray-500 text-sm mt-6">
          Remembered your password?{' '}
          <span className="text-huddle-purple font-medium">Back to Sign In</span>
        </p>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;