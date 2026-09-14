"use client";

import { useState } from "react";
import { NavMenu } from "../../components/NavMenu";
import {
    MenuIcon,
    CloseXIcon,
    TarotCard,
} from "../../components/TarotVisual";

const CARD_TYPES = [
    "Category",
    "Daily",
    "Weekly",
    "Monthly",
];

const CATEGORIES = [
    "Love",
    "Finance",
    "Career",
    "Pets",
    "Health",
];

export default function ManageCardPage() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [showAddCard, setShowAddCard] = useState(false);

// =====================================CARD DATA อันนี้เป็น UI เฉยๆ =====================================
    const [cards, setCards] = useState([
        {
            id: 1,
            type: "Category",
            name: "The Lovers",
            title: "THE LOVERS",
            category: "Love",
            prediction:
                "ความสัมพันธ์และการตัดสินใจที่สอดคล้องกับความรู้สึกของตัวเอง",
        },
    ]);
// =====================================ADD CARD FORM=====================================
    const [cardType, setCardType] = useState("Category");
    const [cardName, setCardName] = useState("");
    const [category, setCategory] = useState("Love");
    const [prediction, setPrediction] = useState("");

// =====================================EDIT CARD=====================================
    const [editingCardId, setEditingCardId] = useState(null);
    const [editType, setEditType] = useState("Category");
    const [editName, setEditName] = useState("");
    const [editCategory, setEditCategory] = useState("Love");
    const [editPrediction, setEditPrediction] = useState("");

// =====================================OPEN ADD CARD=====================================
    const handleOpenAddCard = () => {
        setCardType("Category");
        setCardName("");
        setCategory("Love");
        setPrediction("");
        setShowAddCard(true);
    };
// =====================================CANCEL ADD CARD=====================================
    const handleCancel = () => {
        setCardType("Category");
        setCardName("");
        setCategory("Love");
        setPrediction("");
        setShowAddCard(false);
    };

// =====================================SAVE NEW CARD=====================================

    const handleSaveCard = (event) => {
        event.preventDefault();

        if (!cardName.trim() || !prediction.trim()) {
            return;
        }

        const newCard = {
            id: Date.now(),
            type: cardType,
            name: cardName.trim(),
            title: cardName.trim().toUpperCase(),
            prediction: prediction.trim(),
        };

        // Category เท่านั้นที่มี category
        if (cardType === "Category") {
            newCard.category = category;
        }

        setCards((currentCards) => [
            ...currentCards,
            newCard,
        ]);

        handleCancel();
    };

// =====================================START EDIT=====================================
    const handleEditCard = (card) => {
        setEditingCardId(card.id);

        setEditType(card.type || "Category");
        setEditName(card.name || "");
        setEditCategory(card.category || "Love");
        setEditPrediction(card.prediction || "");
    };

// =====================================CANCEL EDIT=====================================
    const handleCancelEdit = () => {
        setEditingCardId(null);
        setEditType("Category");
        setEditName("");
        setEditCategory("Love");
        setEditPrediction("");
    };

// =====================================SAVE EDIT=====================================
    const handleSaveEdit = (event, id) => {
        event.preventDefault();
        if (!editName.trim() || !editPrediction.trim()) {
            return;
        }
        setCards((currentCards) =>
            currentCards.map((card) => {
                if (card.id !== id) {
                    return card;
                }
                const updatedCard = {
                    ...card,
                    type: editType,
                    name: editName.trim(),
                    title: editName
                        .trim()
                        .toUpperCase(),
                    prediction: editPrediction.trim(),
                };
                if (editType === "Category") {
                    updatedCard.category =
                        editCategory;
                } else {
                    delete updatedCard.category;
                }
                return updatedCard;
            })
        );
        handleCancelEdit();
    };
