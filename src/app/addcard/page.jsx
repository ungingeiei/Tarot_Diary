"use client";

import { useCallback, useEffect, useState } from "react";
import { NavMenu } from "../../components/NavMenu";
import {
    MenuIcon,
    CloseXIcon,
    TarotCard,
} from "../../components/TarotVisual";


export default function ManageCardPage() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [showAddCard, setShowAddCard] = useState(false);


// The deck now comes from `cards` + `card_meanings` through
// /api/admin/cards. It used to be this one hard-coded Lovers entry,
// and anything added to it vanished on the next refresh.
    const [cards, setCards] = useState([]);
    const [loadError, setLoadError] = useState("");
    const [busy, setBusy] = useState(false);

    const loadCards = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/cards", { cache: "no-store" });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) {
                setLoadError(
                    res.status === 403
                        ? "This console is for admin accounts only."
                        : res.status === 401
                            ? "Please sign in."
                            : data.message || "Could not load the deck."
                );
                setCards([]);
                return;
            }
            setLoadError("");
            setCards(data.cards);
        } catch {
            setLoadError("Could not load the deck.");
        }
    }, []);

    useEffect(() => {
        loadCards();
    }, [loadCards]);

    const [deleteTarget, setDeleteTarget] = useState(null);

    // =====================================ADD CARD FORM=====================================
    const [cardName, setCardName] = useState("");
    const [prediction, setPrediction] = useState("");

    const [advice, setAdvice] = useState("");
    const [image, setImage] = useState("");
    const [timeOrCategory, setTimeOrCategory] = useState("Daily");

    // =====================================EDIT CARD=====================================
    const [editingCardId, setEditingCardId] = useState(null);
    const [editName, setEditName] = useState("");
    const [editPrediction, setEditPrediction] = useState("");
    const [editAdvice, setEditAdvice] = useState("");
    const [editTimeOrCategory, setEditTimeOrCategory] = useState("Daily");

    // =====================================OPEN ADD CARD=====================================
    const handleOpenAddCard = () => {
        setCardName("");
        setPrediction("");
        setShowAddCard(true);
        setAdvice("");
        setImage("");
        setTimeOrCategory("Daily");
    };
    // =====================================CANCEL ADD CARD=====================================
    // `keepImage` is set by a successful save: the picture belongs to a
    // card by then, and must not be deleted along with the form state.
    const handleCancel = ({ keepImage = false } = {}) => {
        if (!keepImage) discardUpload(image);
        setCardName("");
        setPrediction("");
        setShowAddCard(false);
        setAdvice("");
        setImage("");
        setTimeOrCategory("Daily");
    };

    // =====================================SAVE NEW CARD=====================================

    const [uploading, setUploading] = useState(false);

    // An image is uploaded the moment it is chosen, before the card is
    // saved. If the admin then picks a different file or closes the form,
    // that first upload has nothing pointing at it and is thrown away.
    const discardUpload = async (url) => {
        if (!url) return;
        try {
            await fetch(`/api/admin/cards/image?url=${encodeURIComponent(url)}`, {
                method: "DELETE",
            });
        } catch {
            // Leaving a stray file behind is better than blocking the form.
        }
    };

    // Uploading on change rather than on submit keeps the save request
    // plain JSON, and shows the admin straight away whether the image
    // was accepted instead of failing after they filled the whole form.
    const handleImageChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file) {
            setImage("");
            return;
        }

        setUploading(true);
        setLoadError("");
        // Whatever was uploaded a moment ago is now being replaced.
        const replaced = image;
        try {
            const body = new FormData();
            body.append("file", file);
            const res = await fetch("/api/admin/cards/image", { method: "POST", body });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) {
                setLoadError(data.message || "Could not upload the image.");
                setImage("");
                event.target.value = "";
                return;
            }
            setImage(data.url);
            if (replaced && replaced !== data.url) discardUpload(replaced);
        } catch {
            setLoadError("Could not upload the image.");
            setImage("");
        } finally {
            setUploading(false);
        }
    };

    const handleSaveCard = async (event) => {
        event.preventDefault();

        if (
            !cardName.trim() ||
            !prediction.trim() ||
            !advice.trim()
        ) {
            return;
        }

        setBusy(true);
        try {
            const res = await fetch("/api/admin/cards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: cardName.trim(),
                    prediction: prediction.trim(),
                    advice: advice.trim(),
                    category: timeOrCategory,
                    image,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) {
                // e.g. this card already has a reading for that category
                setLoadError(data.message || "Could not add the card.");
                return;
            }
            // Re-read rather than guessing the new row: the server
            // decides the id, and may have attached this reading to a
            // card that already existed.
            await loadCards();
            handleCancel({ keepImage: true });
        } finally {
            setBusy(false);
        }
    };

    // =====================================EDIT CARD=====================================
    const handleEditCard = (card) => {
        setEditingCardId(card.id);
        setEditName(card.name || "");
        setEditPrediction(card.prediction || "");
        setEditAdvice(card.advice || "");
        setEditTimeOrCategory(card.category || "Daily");
    };

    // =====================================CANCEL EDIT=====================================
    const handleCancelEdit = () => {
        setEditingCardId(null);
        setEditName("");
        setEditPrediction("");
        setEditAdvice("");
        setEditTimeOrCategory("Daily");
    };

    // =====================================SAVE EDIT=====================================
    const handleSaveEdit = async (event, id) => {
        event.preventDefault();
        if (
            !editName.trim() ||
            !editPrediction.trim() ||
            !editAdvice.trim()
        ) {
            return;
        }
        setBusy(true);
        try {
            const res = await fetch("/api/admin/cards", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id,
                    name: editName.trim(),
                    prediction: editPrediction.trim(),
                    advice: editAdvice.trim(),
                    category: editTimeOrCategory,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) {
                setLoadError(data.message || "Could not save the card.");
                return;
            }
            await loadCards();
            handleCancelEdit();
        } finally {
            setBusy(false);
        }
    };
    // =====================================DELETE CARD=====================================

    const handleDeleteCard = async (id) => {
        setBusy(true);
        try {
            const res = await fetch(`/api/admin/cards?id=${encodeURIComponent(id)}`, {
                method: "DELETE",
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) {
                setLoadError(data.message || "Could not delete the card.");
                return;
            }
            await loadCards();
        } finally {
            setBusy(false);
        }
    };
    return (
        <main className="app-page manage-card-page">

            {/* =======HEADER============= */}
            <header className="manage-card-header">
                <button
                    type="button"
                    className="manage-card-menu-btn"
                    aria-label={
                        menuOpen
                            ? "Close menu"
                            : "Open menu"
                    }
                    onClick={() =>
                        setMenuOpen(
                            (open) => !open
                        )
                    }
                >
                    {menuOpen ? (
                        <CloseXIcon />
                    ) : (
                        <MenuIcon />
                    )}
                </button>

                <div className="manage-card-title-row">

                    <div className="manage-card-brand">
                        Tarot Diary
                    </div>

                    <div className="admin-console">
                        ADMIN CONSOLE
                    </div>

                    {/* Covers "admins only", a failed save, a dropped
                        connection — without it the console would just
                        stop responding to clicks with no reason given. */}
                    {loadError && (
                        <p className="login-error">{loadError}</p>
                    )}

                </div>

            </header>

            {/* ==================NAV MENU======================== */}
            {menuOpen && (
                <NavMenu
                    onNavigate={() =>
                        setMenuOpen(false)
                    }
                    onDismiss={() =>
                        setMenuOpen(false)
                    }
                />
            )}

            <div className="manage-card-divider"></div>

            {/* =======================PAGE HEADING======================= */}
            <section className="manage-card-heading">
                <h1>Tarot Cards</h1>
                <button
                    type="button"
                    className="add-card-btn"
                    onClick={
                        handleOpenAddCard
                    }
                >
                    + ADD CARD
                </button>
            </section>
            {/* =====================================CARD TABLE===================================== */}
            <section className="manage-card-table-wrapper">
                <table className="manage-card-table">

                    <thead>
                        <tr>
                            <th>CARD NAME</th>
                            <th>TIME & CATEGORY</th>
                            <th>PREDICTION</th>
                            <th>ADVICE</th>
                            <th>ACTION</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cards.map((card) => {
                            const isEditing =
                                editingCardId ===
                                card.id;
                            return (
                                <tr
                                    key={card.id}
                                >
                                    {/* CARD NAME */}
                                    <td>
                                        {isEditing ? (
                                            <input type="text"
                                                value={
                                                    editName
                                                }
                                                onChange={( event ) => setEditName( event
                                                            .target
                                                            .value
                                                    )
                                                }
                                            />
                                        ) : (
                                            <div className="manage-card-name">

                                                <TarotCard
                                                    title={
                                                        card.title
                                                    }
                                                    className="manage-tarot-card"
                                                />
                                                <span>
                                                    {
                                                        card.name
                                                    }
                                                </span>

                                            </div>
                                        )}

                                    </td>

                                    {/* CARD TYPE */}
                                    {/* TIME & CATEGORY */}
                                    <td>
                                        {isEditing ? (
                                            <select value={editTimeOrCategory}
                                                onChange={(event) => setEditTimeOrCategory(event.target.value)
                                                }
                                            >
                                                <option value="Daily">Daily</option>
                                                <option value="Monthly">Monthly</option>
                                                <option value="Weekly">Weekly</option>
                                                <option value="Love">Love</option>
                                                <option value="Health">Health</option>
                                                <option value="Pets">Pets</option>
                                                <option value="Finance">Finance</option>
                                                <option value="Career">Career</option>
                                            </select>
                                        ) : (
                                            <span>{card.category}</span>
                                        )}
                                    </td>
                                    {/* PREDICTION */}
                                    <td>
                                        {isEditing ? (
                                            <textarea
                                                rows="2"
                                                value={
                                                    editPrediction
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    setEditPrediction(
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                            />
                                        ) : (
                                            <div className="manage-prediction-text">
                                                {
                                                    card.prediction
                                                }
                                            </div>
                                        )}
                                    </td>

                                    {/* ADVICE */}
                                    <td>
                                        {isEditing ? (
                                            <textarea
                                                rows="2"
                                                value={editAdvice}
                                                onChange={(event) =>
                                                    setEditAdvice(event.target.value)
                                                }
                                            />
                                        ) : (
                                            <div className="manage-prediction-text">
                                                {card.advice}
                                            </div>
                                        )}
                                    </td>
                                    {/* ACTION */}

                                    <td>
                                        <div className="card-action-buttons">
                                            {isEditing ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        className="edit-card-btn"
                                                        aria-label="Save card"
                                                        onClick={(
                                                            event
                                                        ) =>
                                                            handleSaveEdit( event, card.id)
                                                        }
                                                    >
                                                        ✓
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="delete-card-btn"
                                                        aria-label="Cancel edit"
                                                        onClick={
                                                            handleCancelEdit
                                                        }
                                                    >
                                                        ✕
                                                    </button>

                                                </>
                                            ) : (
                                                <>

                                                    <button
                                                        type="button"
                                                        className="edit-card-btn"
                                                        aria-label="Edit card"
                                                        onClick={() =>
                                                            handleEditCard(
                                                                card
                                                            )
                                                        }
                                                    >
                                                        ✎
                                                    </button>

                                                   <button
                                                        type="button"
                                                        className="delete-card-btn"
                                                        aria-label="Delete card"
                                                        onClick={() => setDeleteTarget(card)}
                                                    >
                                                        🗑
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </section>
            {/* =====================================ADD CARD SIDE PANEL===================================== */}
            {showAddCard && (
                <div className="add-card-overlay">
                    <aside className="add-card-panel">
                        <div className="add-card-panel-header">
                            <p>
                                New entry
                            </p>
                            <h2>
                                Add Tarot Card
                            </h2>
                        </div>
                        <div className="add-card-panel-divider"></div>
                        <form
                            className="add-card-form"
                            onSubmit={handleSaveCard}
                        >

                            <label>CARD NAME</label>
                            <input
                                type="text"
                                value={cardName}
                                onChange={(event) =>
                                    setCardName(event.target.value)
                                }
                            />

                            <label>PREDICTION</label>
                            <textarea
                                rows="3"
                                value={prediction}
                                onChange={(event) =>
                                    setPrediction(event.target.value)
                                }
                            />

                            <label>ADVICE</label>
                            <textarea
                                rows="3"
                                value={advice}
                                onChange={(event) =>
                                    setAdvice(event.target.value)
                                }
                            />

                            <div className="add-card-row">

                                <div className="add-card-column">
                                    <label>IMAGE</label>

                                    {/* The file goes to the bucket as soon as it
                                        is chosen, and what is kept in state is
                                        the path the upload answers with — that
                                        is what `cards.pict` stores. */}
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,image/gif"
                                        disabled={uploading}
                                        onChange={handleImageChange}
                                    />

                                    {uploading && <p className="add-card-hint">Uploading…</p>}

                                    {image && !uploading && (
                                        <img
                                            src={image}
                                            alt="Card preview"
                                            className="add-card-preview"
                                        />
                                    )}
                                </div>

                                <div className="add-card-column">
                                    <label>TIME OR CATEGORY</label>

                                    <select
                                        value={timeOrCategory}
                                        onChange={(event) =>
                                            setTimeOrCategory(
                                                event.target.value
                                            )
                                        }
                                    >
                                        <option value="Daily">
                                            Daily
                                        </option>

                                        <option value="Monthly">
                                            Monthly
                                        </option>

                                        <option value="Weekly">
                                            Weekly
                                        </option>

                                        <option value="Love">
                                            Love
                                        </option>

                                        <option value="Health">
                                            Health
                                        </option>

                                        <option value="Pets">
                                            Pets
                                        </option>

                                        <option value="Finance">
                                            Finance
                                        </option>

                                        <option value="Career">
                                            Career
                                        </option>
                                    </select>

                                </div>

                            </div>

                            <div className="add-card-form-divider"></div>

                            <div className="add-card-actions">

                                <button
                                    type="submit"
                                    className="save-card-btn"
                                >
                                    SAVE CARD
                                </button>

                                <button
                                    type="button"
                                    className="cancel-card-btn"
                                    onClick={handleCancel}
                                >
                                    CANCEL
                                </button>

                            </div>

                        </form>
                    </aside>
                </div>
            )}

            {deleteTarget && (
                <div className="delete-modal-overlay">
                    <div className="delete-modal">
                        <h2>Delete Card</h2>

                        <p>Are you sure you want to delete?</p>

                        <p className="delete-warning">
                            All linked predictions will also be deleted.
                            This action cannot be undone.
                        </p>

                        <div className="delete-modal-actions">
                            <button
                                type="button"
                                className="delete-confirm-btn"
                                onClick={() => {
                                    handleDeleteCard(deleteTarget.id);
                                    setDeleteTarget(null);
                                }}
                            >
                                DELETE
                            </button>

                            <button
                                type="button"
                                className="delete-cancel-btn"
                                onClick={() => setDeleteTarget(null)}
                            >
                                CANCEL
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
