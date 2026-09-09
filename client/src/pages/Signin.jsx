import { useState } from 'react'
import HuddleLogo from '../components/HuddleLogo'

function Signin({ onCreateAccount }) {
  const [showPassword, setShowPassword] = useState(false)

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
          Sign in
        </h1>
        <p className="mt-2 text-base leading-6 text-gray-500">
          Continue collaborating with your team
        </p>

        <form className="mt-8 space-y-4 text-left">
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
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d={showPassword ? 'M2.25 12s3.5-6 9.75-6 9.75 6 9.75 6-3.5 6-9.75 6-9.75-6-9.75-6Z' : 'm3.75 3.75 16.5 16.5'}
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {showPassword ? (
                    <path
                      d="M12 15.25A3.25 3.25 0 1 0 12 8.75a3.25 3.25 0 0 0 0 6.5Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                  ) : (
                    <>
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
                    </>
                  )}
                </svg>
              </button>
            </span>
          </label>

          <button
            type="submit"
            className="h-12 w-full rounded-xl bg-[#4F46E5] px-4 text-base font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Sign In
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Need an account?{' '}
          <button
            type="button"
            className="font-bold text-indigo-600 transition hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            onClick={onCreateAccount}
          >
            Create Account
          </button>
        </p>
      </section>
    </main>
  )
}

export default Signin
