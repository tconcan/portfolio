import { AnimatePresence, MotionConfig } from "motion/react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import Background from "./components/background/Background";
import Footer from "./components/layout/Footer";
import Header from "./components/layout/Header";
import HomePage from "./pages/HomePage";
import ProjectsPage from "./pages/ProjectsPage";
import TravelPage from "./pages/TravelPage";

export default function App() {
  const location = useLocation();

  return (
    // reducedMotion="user": transforms are dropped for people who ask for
    // less motion; opacity fades remain.
    <MotionConfig reducedMotion="user">
      <Background />
      <Header />
      <main>
        {/* Old page finishes leaving before the new one enters; scroll resets
            in between so the new page starts at the top. */}
        <AnimatePresence mode="wait" initial={true} onExitComplete={() => window.scrollTo({ top: 0, behavior: "instant" })}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<HomePage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/travel" element={<TravelPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </main>
      <Footer />
    </MotionConfig>
  );
}
