import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import WelcomePage from './pages/WelcomePage';
import SignInPage from './pages/SignInPage';
import WorkspacePage from './pages/WorkspacePage';
import ProfileSetupPage from './pages/ProfileSetupPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/workspace" element={<WorkspacePage />} />
        <Route path="/profile-setup" element={<ProfileSetupPage />} />
      </Routes>
    </Router>
  );
}

export default App;