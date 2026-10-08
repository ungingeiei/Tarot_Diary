"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NavMenu } from "../../components/NavMenu";
import { MenuIcon, CloseXIcon, TarotCard } from "../../components/TarotVisual";
import { DateField } from "../../components/DateField";
import { SelectField } from "../../components/SelectField";

/**
 * User profile page  (/profile)
 * -----------------------------
 * Backed by the API instead of hardcoded text:
 *   - GET   /api/profile   loads the signed-in account
 *   - PATCH /api/profile   saves the edit form
 * Signed-out visitors are sent to /login.
 */

const MONTHS = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

// "1998-11-14" -> "14 NOVEMBER 1998"
function formatBorn(iso) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    if (!match) return "—";
    return `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]} ${match[1]}`;
}

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

// In the order the signs run through the year, which is how someone
// looking for their own expects to find it.
const ZODIAC_SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer",
    "Leo", "Virgo", "Libra", "Scorpio",
    "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

export default function ProfilePage() {
    const router = useRouter();
    const [profile, setProfile] = useState(null); // null until loaded
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // ---- load the profile (signed-out visitors go to /login) ----
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch("/api/profile", { cache: "no-store" });
                if (cancelled) return;
                if (res.status === 401) {
                    router.replace("/login");
                    return;
                }
                const data = await res.json().catch(() => ({}));
                if (!res.ok || !data.success) {
                    setError(data.message || "Could not load your profile");
                    return;
                }
                setProfile(data.profile);
            } catch {
                if (!cancelled) setError("Could not load your profile");
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [router]);

    const startEditing = () => {
        setForm({
            fName: profile.fName,
            lName: profile.lName,
            email: profile.email,
            phone: profile.phone,
            dob: profile.dob,
            zodiac: profile.zodiac,
        });
        setError("");
        setIsEditing(true);
    };

    const cancelEditing = () => {
        setIsEditing(false);
        setError("");
    };

    const setField = (name) => (event) =>
        setForm((current) => ({ ...current, [name]: event.target.value }));

    const handleSave = async () => {
        if (saving) return;
        setSaving(true);
        setError("");

        const payload = {
            fName: form.fName,
            lName: form.lName,
            phone: form.phone,
            dob: form.dob,
        };
        // Google accounts can't change their email.
        if (!profile.hasGoogle) payload.email = form.email;

        // Zodiac: send what was typed. If it was left blank (or still holds
        // the old sign after the date changed), leave it out so the server
        // works the sign out from the new date of birth.
        const typedZodiac = (form.zodiac || "").trim();
        const dobChanged = form.dob !== profile.dob;
        const zodiacChanged = typedZodiac.toUpperCase() !== (profile.zodiac || "").toUpperCase();
        if (typedZodiac && (zodiacChanged || !dobChanged)) {
            payload.zodiac = typedZodiac;
        } else if (!typedZodiac && !form.dob) {
            payload.zodiac = ""; // no date, no sign: clear it
        }

        try {
            const res = await fetch("/api/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => ({}));
            if (res.status === 401) {
                router.replace("/login");
                return;
            }
            if (!res.ok || !data.success) {
                throw new Error(data.message || "Could not save your profile");
            }
            setProfile(data.profile);
            setIsEditing(false);
        } catch (err) {
            setError(err.message || "Something went wrong. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    // Nothing to show until the server has answered (or sent us elsewhere).
    if (!profile) {
        return (
            <main className="app-page profile-page">
                <ProfileHeader />
                {error && <p className="login-error">{error}</p>}
            </main>
        );
    }

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

                    {isEditing ? (
                        <>
                            <div className="profile-edit-form">

                                <input
                                    type="text"
                                    value={form.fName}
                                    onChange={setField("fName")}
                                    placeholder="First Name"
                                />

                                <input
                                    type="text"
                                    value={form.lName}
                                    onChange={setField("lName")}
                                    placeholder="Last Name"
                                />

                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={setField("email")}
                                    placeholder="Email"
                                    disabled={profile.hasGoogle}
                                    title={profile.hasGoogle ? "The email of a Google account can't be changed here" : undefined}
                                />

                                <input
                                    type="tel"
                                    value={form.phone}
                                    onChange={setField("phone")}
                                    placeholder="Phone"
                                />

                                {/* Our own calendar rather than <input type="date">:
                                    the browser's picker is drawn by the OS as a
                                    white panel that cannot be themed, and it had
                                    no way to reach a birth year without clicking
                                    the month arrow a few hundred times. */}
                                <DateField
                                    value={form.dob || ""}
                                    onChange={(dob) =>
                                        setForm((current) => ({ ...current, dob }))
                                    }
                                    placeholder="Born"
                                />

                                {/* A fixed list, not free text: the twelve
                                    signs are a closed set, and typing them by
                                    hand only produced spellings the rest of
                                    the app would have to guess at. */}
                                <SelectField
                                    value={form.zodiac || ""}
                                    onChange={(zodiac) =>
                                        setForm((current) => ({ ...current, zodiac }))
                                    }
                                    options={ZODIAC_SIGNS}
                                    placeholder="Zodiac"
                                    ariaLabel="Zodiac"
                                />

                            </div>

                            {error && <p className="login-error">{error}</p>}

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
                                    onClick={cancelEditing}
                                    disabled={saving}
                                >
                                    CANCEL
                                </button>

                            </div>
                        </>
                    ) : (
                        <>
                            <h2>
                                {profile.fName}
                                {profile.lName && (<><br />{profile.lName}</>)}
                            </h2>

                            <div className="profile-detail">
                                <span className="profile-label">EMAIL</span>
                                <span className="profile-separator"></span>
                                <span className="profile-value">
                                    {profile.email}
                                </span>
                            </div>

                            <div className="profile-detail">
                                <span className="profile-label">PHONE</span>
                                <span className="profile-separator"></span>
                                <span className="profile-value">
                                    {profile.phone || "—"}
                                </span>
                            </div>

                            <div className="profile-detail">
                                <span className="profile-label">BORN</span>
                                <span className="profile-separator"></span>
                                <span className="profile-value">
                                    {formatBorn(profile.dob)}
                                </span>
                            </div>

                            <div className="profile-detail">
                                <span className="profile-label">ZODIAC</span>
                                <span className="profile-separator"></span>
                                <span className="profile-value">
                                    {profile.zodiac || "—"}
                                </span>
                            </div>

                            <button
                                type="button"
                                className="edit-profile-btn"
                                onClick={startEditing}
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