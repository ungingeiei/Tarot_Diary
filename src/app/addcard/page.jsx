"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NavMenu } from "../../components/NavMenu";
import {
    MenuIcon,
    CloseXIcon,
    TarotCard,
} from "../../components/TarotVisual";

/**
 * Card management page  (/addcard)
 * --------------------------------
 * Now backed by the admin API instead of local state:
 *   GET    /api/admin/cards        load the table
 *   POST   /api/admin/cards        add a card (multipart: includes the image)
 *   PATCH  /api/admin/cards/:id    edit a card (JSON, or multipart if a new image is chosen)
 *   DELETE /api/admin/cards/:id    delete a card AND the diary entries saved from it
 *
 * Signed-out visitors go to /login, signed-in non-admins to /profile. That
 * redirect is a convenience — the APIs themselves refuse anyone who is not
 * an admin in the database.
 */

const CATEGORY_OPTIONS = [
    "Daily", "Monthly", "Weekly", "Love", "Health", "Pets", "Finance", "Career",
];
const IMAGE_ACCEPT = "image/png,image/jpeg,image/gif,image/webp";
const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // same limit as the server

// Returns an error message for an unusable file, or "" when it is fine.
function imageProblem(file) {
    if (!file) return "";
    if (file.size > MAX_IMAGE_BYTES) return "Image must be 3 MB or smaller";
    return "";
}

