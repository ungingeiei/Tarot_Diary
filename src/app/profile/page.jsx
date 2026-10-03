"use client";

import { useEffect, useState } from "react";
import { NavMenu } from "../../components/NavMenu";
import { MenuIcon, CloseXIcon, TarotCard } from "../../components/TarotVisual";
import { DateField } from "../../components/DateField";
import { SelectField } from "../../components/SelectField";

function ProfileHeader() {
    const [menuOpen, setMenuOpen] = useState(false);
    return (<>
        <header className="profile-header">
            <button type="button" className="profile-menu-btn"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                onClick={() => setMenuOpen((open) => !open)}
            >
                {menuOpen ? <CloseXIcon /> : <MenuIcon />}
            </button>
        </header>
        {menuOpen &&
            (<NavMenu
                onNavigate={() => setMenuOpen(false)}
                onDismiss={() => setMenuOpen(false)}
            />
            )}
    </>
    );
}

// "14 NOVEMBER 1998" for display, from the YYYY-MM-DD the API returns.
function formatBorn(dob) {
    if (!dob) return "";
    const [y, m, d] = dob.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    if (Number.isNaN(date.getTime())) return "";
    return `${d} ${date.toLocaleString("en-US", { month: "long" }).toUpperCase()} ${y}`;
}

// In the order the signs run through the year, which is how someone
// looking for their own expects to find it.
const ZODIAC_SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer",
    "Leo", "Virgo", "Libra", "Scorpio",
    "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

const EMPTY = {
    firstName: "", lastName: "", email: "",
    phone: "", dob: "", zodiac: "",
};

export default function ProfilePage() {
    const [isEditing, setIsEditing] = useState(false);
    // `profile` is what the server last confirmed; `draft` is what the
    // user is typing. Keeping them apart means CANCEL can discard edits
    // without another round trip.
    const [profile, setProfile] = useState(EMPTY);
    const [draft, setDraft] = useState(EMPTY);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch("/api/profile", { cache: "no-store" });
                const data = await res.json().catch(() => ({}));
                if (cancelled) return;
                if (!res.ok || !data.success) {
                    setError(res.status === 401
                        ? "Please sign in to see your profile."
                        : "Could not load your profile.");
                    return;
                }
                setProfile(data.profile);
                setDraft(data.profile);
            } catch {
                if (!cancelled) setError("Could not load your profile.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const startEditing = () => {
        setDraft(profile);
        setError("");
        setIsEditing(true);
    };

    const setField = (key) => (event) =>
        setDraft((current) => ({ ...current, [key]: event.target.value }));

    const handleSave = async () => {
        setSaving(true);
        setError("");
        try {
            const res = await fetch("/api/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(draft),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) {
                // e.g. the email is taken by someone else
                setError(data.message || "Could not save your profile.");
                return;
            }
            setProfile(data.profile);
            setDraft(data.profile);
            setIsEditing(false);
        } catch {
            setError("Could not save your profile.");
        } finally {
            setSaving(false);
        }
    };

    const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");

    return (
        <main className="app-page profile-page">

            {/* Profile navigation */}
            <ProfileHeader />


            {/* Profile heading */}
            <section className="profile-heading">
                <p className="profile-brand-name">Tarot Diary</p>
                <h1>My Profile</h1>
                <div className="profile-divider">
                    <span></span>
                </div>
            </section>

            {/* Profile card */}
            <section className="profile-card">

                {/* Left side - Tarot cards */}
                <div className="profile-card-art">
                    <TarotCard
                        title="THE SUN"
                        className="profile-tarot profile-tarot-green"
                    />

                    <TarotCard
                        title="THE SUN"
                        className="profile-tarot profile-tarot-purple"
                    />
                </div>

                {/* Right side - User information */}
                <div className="profile-info">

                    {error && <p className="login-error">{error}</p>}

                    {isEditing ? (
                        <>
                            <div className="profile-edit-form">

                                <input
                                    type="text"
                                    value={draft.firstName}
                                    onChange={setField("firstName")}
                                    placeholder="First Name"
                                />

                                <input
                                    type="text"
                                    value={draft.lastName}
                                    onChange={setField("lastName")}
                                    placeholder="Last Name"
                                />

                                <input
                                    type="email"
                                    value={draft.email}
                                    onChange={setField("email")}
                                    placeholder="Email"
                                />

                                <input
                                    type="tel"
                                    value={draft.phone}
                                    onChange={setField("phone")}
                                    placeholder="Phone"
                                />

                                {/* Our own calendar rather than <input type="date">:
                                    the browser's picker is drawn by the OS as a
                                    white panel that cannot be themed, and it had
                                    no way to reach a birth year without clicking
                                    the month arrow a few hundred times. */}
                                <DateField
                                    value={draft.dob}
                                    onChange={(dob) =>
                                        setDraft((current) => ({ ...current, dob }))
                                    }
                                    placeholder="Born"
                                />

                                {/* A fixed list, not free text: the twelve
                                    signs are a closed set, and typing them by
                                    hand only produced spellings the rest of
                                    the app would have to guess at. */}
                                <SelectField
                                    value={draft.zodiac}
                                    onChange={(zodiac) =>
                                        setDraft((current) => ({ ...current, zodiac }))
                                    }
                                    options={ZODIAC_SIGNS}
                                    placeholder="Zodiac"
                                    ariaLabel="Zodiac"
                                />

                            </div>

                            <div className="profile-edit-actions">

                                <button
                                    type="button"
                                    className="edit-profile-btn"
                                    onClick={handleSave}
                                    disabled={saving}
                                >
                                    {saving ? "SAVING..." : "SAVE"}
                                </button>

                                <button
                                    type="button"
                                    className="profile-cancel-btn"
                                    onClick={() => { setDraft(profile); setError(""); setIsEditing(false); }}
                                    disabled={saving}
                                >
                                    CANCEL
                                </button>

                            </div>
                        </>
                    ) : (
                        <>
                            <h2>
                                {loading
                                    ? "\u2026"
                                    : profile.firstName
                                        ? <>{profile.firstName}<br />{profile.lastName}</>
                                        : "Your profile"}
                            </h2>

                            <div className="profile-detail">
                                <span className="profile-label">EMAIL</span>
                                <span className="profile-separator"></span>
                                <span className="profile-value">
                                    {profile.email || "\u2014"}
                                </span>
                            </div>

                            <div className="profile-detail">
                                <span className="profile-label">PHONE</span>
                                <span className="profile-separator"></span>
                                <span className="profile-value">
                                    {profile.phone || "\u2014"}
                                </span>
                            </div>

                            <div className="profile-detail">
                                <span className="profile-label">BORN</span>
                                <span className="profile-separator"></span>
                                <span className="profile-value">
                                    {formatBorn(profile.dob) || "\u2014"}
                                </span>
                            </div>

                            <div className="profile-detail">
                                <span className="profile-label">ZODIAC</span>
                                <span className="profile-separator"></span>
                                <span className="profile-value">
                                    {profile.zodiac ? profile.zodiac.toUpperCase() : "\u2014"}
                                </span>
                            </div>

                            <button
                                type="button"
                                className="edit-profile-btn"
                                onClick={startEditing}
                                disabled={loading || Boolean(error)}
                            >
                                EDIT PROFILE
                            </button>
                        </>
                    )}

                </div>

                {/* Full-width bottom section */}
                <div className="profile-bottom">
                    <div className="profile-info-divider"></div>

                    <p className="profile-quote">
                        I trust the wisdom that flows through me.
                        The unseen is as real as the seen.
                    </p>
                </div>
            </section>
        </main>
    );
}