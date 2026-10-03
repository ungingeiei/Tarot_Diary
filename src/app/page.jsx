"use client";
import { useEffect, useState } from "react";
import { isSignedIn, signOut } from "@/lib/auth";

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);

  const handleLogout = () => {
    signOut();
    setLoggedIn(false);
  };

  useEffect(() => {
    const result = isSignedIn();
    setLoggedIn(result);
  }, []);

  return (
    <main>
      {/* Navbar */}
      <nav>
        <img src="/logo.svg" alt="Tarot Diary Logo" />

        <div>
          <a href="/">HOME</a> |
          <a href="/about">ABOUT</a> |

          {loggedIn ? (
            <button
              type="button"
              onClick={handleLogout}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                font: "inherit",
                color: "inherit",
              }}
            >
              LOGOUT
            </button>
          ) : (
            <a href="/login">LOGIN</a>
          )}
        </div>
      </nav>

      {/* Middle */}
      <section className="Middle">
        <img src="/home/welcome-line.svg" alt="Welcome to Tarot Diary"/>

        <h1>TAROT DIARY</h1>
        
        <div className="tarot-image-center">
          <img className="tarot-cards" src="/home/bigTarot.svg" alt="black Tarot"/>
          <img className="gold-circle" src="/home/circle-gold.svg" alt="gold glow"/>
        </div>
        
        <p>Discover your destiny through the wisdom of Tarot cards.</p>

        <div className="home-reading-options">
          <a
            href="/time"
            className="home-reading-card"
          >
            <div className="home-reading-title">
              TIME READING
            </div>

          </a>

          <a
            href="/category"
            className="home-reading-card"
          >
            <div className="home-reading-title">
              CATEGORY READING
            </div>

          </a>

        </div>
      </section>
    </main>
  );
}