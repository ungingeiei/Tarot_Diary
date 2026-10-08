"use client";
import Link from "next/link";
import { useUserOnly, signOut } from "@/lib/auth";
import { asset } from "@/lib/assets";

export default function Home() {
  // Straight from /api/auth/me, which reads the account row: the nav can
  // no longer say LOGOUT for a session the server has already dropped.
  // An admin signing in has no use for the reading side and is sent to
  // the console instead.
  const { user } = useUserOnly();
  const loggedIn = Boolean(user);

  return (
    <main>
      {/* Navbar */}
      <nav>
        <img src={asset("logo.svg")} alt="Tarot Diary Logo" />

        <div>
          <Link href="/">HOME</Link> |
          <Link href="/about">ABOUT</Link> |

          {loggedIn ? (
            <button
              type="button"
              onClick={signOut}
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
            <Link href="/login">LOGIN</Link>
          )}
        </div>
      </nav>

      {/* Middle */}
      <section className="Middle">
        <img src={asset("home/welcome-line.svg")} alt="Welcome to Tarot Diary"/>

        <h1>TAROT DIARY</h1>
        
        <div className="tarot-image-center">
          <img className="tarot-cards" src={asset("home/bigTarot.svg")} alt="black Tarot"/>
          <img className="gold-circle" src={asset("home/circle-gold.svg")} alt="gold glow"/>
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