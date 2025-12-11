// src/App.jsx
import "./App.css";
import BallScene from "./components/BallScene";
import Navbar from "./components/Navbar";

export default function App() {
  return (
    <div className="app-root">
      {/* 3D background */}
      <BallScene />

      {/* UI on top */}
      <Navbar />

      <main>
        <section id="home" className="section hero">
          <p className="hero-tagline">
            Developer · Designer · Curious Human
          </p>
        </section>

        <section id="about" className="section">
          <h2>About</h2>
          <p>
            Write a short blurb about yourself here: what you build, what you
            love, your tech stack, etc.
          </p>
        </section>

        <section id="contact" className="section">
          <h2>Contact me</h2>
          <p>
            Drop your email, links to socials, or a contact form here.
          </p>
        </section>
      </main>
    </div>
  );
}