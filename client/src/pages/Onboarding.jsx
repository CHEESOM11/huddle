import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { setOnboardingSeen } from '../utils/storage'
import onboardingOrganize from '../assets/onboarding-organize.png'
import onboardingSync from '../assets/onboarding-sync.png'
import onboardingTeam from '../assets/onboarding-team.png'

const EXIT_MS = 180

const slides = [
  {
    image: onboardingTeam,
    title: 'Connect with your team',
    description:
      'Experience seamless real-time messaging and instant collaboration. Break down silos and keep everyone on the same page.',
  },
  {
    image: onboardingOrganize,
    title: 'Organize your work',
    description:
      'Use channels and threads to keep your conversations focused and easy to find. Everything in its right place.',
  },
  {
    image: onboardingSync,
    title: 'Stay in sync',
    description:
      'Get real-time notifications and access your workspace from any device. Never miss an important update again.',
  },
]

function Onboarding() {
  const navigate = useNavigate()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [phase, setPhase] = useState('enter')
  const [direction, setDirection] = useState('forward')
  const transitionRef = useRef(null)
  const slide = slides[currentSlide]
  const isLastSlide = currentSlide === slides.length - 1

  useEffect(() => {
    return () => clearTimeout(transitionRef.current)
  }, [])

  const animateTo = (target) => {
    if (target === currentSlide || phase !== 'enter') return

    setDirection(target > currentSlide ? 'forward' : 'back')
    setPhase('exit')

    transitionRef.current = setTimeout(() => {
      setCurrentSlide(target)
      setPhase('enter')
    }, EXIT_MS)
  }

  const handleNext = () => {
    if (isLastSlide) {
      setOnboardingSeen()
      navigate('/create-account')
      return
    }

    animateTo(currentSlide + 1)
  }

  const animClass =
    phase === 'exit'
      ? direction === 'forward'
        ? 'onboard-exit-forward'
        : 'onboard-exit-back'
      : direction === 'forward'
        ? 'onboard-enter-forward'
        : 'onboard-enter-back'

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-3 py-4 sm:px-5 sm:py-6">
      <section className="w-full max-w-[528px] rounded-3xl bg-cream px-7 pb-9 pt-6 text-center shadow-xl shadow-gray-200/80 sm:px-10 sm:pb-11 sm:pt-7">
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="inline-flex items-center gap-2 text-sm font-semibold text-black transition hover:text-plum focus:outline-none focus:ring-2 focus:ring-plum focus:ring-offset-2 focus:ring-offset-cream"
            onClick={() => navigate(-1)}
          >
            <FontAwesomeIcon icon={faArrowLeft} className="h-3.5 w-3.5" />
            Back
          </button>
          <button
            type="button"
            className="text-sm font-semibold text-black transition hover:text-plum focus:outline-none focus:ring-2 focus:ring-plum focus:ring-offset-2 focus:ring-offset-cream"
            onClick={() => {
              setOnboardingSeen()
              navigate('/create-account')
            }}
          >
            Skip
          </button>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              className={`h-2 rounded-full transition-all ${
                index === currentSlide ? 'w-7 bg-plum' : 'w-2 bg-gray-300'
              }`}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === currentSlide}
              onClick={() => animateTo(index)}
            />
          ))}
        </div>

        <div key={slide.title} className={`onboard-anim ${animClass}`}>
          <div className="relative mt-8 overflow-hidden rounded-2xl bg-plum/5 ring-1 ring-black/5">
            <img
              src={slide.image}
              alt={slide.title}
              className="aspect-[4/3] w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-plum/15 via-transparent to-transparent" />
          </div>

          <div className="min-h-[124px] sm:min-h-[116px]">
            <h3 className="mt-7 text-[24px] font-bold leading-[32px] tracking-normal text-gray-950 sm:text-[26px] sm:leading-[34px]">
              {slide.title}
            </h3>
            <p className="mx-auto mt-3 max-w-[400px] text-[15px] leading-[26px] text-gray-600">
              {slide.description}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="mt-6 w-full rounded-2xl bg-plum px-6 py-4 text-base font-bold text-cream shadow-lg shadow-gray-300 transition hover:bg-plum/90 hover:shadow-gray-400 focus:outline-none focus:ring-2 focus:ring-plum focus:ring-offset-2 focus:ring-offset-cream"
          onClick={handleNext}
        >
          {isLastSlide ? 'Get Started' : 'Next'}
        </button>
      </section>
    </main>
  )
}

export default Onboarding
