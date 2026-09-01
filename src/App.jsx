import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Explore from './pages/Explore';
import Messages from './pages/Messages';
import Admin from './pages/Admin';
import Roadmaps from './pages/Roadmaps';
import Portfolio from './pages/Portfolio';
import Forums from './pages/Forums';
import Meetups from './pages/Meetups';
import Leaderboard from './pages/Leaderboard';
import Analytics from './pages/Analytics';
import Matchmaking from './pages/Matchmaking';
import AiSimulator from './pages/AiSimulator';
import CareerCopilot from './pages/CareerCopilot';
import AiMentor from './components/AiMentor';
import { useAuth } from './context/AuthContext';

// Lazy load VideoCall to prevent simple-peer from crashing the initial bundle
const VideoCall = lazy(() => import('./pages/VideoCall'));

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// Public Route (redirects to dash if already logged in)
const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
};

function App() {
  const { user } = useAuth();

  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <main className="main-content">
          <Suspense fallback={<div style={{color:'white',textAlign:'center',padding:'4rem'}}>Loading...</div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              
              <Route path="/login" element={
                <PublicRoute><Login /></PublicRoute>
              } />
              
              <Route path="/register" element={
                <PublicRoute><Register /></PublicRoute>
              } />
              
              <Route path="/dashboard" element={
                <ProtectedRoute><Dashboard /></ProtectedRoute>
              } />

              <Route path="/explore" element={
                <ProtectedRoute><Explore /></ProtectedRoute>
              } />

              <Route path="/messages" element={
                <ProtectedRoute><Messages /></ProtectedRoute>
              } />
              
              <Route path="/roadmaps" element={
                <ProtectedRoute><Roadmaps /></ProtectedRoute>
              } />
              
              <Route path="/portfolio" element={
                <ProtectedRoute><Portfolio /></ProtectedRoute>
              } />

              <Route path="/forums" element={
                <ProtectedRoute><Forums /></ProtectedRoute>
              } />

              <Route path="/meetups" element={
                <ProtectedRoute><Meetups /></ProtectedRoute>
              } />

              <Route path="/leaderboard" element={
                <ProtectedRoute><Leaderboard /></ProtectedRoute>
              } />

              <Route path="/analytics" element={
                <ProtectedRoute><Analytics /></ProtectedRoute>
              } />

              <Route path="/matchmaking" element={
                <ProtectedRoute><Matchmaking /></ProtectedRoute>
              } />

              <Route path="/simulator" element={
                <ProtectedRoute><AiSimulator /></ProtectedRoute>
              } />

              <Route path="/career-copilot" element={
                <ProtectedRoute><CareerCopilot /></ProtectedRoute>
              } />

              <Route path="/messages/:userId" element={
                <ProtectedRoute><Messages /></ProtectedRoute>
              } />
              
              <Route path="/call/:userId" element={
                <ProtectedRoute><VideoCall /></ProtectedRoute>
              } />

              <Route path="/admin/data" element={<Admin />} />
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
        {user && <AiMentor />}
      </div>
    </Router>
  );
}

export default App;
