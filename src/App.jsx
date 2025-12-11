// src/App.jsx
import "./App.css";
import BallScene from "./components/BallScene";
import Navbar from "./components/Navbar";

export default function App() {
  return (
    <div className="app-root">
      {/* 3D background */}
      <BallScene />

      {/* Top navigation bar */}
      <Navbar />

      <main>
        {/* HOME / HERO SECTION */}
        <section id="home" className="section hero">
          <h1 className="hero-name">Kai Ohsawa</h1>
          <p className="hero-tagline">
            Developer · Designer · Curious Human
          </p>
        </section>

        {/* ABOUT SECTION */}
        <section id="about" className="section">
          <h2>About</h2>
          <p>
            Hello! I am a junior database administrator for the statewide financial system!
          </p>
        </section>

        {/* CONTACT SECTION */}
        <section id="contact" className="section">
          <h2>Contact me</h2>
          <p>
            kaishoji.oh@gmail.com
          </p>
        </section>
      </main>
    </div>
  );
}
