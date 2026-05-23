import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Simulator from "./pages/Simulator";
import Challenge from "./pages/Challenge";
import Compare from "./pages/Compare";
import Research from "./pages/Research";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/simulator" element={<Simulator />} />
            <Route path="/challenge" element={<Challenge />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/research" element={<Research />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
