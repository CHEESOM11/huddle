import { useState } from 'react'
import HuddleLogo from '../components/HuddleLogo'

function Signup({ onSignIn, onGoogleSignUp }) {
  const [showPassword, setShowPassword] = useState(false)
  const [authMessage, setAuthMessage] = useState('')

  const handleGoogleSignUp = () => {
    if (onGoogleSignUp) {
      onGoogleSignUp()
      return
    }

    setAuthMessage('Google sign-up is not configured yet.')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-3 py-4 sm:px-5 sm:py-6">
      <section className="w-full max-w-[432px] rounded-3xl bg-white p-4 text-center shadow-xl shadow-gray-200/80 sm:p-6">
        <div className="flex items-center justify-center gap-2 pt-2">
          <HuddleLogo />
          <span className="text-xl font-bold tracking-normal text-[#0F172A]">
            Huddle
          </span>
        </div>

        <h1 className="mt-8 text-3xl font-extrabold leading-tight tracking-normal text-gray-950">
          Create your account
        </h1>
        <p className="mt-2 text-base leading-6 text-gray-500">
          Start collaborating with your team today
        </p>

        <form className="mt-8 space-y-4 text-left" onSubmit={(event) => event.preventDefault()}>
          <label className="block">
            <span className="text-sm font-semibold text-gray-800">
              Full Name
            </span>
            <input
              type="text"
              placeholder="Enter your full name"
              className="mt-2 h-12 w-full rounded-xl border border-gray-200 px-4 text-base text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-gray-800">
              Email Address
            </span>
            <input
              type="email"
              placeholder="name@company.com"
              className="mt-2 h-12 w-full rounded-xl border border-gray-200 px-4 text-base text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-gray-800">
              Password
            </span>
            <span className="mt-2 flex h-12 w-full items-center rounded-xl border border-gray-200 transition focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
              <input
                type={showPassword ? 'text' : 'password'}
                className="h-full min-w-0 flex-1 rounded-xl px-4 text-base text-gray-950 outline-none placeholder:text-gray-400"
                aria-label="Password"
              />
              <button
                type="button"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-gray-400 transition hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? (
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M2.25 12s3.5-6 9.75-6 9.75 6 9.75 6-3.5 6-9.75 6-9.75-6-9.75-6Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 15.25A3.25 3.25 0 1 0 12 8.75a3.25 3.25 0 0 0 0 6.5Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="m3.75 3.75 16.5 16.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <path
                      d="M9.9 5.45A10.7 10.7 0 0 1 12 5.25c6.25 0 9.75 6.75 9.75 6.75a18.3 18.3 0 0 1-3.03 3.85M6.38 6.95C3.74 8.76 2.25 12 2.25 12s3.5 6.75 9.75 6.75c1.66 0 3.11-.48 4.34-1.16"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9.88 9.88a3 3 0 0 0 4.24 4.24"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </button>
            </span>
          </label>

          <button
            type="submit"
            className="h-12 w-full rounded-xl bg-[#4F46E5] px-4 text-base font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Create Account
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-gray-200" />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Or continue with
          </span>
          <span className="h-px flex-1 bg-gray-200" />
        </div>

        <button
          type="button"
          className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 text-base font-bold text-gray-800 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          aria-describedby={authMessage ? 'google-auth-message' : undefined}
          onClick={handleGoogleSignUp}
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M21.6 12.23c0-.74-.07-1.45-.19-2.13H12v4.03h5.38a4.6 4.6 0 0 1-1.99 3.02v2.52h3.23c1.9-1.74 2.98-4.3 2.98-7.44Z"
              fill="#4285F4"
            />
            <path
              d="M12 22c2.7 0 4.96-.9 6.62-2.43l-3.23-2.52c-.9.6-2.04.95-3.39.95-2.6 0-4.8-1.76-5.59-4.12H3.07v2.6A10 10 0 0 0 12 22Z"
              fill="#34A853"
            />
            <path
              d="M6.41 13.88A6 6 0 0 1 6.1 12c0-.65.11-1.28.31-1.88v-2.6H3.07A10 10 0 0 0 2 12c0 1.61.39 3.14 1.07 4.48l3.34-2.6Z"
              fill="#FBBC05"
            />
            <path
              d="M12 6c1.47 0 2.78.5 3.82 1.5l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.52l3.34 2.6C7.2 7.76 9.4 6 12 6Z"
              fill="#EA4335"
            />
          </svg>
          Sign up with Google
        </button>

        {authMessage && (
          <p id="google-auth-message" className="mt-3 text-sm text-gray-500">
            {authMessage}
          </p>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <button
            type="button"
            className="font-bold text-indigo-600 transition hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            onClick={onSignIn}
          >
            Sign In
          </button>
        </p>
      </section>
    </main>
  )
}

export default Signup
