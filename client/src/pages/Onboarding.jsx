import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import HuddleLogo from '../components/HuddleLogo'
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
  const isFirstSlide = currentSlide === 0
  const isSecondSlide = currentSlide === 1
  const isThirdSlide = currentSlide === 2
  const hasUpdatedChrome = isFirstSlide || isSecondSlide || isThirdSlide

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
    <main
      className={`flex min-h-screen items-center justify-center px-3 py-4 sm:px-5 sm:py-6 ${
        hasUpdatedChrome ? 'bg-cream' : 'bg-white'
      }`}
    >
      <section
        className={`w-full max-w-[528px] rounded-3xl px-7 pb-9 pt-6 text-center shadow-xl shadow-gray-200/80 sm:px-10 sm:pb-11 sm:pt-7 ${
          hasUpdatedChrome ? 'bg-cream' : 'bg-white'
        }`}
      >
        <div
          className={
            hasUpdatedChrome
              ? 'flex items-center justify-between'
              : 'flex items-center justify-center gap-2'
          }
        >
          {hasUpdatedChrome ? (
            <>
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
            </>
          ) : (
            <>
              <HuddleLogo />
              <span className="text-xl font-bold tracking-normal text-[#0F172A]">
                Huddle
              </span>
            </>
          )}
        </div>

        {hasUpdatedChrome && (
          <div className="mt-4 flex items-center justify-center gap-2">
            {Array.from({ length: isThirdSlide ? 4 : slides.length }).map((_, index) => (
              <button
                key={index}
                type="button"
                className={
                  isThirdSlide
                    ? `h-2 rounded-full transition-all ${
                        index === currentSlide
                          ? 'w-7 bg-plum'
                          : index < currentSlide
                            ? 'w-2 bg-plum'
                            : 'w-2 border border-cream bg-white'
                      }`
                    : isSecondSlide
                    ? `h-2 rounded-full transition-all ${
                        index === currentSlide
                          ? 'w-7 bg-plum'
                        : index < currentSlide
                            ? 'w-2 bg-plum'
                            : 'w-2 border border-[#e0dae0] bg-transparent'
                      }`
                    : `h-2 rounded-full transition-all ${
                        index === currentSlide ? 'w-7 bg-plum' : 'w-2 bg-gray-300'
                      }`
                }
                aria-label={`Go to slide ${index + 1}`}
                aria-current={index === currentSlide}
                disabled={index >= slides.length}
                onClick={() => {
                  if (index < slides.length) animateTo(index)
                }}
              />
            ))}
          </div>
        )}

        <div key={slide.title} className={`onboard-anim ${animClass}`}>
          <div
            className={`relative mt-9 flex min-h-[320px] items-center justify-center overflow-hidden rounded-[16px] px-2 py-4 sm:min-h-[330px] ${
              hasUpdatedChrome ? 'bg-cream' : 'bg-[#FFFFFF]'
            }`}
          >
            {!hasUpdatedChrome && (
              <span className="absolute h-48 w-48 rounded-full bg-indigo-200/60 blur-3xl sm:h-60 sm:w-60" />
            )}
            {isFirstSlide ? (
              <>
                <img
                  src={slide.image}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute bottom-2 right-2 w-[38%] rounded-xl bg-white p-2 text-left shadow-lg shadow-gray-900/15">
                  <p className="text-xs font-bold text-black">Acme corp</p>
                  <div className="mt-1 space-y-1 text-[10px] font-semibold">
                    <div className="flex items-center gap-2 text-black">
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                      <span># design</span>
                    </div>
                    <div className="rounded-full bg-plum px-2 py-1 text-white">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-lime-300" />
                        <span># general</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-black">
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                      <span># random</span>
                    </div>
                  </div>
                </div>
              </>
            ) : isSecondSlide ? (
              <>
                <img
                  src={onboardingOrganize}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute right-3 top-3 w-2/3 rounded-xl bg-white p-3 text-left">
                  <p className="text-xs font-bold text-plum"># design</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-orange-400" />
                    <div className="flex-1 space-y-1">
                      <span className="block h-1.5 w-4/5 rounded-full bg-gray-300" />
                      <span className="block h-1.5 w-3/5 rounded-full bg-gray-200" />
                    </div>
                  </div>
                  <div className="mt-2 rounded-full bg-plum px-3 py-2">
                    <span className="block h-1.5 w-3/4 rounded-full bg-cream/80" />
                    <span className="mt-1 block h-1.5 w-1/2 rounded-full bg-cream/70" />
                  </div>
                </div>
              </>
            ) : isThirdSlide ? (
              <>
                <img
                  src={onboardingTeam}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center rounded-full bg-white px-3 py-2 text-left">
                  <div className="flex -space-x-2">
                    <span className="h-6 w-6 rounded-full border-2 border-white bg-orange-400" />
                    <span className="h-6 w-6 rounded-full border-2 border-white bg-plum" />
                    <span className="h-6 w-6 rounded-full border-2 border-white bg-blue-500" />
                  </div>
                  <span className="ml-2 h-2 w-2 rounded-full bg-green-500" />
                  <span className="ml-1.5 whitespace-nowrap text-xs font-semibold text-black">
                    Live huddle
                  </span>
                </div>
              </>
            ) : (
              <img
                src={slide.image}
                alt=""
                className={`relative z-10 mx-auto w-full object-contain ${
                  slide.title === 'Stay in sync'
                    ? 'max-h-[360px] scale-125'
                    : 'max-h-[300px] sm:max-h-[340px]'
                }`}
              />
            )}
          </div>

          <div className="min-h-[152px] sm:min-h-[132px]">
            <h3 className="mt-6 whitespace-nowrap text-[22px] font-bold leading-[30px] tracking-normal text-gray-950 sm:text-[26px] sm:leading-[34px]">
              {isFirstSlide
                ? 'Channels for everything'
                : isSecondSlide
                  ? 'Messages that feel alive'
                  : isThirdSlide
                    ? 'Huddle in seconds'
                    : slide.title}
            </h3>

            {isFirstSlide ? (
              <p className="mx-auto mt-3 text-[13px] leading-[26px] text-black">
                Experience seamless real-time messaging and instant collaboration.
                <br />
                Break down silos and keep everyone on the same page.
              </p>
            ) : isSecondSlide ? (
              <p className="mx-auto mt-3 text-[15px] leading-[26px] text-black">
                React, reply, and thread in real time. The right reaction at the right moment.
              </p>
            ) : isThirdSlide ? (
              <p className="mx-auto mt-3 text-[15px] leading-[26px] text-black">
                Instant video calls — no scheduling, no friction. Click and you are talking.
              </p>
            ) : (
              <p className="mx-auto mt-3 max-w-full whitespace-nowrap text-[11px] leading-[26px] text-gray-500">
                {slide.description}
              </p>
            )}
          </div>
        </div>

        {!hasUpdatedChrome && (
          <div className="mt-10 flex items-center justify-center gap-2">
            {slides.map((item, index) => (
              <button
                key={item.title}
                type="button"
                className={`h-2 rounded-full transition-all ${
                  index === currentSlide ? 'w-7 bg-[#4F46E5]' : 'w-2 bg-gray-300'
                }`}
                aria-label={`Go to slide ${index + 1}`}
                aria-current={index === currentSlide}
                onClick={() => animateTo(index)}
              />
            ))}
          </div>
        )}

        <button
          type="button"
          className={`mt-9 w-full rounded-2xl px-6 py-4 text-base font-bold shadow-lg transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            hasUpdatedChrome
              ? 'bg-plum text-cream shadow-gray-300 hover:bg-plum/90 hover:shadow-gray-400 focus:ring-plum'
              : 'bg-[#4F46E5] text-white shadow-indigo-200 hover:bg-[#4338CA] hover:shadow-indigo-300 focus:ring-[#4F46E5]'
          }`}
          onClick={handleNext}
        >
          {isLastSlide ? 'Get Started' : 'Next'}
        </button>

        {!isLastSlide && !hasUpdatedChrome && (
          <button
            type="button"
            className="mt-5 text-sm font-medium text-gray-400 transition hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2"
            onClick={() => {
              setOnboardingSeen()
              navigate('/create-account')
            }}
          >
            Skip for now
          </button>
        )}
      </section>
    </main>
  )
}

export default Onboarding
