import { useState } from 'react'
import HuddleLogo from '../components/HuddleLogo'
import onboardingOrganize from '../assets/onboarding-organize.png'
import onboardingSync from '../assets/onboarding-sync.png'
import onboardingTeam from '../assets/onboarding-team.png'

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

function Onboarding({ onComplete }) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const slide = slides[currentSlide]
  const isLastSlide = currentSlide === slides.length - 1

  const handleNext = () => {
    if (isLastSlide && onComplete) {
      onComplete()
      return
    }

    setCurrentSlide((currentSlide) => (currentSlide + 1) % slides.length)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-3 py-4 sm:px-5 sm:py-6">
      <section className="w-full max-w-[528px] rounded-3xl bg-white px-7 pb-9 pt-6 text-center shadow-xl shadow-gray-200/80 sm:px-10 sm:pb-11 sm:pt-7">
        <div className="flex items-center justify-center gap-2">
          <HuddleLogo />
          <span className="text-xl font-bold tracking-normal text-[#0F172A]">
            Huddle
          </span>
        </div>

        <div className="relative mt-9 flex min-h-[320px] items-center justify-center overflow-hidden rounded-[16px] bg-[#FFFFFF] px-2 py-4 sm:min-h-[330px]">
          <span className="absolute h-48 w-48 rounded-full bg-indigo-200/60 blur-3xl sm:h-60 sm:w-60" />
          <img
            src={slide.image}
            alt=""
            className={`relative z-10 mx-auto w-full object-contain ${
    slide.title === 'Stay in sync'
      ? 'max-h-[360px] scale-125'
      : 'max-h-[300px] sm:max-h-[340px]'
  }`}
/>
        </div>

     <h3 className="mt-6 whitespace-nowrap text-[22px] font-bold leading-[30px] tracking-normal text-gray-950 sm:text-[26px] sm:leading-[34px]">  
  {slide.title}
</h3>

<p className="mx-auto mt-3 max-w-[600px] text-[15px] leading-[26px] text-gray-500">
  {slide.description}
</p>

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
              onClick={() => setCurrentSlide(index)}
            />
          ))}
        </div>

        <button
          type="button"
          className="mt-9 w-full rounded-2xl bg-[#4F46E5] px-6 py-4 text-base font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-[#4338CA] hover:shadow-indigo-300 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2"
          onClick={handleNext}
        >
          {isLastSlide ? 'Get Started' : 'Next'}
        </button>

        {!isLastSlide && (
          <button
            type="button"
            className="mt-5 text-sm font-medium text-gray-400 transition hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2"
          >
            Skip for now
          </button>
        )}
      </section>
    </main>
  )
}

export default Onboarding
