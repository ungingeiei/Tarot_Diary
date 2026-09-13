"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { NavMenu } from "../../components/NavMenu";
import { MenuIcon, CloseXIcon, TarotCard } from "../../components/TarotVisual";

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

// export default function AdminPage() {
//     const [isEditing, setIsEditing] = useState(false);

//     const router = useRouter();
//     return (
//         <main>
//             {/* หน้า Admin */}
//         </main>
//     );
// }

export default function ProfilePage() {
    const [isEditing, setIsEditing] = useState(false);
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
                                    defaultValue="Luna"
                                    placeholder="First Name"
                                />

                                <input
                                    type="text"
                                    defaultValue="Seraphine"
                                    placeholder="Last Name"
                                />

                                <input
                                    type="email"
                                    defaultValue="lunaseraphine@gmail.com"
                                    placeholder="Email"
                                />

                                <input
                                    type="tel"
                                    defaultValue="0981671667"
                                    placeholder="Phone"
                                />

                                <input
                                    type="text"
                                    defaultValue="14 NOVEMBER 1998"
                                    placeholder="Born"
                                />

                                <input
                                    type="text"
                                    defaultValue="SCORPIO"
                                    placeholder="Zodiac"
                                />

                            </div>

                            <div className="profile-edit-actions">

                                <button
                                    type="button"
                                    className="edit-profile-btn"
                                    onClick={() => setIsEditing(false)}
                                >
                                    SAVE
                                </button>

                                <button
                                    type="button"
                                    className="profile-cancel-btn"
                                    onClick={() => setIsEditing(false)}
                                >
                                    CANCEL
                                </button>

                            </div>
                        </>
                    ) : (
                        <>
                            <h2>Rose<br />Seraphine</h2>

                            <div className="profile-detail">
                                <span className="profile-label">EMAIL</span>
                                <span className="profile-separator"></span>
                                <span className="profile-value">
                                    lunaseraphine@gmail.com
                                </span>
                            </div>

                            <div className="profile-detail">
                                <span className="profile-label">PHONE</span>
                                <span className="profile-separator"></span>
                                <span className="profile-value">
                                    0981671667
                                </span>
                            </div>

                            <div className="profile-detail">
                                <span className="profile-label">BORN</span>
                                <span className="profile-separator"></span>
                                <span className="profile-value">
                                    14 NOVEMBER 1998
                                </span>
                            </div>

                            <div className="profile-detail">
                                <span className="profile-label">ZODIAC</span>
                                <span className="profile-separator"></span>
                                <span className="profile-value">
                                    SCORPIO
                                </span>
                            </div>

                            <div className="profile-actions-admin">
                                <button
                                    type="button"
                                    className="admin-edit-profile-btn"
                                    onClick={() => setIsEditing(true)}
                                >
                                    EDIT PROFILE
                                </button>

                                <button
                                    type="button"
                                    className="admin-card-management-btn"
                                    onClick={() => router.push("/managecard")}
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