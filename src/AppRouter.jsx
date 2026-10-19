import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { lazy, Suspense } from "react";
import Home from "./pages/Home";

const Projects = lazy(() => import("./pages/Projects"));
const Contact = lazy(() => import("./pages/Contact"));

export default function App() {
  return (
    <BrowserRouter>
      <header style={{ padding: 12, borderBottom: "1px solid #ddd" }}>
        <nav>
          <Link to="/">Home</Link>
          {' | '}
          <Link to="/projects">Projects</Link>
          {' | '}
          <Link to="/contact">Contact</Link>
        </nav>
      </header>

      <main>
        <Suspense fallback={<div style={{ padding: 16 }}>Loading page...</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/contact" element={<Contact />} />
          </Routes>
        </Suspense>
      </main>
    </BrowserRouter>
  );
}