export default function ManageCardPage() {
    const router = useRouter();

    const [menuOpen, setMenuOpen] = useState(false);
    const [showAddCard, setShowAddCard] = useState(false);

    // =====================================CARD LIST (from the API)=====================================
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState("");

    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // =====================================ADD CARD FORM=====================================
    const [cardName, setCardName] = useState("");
    const [prediction, setPrediction] = useState("");

    const [advice, setAdvice] = useState("");
    const [image, setImage] = useState(null);
    const [timeOrCategory, setTimeOrCategory] = useState("Daily");
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");

    // =====================================EDIT CARD=====================================
    const [editingCardId, setEditingCardId] = useState(null);
    const [editName, setEditName] = useState("");
    const [editPrediction, setEditPrediction] = useState("");
    const [editAdvice, setEditAdvice] = useState("");
    const [editTimeOrCategory, setEditTimeOrCategory] = useState("Daily");
    const [editImage, setEditImage] = useState(null);
    const [editSaving, setEditSaving] = useState(false);

    // =====================================LOAD CARDS (+ admin check)=====================================
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch("/api/admin/cards", { cache: "no-store" });
                if (cancelled) return;
                if (res.status === 401) {
                    router.replace("/login");
                    return;
                }
                if (res.status === 403) {
                    router.replace("/profile");
                    return;
                }
                const data = await res.json().catch(() => ({}));
                if (!res.ok || !data.success) {
                    throw new Error(data.message || "Could not load the cards");
                }
                setCards(data.cards);
            } catch (err) {
                if (!cancelled) setPageError(err.message || "Could not load the cards");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [router]);

    // =====================================OPEN ADD CARD=====================================
    const handleOpenAddCard = () => {
        setCardName("");
        setPrediction("");
        setShowAddCard(true);
        setAdvice("");
        setImage(null);
        setTimeOrCategory("Daily");
        setFormError("");
    };
    // =====================================CANCEL ADD CARD=====================================
    const handleCancel = () => {
        setCardName("");
        setPrediction("");
        setShowAddCard(false);
        setAdvice("");
        setImage(null);
        setTimeOrCategory("Daily");
        setFormError("");
    };

    // =====================================SAVE NEW CARD=====================================

    const handleSaveCard = async (event) => {
        event.preventDefault();
        if (saving) return;

        if (
            !cardName.trim() ||
            !prediction.trim() ||
            !advice.trim()
        ) {
            setFormError("Please fill in the card name, prediction and advice");
            return;
        }
        if (!image) {
            setFormError("Please choose a card image");
            return;
        }
        const problem = imageProblem(image);
        if (problem) {
            setFormError(problem);
            return;
        }

        const body = new FormData();
        body.set("name", cardName.trim());
        body.set("category", timeOrCategory);
        body.set("prediction", prediction.trim());
        body.set("advice", advice.trim());
        body.set("image", image);

        setSaving(true);
        setFormError("");
        try {
            // No Content-Type header: the browser adds the multipart boundary itself.
            const res = await fetch("/api/admin/cards", { method: "POST", body });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) {
                throw new Error(data.message || "Could not save the card");
            }
            setCards((currentCards) => [...currentCards, data.card]);
            handleCancel();
        } catch (err) {
            setFormError(err.message || "Something went wrong. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    // =====================================EDIT CARD=====================================
    const handleEditCard = (card) => {
        setEditingCardId(card.id);
        setEditName(card.name || "");
        setEditPrediction(card.prediction || "");
        setEditAdvice(card.advice || "");
        setEditTimeOrCategory(card.category || "Daily");
        setEditImage(null);
        setPageError("");
    };

    // =====================================CANCEL EDIT=====================================
    const handleCancelEdit = () => {
        setEditingCardId(null);
        setEditName("");
        setEditPrediction("");
        setEditAdvice("");
        setEditTimeOrCategory("Daily");
        setEditImage(null);
    };

    // =====================================SAVE EDIT=====================================
    const handleSaveEdit = async (event, id) => {
        event.preventDefault();
        if (editSaving) return;

        if (
            !editName.trim() ||
            !editPrediction.trim() ||
            !editAdvice.trim()
        ) {
            setPageError("Card name, prediction and advice can't be empty");
            return;
        }
        const problem = imageProblem(editImage);
        if (problem) {
            setPageError(problem);
            return;
        }

        const fields = {
            name: editName.trim(),
            category: editTimeOrCategory,
            prediction: editPrediction.trim(),
            advice: editAdvice.trim(),
        };

        let request;
        if (editImage) {
            // A new picture was chosen: send everything as multipart.
            const body = new FormData();
            Object.entries(fields).forEach(([key, value]) => body.set(key, value));
            body.set("image", editImage);
            request = { method: "PATCH", body };
        } else {
            request = {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(fields),
            };
        }

        setEditSaving(true);
        setPageError("");
        try {
            const res = await fetch(`/api/admin/cards/${id}`, request);
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) {
                throw new Error(data.message || "Could not save the card");
            }
            setCards((currentCards) =>
                currentCards.map((card) => (card.id === id ? data.card : card))
            );
            handleCancelEdit();
        } catch (err) {
            setPageError(err.message || "Something went wrong. Please try again.");
        } finally {
            setEditSaving(false);
        }
    };
    // =====================================DELETE CARD=====================================

    const handleDeleteCard = async (id) => {
        if (deleting) return;
        setDeleting(true);
        setPageError("");
        try {
            const res = await fetch(`/api/admin/cards/${id}`, { method: "DELETE" });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) {
                throw new Error(data.message || "Could not delete the card");
            }
            setCards((currentCards) =>
                currentCards.filter(
                    (card) => card.id !== id
                )
            );
        } catch (err) {
            setPageError(err.message || "Something went wrong. Please try again.");
        } finally {
            setDeleting(false);
            setDeleteTarget(null);
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

            {pageError && <p className="login-error">{pageError}</p>}

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
                        {loading && (
                            <tr>
                                <td colSpan={5}>Loading cards…</td>
                            </tr>
                        )}
                        {!loading && cards.length === 0 && (
                            <tr>
                                <td colSpan={5}>No cards yet. Press “+ ADD CARD” to create the first one.</td>
                            </tr>
                        )}
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
                                            <>
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
                                                <input
                                                    type="file"
                                                    accept={IMAGE_ACCEPT}
                                                    aria-label="Replace card image"
                                                    onChange={(event) =>
                                                        setEditImage(event.target.files?.[0] || null)
                                                    }
                                                />
                                            </>
                                        ) : (
                                            <div className="manage-card-name">

                                                {card.image ? (
                                                    <img
                                                        src={card.image}
                                                        alt={card.name}
                                                        className="manage-tarot-card"
                                                        style={{ objectFit: "cover" }}
                                                    />
                                                ) : (
                                                    <TarotCard
                                                        title={
                                                            card.title
                                                        }
                                                        className="manage-tarot-card"
                                                    />
                                                )}
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
                                                {CATEGORY_OPTIONS.map((option) => (
                                                    <option key={option} value={option}>{option}</option>
                                                ))}
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
                                                        disabled={editSaving}
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
                                                        disabled={editSaving}
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

                                    <input
                                        type="file"
                                        accept={IMAGE_ACCEPT}
                                        onChange={(event) =>
                                            setImage(
                                                event.target.files?.[0] || null
                                            )
                                        }
                                    />
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
                                        {CATEGORY_OPTIONS.map((option) => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>

                                </div>

                            </div>

                            {formError && <p className="login-error">{formError}</p>}

                            <div className="add-card-form-divider"></div>

                            <div className="add-card-actions">

                                <button
                                    type="submit"
                                    className="save-card-btn"
                                    disabled={saving}
                                >
                                    {saving ? "SAVING..." : "SAVE CARD"}
                                </button>

                                <button
                                    type="button"
                                    className="cancel-card-btn"
                                    onClick={handleCancel}
                                    disabled={saving}
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
                                disabled={deleting}
                                onClick={() => handleDeleteCard(deleteTarget.id)}
                            >
                                {deleting ? "DELETING..." : "DELETE"}
                            </button>

                            <button
                                type="button"
                                className="delete-cancel-btn"
                                disabled={deleting}
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
