import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Splash() {
  const navigate = useNavigate()
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setExiting(true)
    }, 2600)

    const navigateTimer = setTimeout(() => {
      navigate('/onboarding')
    }, 3000)

    return () => {
      clearTimeout(exitTimer)
      clearTimeout(navigateTimer)
    }
  }, [navigate])

  return (
    <div
      className={`splash-root fixed inset-0 z-50 flex items-center justify-center bg-[#3d0e38] text-white ${
        exiting ? 'animate-[splash-fade-out_400ms_ease-in_forwards]' : ''
      }`}
    >
      <div
        className="relative z-10 flex flex-col items-center text-center"
        style={{ animation: 'splash-fade-in 800ms ease-out both' }}
      >
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-xl shadow-indigo-900/20"
          style={{ animation: 'splash-fade-in 800ms ease-out 100ms both' }}
        >
          <svg
            className="h-8 w-8 text-indigo-600"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M5.25 6.75A3.75 3.75 0 0 1 9 3h6a3.75 3.75 0 0 1 3.75 3.75v4.5A3.75 3.75 0 0 1 15 15h-2.9l-4.2 3.15A.75.75 0 0 1 6.75 17.55V15A3.75 3.75 0 0 1 3 11.25v-4.5Z"
              fill="currentColor"
            />
            <path
              d="M9 8.25h6M9 11.25h3.75"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Title */}
        <h1
          className="mt-6 text-5xl font-bold tracking-tight text-white sm:text-6xl"
          style={{ animation: 'splash-fade-in 800ms ease-out 250ms both' }}
        >
          Huddle
        </h1>

        <p
          className="mt-3 text-base font-medium text-white/80 sm:text-lg"
          style={{ animation: 'splash-fade-in 800ms ease-out 400ms both' }}
        >
          Your team, always in sync
        </p>
      </div>
    </div>
  )
}

export default Splash
