import { TarotCard } from "@/components/TarotVisual";

export default function About() {
    return (
        <main className="about-page">

            <nav>
                <img src="/logo.svg" alt="Tarot Diary Logo" />
            </nav>

            <section className="about-top">
                <div className="about-content">
                    <img src="/about/about-tarot.svg" alt="about-tarot" />
                    <h1>
                        <span>Unveil What</span>
                        <span>Lies Within</span>
                    </h1>
                    <img src="/about/line.svg" alt="line" />

                    <p>
                        Ancient wisdom, decoded for the modern seeker.
                        Your path, illuminated one card at a time.
                    </p>
                </div>

                <div className="about-card">
                    <img src="/about/tarot-card-about.svg" alt="The High Priestess" />
                </div>

            </section>

            <section className="about-description">
                <h2>About Tarot Diary</h2>
                <p>
                    Tarot Diary is more than a tarot reading website.
                </p>

                <p>
                    It is a place where intuition meets reflection, helping users
                    explore life's questions through the symbolism and wisdom of tarot cards.
                </p>

                <p>
                    Whether you seek guidance in love, career, finance, health,
                    or your relationship with beloved pets, Tarot Diary offers
                    thoughtful readings designed to inspire self-discovery and personal growth.
                </p>

                <p>
                    Created by CloudNarok, Tarot Diary blends mystical tradition
                    with modern technology to deliver a unique digital tarot experience.
                </p>
            </section>

        </main>
    );
}