import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCommentDots } from '@fortawesome/free-solid-svg-icons'

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
          className="relative"
          style={{ animation: 'splash-fade-in 800ms ease-out 100ms both' }}
        >
          <span className="splash-ping" style={{ animationDelay: '0ms' }} aria-hidden="true" />
          <span className="splash-ping" style={{ animationDelay: '600ms' }} aria-hidden="true" />
          <span className="splash-ping" style={{ animationDelay: '1200ms' }} aria-hidden="true" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-xl shadow-plum/20">
            <FontAwesomeIcon icon={faCommentDots} className="h-8 w-8 text-plum" aria-hidden="true" />
          </div>
        </div>

        {/* Title */}
        <h1
          className="splash-title-wave mt-6 text-5xl font-bold tracking-tight sm:text-6xl"
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
