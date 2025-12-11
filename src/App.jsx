// src/App.jsx
import { useEffect } from "react";
import "./App.css";
import BallScene from "./components/BallScene";
import Navbar from "./components/Navbar";

export default function App() {
  // Section reveal animations with IntersectionObserver
  useEffect(() => {
    const sections = document.querySelectorAll(".section");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("section-visible");
          }
        });
      },
      { threshold: 0.2 }
    );

    sections.forEach((sec) => observer.observe(sec));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="app-root">
      {/* 3D background */}
      <BallScene />

      {/* Navbar on top */}
      <Navbar />

      <main>
        {/* HERO / HOME */}
        <section id="home" className="section hero">
          {/* We keep a semantic H1 for SEO/accessibility,
              but visually the name is handled in 3D. */}
          <h1 className="hero-name sr-only">Kai Ohsawa</h1>
          <p className="hero-tagline">
            Developer · Designer · Curious Human
          </p>
        </section>

        {/* ABOUT */}
        <section id="about" className="section">
          <h2>About</h2>
          <p>
            Write a short blurb about yourself here: what you build, what you
            love, your tech stack, etc.
          </p>
        </section>

        {/* CONTACT */}
        <section id="contact" className="section">
          <h2>Contact</h2>
          <p>
            Drop your email, links to socials, or a contact form here so people
            can reach you.
          </p>
        </section>
      </main>
    </div>
  );
}
