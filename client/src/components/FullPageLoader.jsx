import Spinner from './Spinner'

function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream">
      <Spinner className="h-8 w-8 text-plum" />
    </div>
  )
}

export default FullPageLoader