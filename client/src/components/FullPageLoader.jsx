import Spinner from './Spinner'

function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-huddle-light">
      <Spinner className="h-8 w-8 text-huddle-purple" />
    </div>
  )
}

export default FullPageLoader