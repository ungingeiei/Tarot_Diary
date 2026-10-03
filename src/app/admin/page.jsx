"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NavMenu } from "../../components/NavMenu";
import { MenuIcon, CloseXIcon, TarotCard } from "../../components/TarotVisual";

/**
 * Admin profile page  (/admin)
 * ----------------------------
 * Now backed by the API instead of hardcoded text:
 *   - GET   /api/profile   loads the signed-in account
 *   - PATCH /api/profile   saves the edit form
 * Signed-out visitors are sent to /login and signed-in users who are not
 * admins are sent to /profile. (This is a convenience redirect — the real
 * protection is inside the APIs, which check the role in the database.)
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

export default function AdminProfilePage() {
    const router = useRouter();

    const [profile, setProfile] = useState(null); // null until loaded
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // ---- load the profile (and bounce anyone who should not be here) ----
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
                if (data.profile.role !== "admin") {
                    router.replace("/profile");
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
                <h1>Admin Profile</h1>
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

                                <input
                                    type="date"
                                    value={form.dob}
                                    onChange={setField("dob")}
                                    placeholder="Born"
                                    max={new Date().toISOString().slice(0, 10)}
                                />

                                <input
                                    type="text"
                                    value={form.zodiac}
                                    onChange={setField("zodiac")}
                                    placeholder="Zodiac (filled in from your birth date)"
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

                            <div className="profile-actions-admin">
                                <button
                                    type="button"
                                    className="admin-edit-profile-btn"
                                    onClick={startEditing}
                                >
                                    EDIT PROFILE
                                </button>

                                <button
                                    type="button"
                                    className="admin-card-management-btn"
                                    onClick={() => router.push("/addcard")}
                                >
                                    CARD MANAGEMENT
                                </button>
                            </div>
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
