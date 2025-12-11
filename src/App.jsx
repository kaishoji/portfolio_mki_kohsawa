// src/App.jsx
import { useState } from "react";
import "./App.css";
import BallScene from "./components/BallScene";

export default function App() {
  const [showModal, setShowModal] = useState(false);

  const handleBallClick = () => {
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  return (
    <div className="app-root">
      {/* 3D scene */}
      <BallScene onBallClick={handleBallClick} />

      {/* Hint at the bottom (hidden when modal is open) */}
      {!showModal && (
        <div className="orb-hint">
          Press any orb to learn more
        </div>
      )}

      {/* Overlay modal (HTML over canvas) */}
      {showModal && (
        <div className="overlay-backdrop" onClick={closeModal}>
          <div
            className="overlay-modal"
            onClick={(e) => e.stopPropagation()} // don't close when clicking inside
          >
            <button className="overlay-close" onClick={closeModal}>
              ✕
            </button>

            <h1 className="overlay-title">Kai Ohsawa</h1>

            <p className="overlay-text">
              I&apos;m a developer who loves blending design, code, and a bit of
              chaos into interactive experiences. This site is my little
              cyberpunk playground while I experiment with 3D, motion, and
              creative coding.
            </p>

            <div className="overlay-contact">
              <p>
                Email:{" "}
                <a href="mailto:your.email@example.com">
                  kaishoji.oh@gmail.com
                </a>
              </p>
              <p>
                GitHub:{" "}
                <a
                  href="https://github.com/kaishoji"
                  target="_blank"
                  rel="noreferrer"
                >
                  https://github.com/kaishoji
                </a>
              </p>
              <p>
                LinkedIn:{" "}
                <a
                  href="https://www.linkedin.com/in/kaishoji/"
                  target="_blank"
                  rel="noreferrer"
                >
                  https://www.linkedin.com/in/kaishoji/
                </a>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
