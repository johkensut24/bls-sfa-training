import { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./components/NotFound";
import api from "./api"; // Use your custom instance

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState("home");
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // 'api' already has the BaseURL and withCredentials
        const res = await api.get("/api/auth/me");
        setUser(res.data);
      } catch (err) {
        // If 401 (Unauthorized), we just keep user as null
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            user ? (
              <Layout
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
                currentView={currentView}
                setCurrentView={setCurrentView}
                user={user}
                setUser={setUser}
              >
                <Home
                  user={user}
                  currentView={currentView}
                  setCurrentView={setCurrentView}
                  isCollapsed={isCollapsed}
                />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/login"
          element={user ? <Navigate to="/" /> : <Login setUser={setUser} />}
        />
        <Route
          path="/register"
          element={user ? <Navigate to="/" /> : <Register setUser={setUser} />}
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
