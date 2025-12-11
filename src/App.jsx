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

      {/* Overlay modal (HTML on top of canvas) */}
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
                  your.email@example.com
                </a>
              </p>
              <p>
                GitHub:{" "}
                <a
                  href="https://github.com/your-username"
                  target="_blank"
                  rel="noreferrer"
                >
                  github.com/your-username
                </a>
              </p>
              <p>
                LinkedIn:{" "}
                <a
                  href="https://www.linkedin.com/in/your-handle"
                  target="_blank"
                  rel="noreferrer"
                >
                  linkedin.com/in/your-handle
                </a>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
