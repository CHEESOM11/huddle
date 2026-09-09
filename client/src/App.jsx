import { useState } from 'react'
import Onboarding from './Pages/Onboarding'
import Signin from './Pages/Signin'
import Signup from './Pages/Signup'

function App() {
  const [screen, setScreen] = useState('onboarding')

  if (screen === 'signup') {
    return <Signup onSignIn={() => setScreen('signin')} />
  }

  if (screen === 'signin') {
    return <Signin onCreateAccount={() => setScreen('signup')} />
  }

  return <Onboarding onComplete={() => setScreen('signup')} />
}

export default App