// =====================================DELETE CARD=====================================

    const handleDeleteCard = (id) => {
        setCards((currentCards) =>
            currentCards.filter(
                (card) => card.id !== id
            )
        );
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
            {/* =====================================CARD TABLE===================================== */}
            <section className="manage-card-table-wrapper">
                <table className="manage-card-table">

                    <thead>
                        <tr>
                            <th>CARD NAME</th>
                            <th>CARD TYPE</th>
                            <th>CATEGORY</th>
                            <th>PREDICTION</th>
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
                                            <input
                                                type="text"
                                                value={
                                                    editName
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    setEditName(
                                                        event
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

                                    <td>

                                        {isEditing ? (
                                            <select
                                                value={
                                                    editType
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    setEditType(
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                            >

                                                {CARD_TYPES.map(
                                                    (item) => (
                                                        <option
                                                            key={
                                                                item
                                                            }
                                                            value={
                                                                item
                                                            }
                                                        >
                                                            {
                                                                item
                                                            }
                                                        </option>
                                                    )
                                                )}

                                            </select>
                                        ) : (
                                            <span>
                                                {
                                                    card.type
                                                }
                                            </span>
                                        )}

                                    </td>
                                    {/* CATEGORY */}

                                    <td>
                                        {card.type ===
                                        "Category" ? (
                                            isEditing ? (
                                                <select
                                                    value={
                                                        editCategory
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        setEditCategory(
                                                            event
                                                                .target
                                                                .value
                                                        )
                                                    }
                                                >
                                                    {CATEGORIES.map(
                                                        (
                                                            item
                                                        ) => (
                                                            <option
                                                                key={
                                                                    item
                                                                }
                                                                value={
                                                                    item
                                                                }
                                                            >
                                                                {
                                                                    item
                                                                }
                                                            </option>
                                                        )
                                                    )}

                                                </select>
                                            ) : (
                                                <span>
                                                    {
                                                        card.category
                                                    }
                                                </span>
                                            )
                                        ) : (
                                            <span>—</span>
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
                                                            handleSaveEdit(
                                                                event,
                                                                card.id
                                                            )
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
                                                        onClick={() =>
                                                            handleDeleteCard(
                                                                card.id
                                                            )
                                                        }
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
                            onSubmit={
                                handleSaveCard
                            }
                        >
                            {/* CARD TYPE */}
                            <label>
                                CARD TYPE
                            </label>
                            <select
                                value={cardType}
                                onChange={(
                                    event
                                ) =>
                                    setCardType(
                                        event
                                            .target
                                            .value
                                    )
                                }
                            >
                                {CARD_TYPES.map(
                                    (item) => (
                                        <option
                                            key={item}
                                            value={item}
                                        >
                                            {item}
                                        </option>
                                    )
                                )}
                            </select>
                            {/* CARD NAME */}
                            <label>
                                CARD NAME
                            </label>
                            <input
                                type="text"
                                value={cardName}
                                onChange={(
                                    event
                                ) =>
                                    setCardName(
                                        event
                                            .target
                                            .value
                                    )
                                }
                            />
                            {/* CATEGORY */}
                            {cardType ===
                                "Category" && (
                                <>
                                    <label>
                                        CATEGORY
                                    </label>

                                    <select
                                        value={
                                            category
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setCategory(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    >
                                        {CATEGORIES.map(
                                            (
                                                item
                                            ) => (
                                                <option
                                                    key={
                                                        item
                                                    }
                                                    value={
                                                        item
                                                    }
                                                >
                                                    {
                                                        item
                                                    }
                                                </option>
                                            )
                                        )}

                                    </select>
                                </>
                            )}
                            {/* PREDICTION */}
                            <label>
                                PREDICTION
                            </label>
                            <textarea
                                rows="2"
                                value={
                                    prediction
                                }
                                onChange={(
                                    event
                                ) =>
                                    setPrediction(
                                        event
                                            .target
                                            .value
                                    )
                                }
                            />
                            <div className="add-card-form-divider"></div>
                            {/* BUTTONS */}
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
                                    onClick={
                                        handleCancel
                                    }
                                >
                                    CANCEL
                                </button>
                            </div>
                        </form>
                    </aside>
                </div>
            )}
        </main>
    );
}
