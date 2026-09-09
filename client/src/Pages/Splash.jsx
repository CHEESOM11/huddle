function Splash() {
  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-600 to-indigo-400 px-6 text-white">
      <div className="absolute -bottom-28 -left-28 h-72 w-72 rounded-full bg-indigo-950/45 blur-3xl sm:h-96 sm:w-96" />
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/35 blur-3xl sm:h-96 sm:w-96" />

      <section className="relative z-10 flex min-h-screen w-full max-w-md flex-col items-center justify-center py-12">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-xl shadow-indigo-900/20">
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

          <h1 className="mt-6 text-5xl font-bold tracking-normal text-white sm:text-6xl">
            Huddle
          </h1>
          <p className="mt-3 text-base font-medium text-indigo-100/80 sm:text-lg">
            Collaboration made simple.
          </p>
        </div>

        <div className="flex flex-col items-center pb-8 text-center">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" />
          <p className="mt-5 text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-indigo-100/75">
            Lightweight Team Collaboration
          </p>
        </div>
      </section>
    </main>
  )
}

export default Splash
