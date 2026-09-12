export default function Home() {
  return (
    <main>
      {/* Navbar */}
      <nav>
        <img src="/logo.svg" alt="Tarot Diary Logo" />

        <div>
          <a href="/">HOME</a> |
          <a href="/about">ABOUT</a>|
          <a href="/login">LOGIN</a>
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

        <a href="/login">Start Reading</a>
      </section>
    </main>
  );
}