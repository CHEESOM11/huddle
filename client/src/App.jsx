import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Splash from './pages/splash';
import WelcomePage from './pages/WelcomePage';
import SignInPage from './pages/SignInPage';
import CreateAccountPage from './pages/CreateAccountPage';
import CheckEmailPage from './pages/CheckEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import Onboarding from './pages/Onboarding';
import ProfileSetupPage from './pages/ProfileSetupPage';
import WorkspacePage from './pages/WorkspacePage';
import EmptyWorkspace from './pages/EmptyWorkSpace';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/create-account" element={<CreateAccountPage />} />
        <Route path="/check-email" element={<CheckEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/profile-setup" element={<ProfileSetupPage />} />
        <Route path="/workspace" element={<WorkspacePage />} />
        <Route path="/empty-workspace" element={<EmptyWorkspace />} />
      </Routes>
    </Router>
  );
}

export default App;
