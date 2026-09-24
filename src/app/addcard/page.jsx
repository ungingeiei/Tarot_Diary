"use client";

import { useState } from "react";
import { NavMenu } from "../../components/NavMenu";
import {
    MenuIcon,
    CloseXIcon,
    TarotCard,
} from "../../components/TarotVisual";


export default function ManageCardPage() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [showAddCard, setShowAddCard] = useState(false);


const [cards, setCards] = useState([
    {
        id: 1,
        name: "The Lovers",
        title: "THE LOVERS",
        category: "Love",
        prediction:
            "ความสัมพันธ์และการตัดสินใจที่สอดคล้องกับความรู้สึกของตัวเอง",
        advice:
            "เชื่อมั่นในความรู้สึกของตนเองและสื่อสารอย่างตรงไปตรงมา",
    },
]);

    // =====================================ADD CARD FORM=====================================
    const [cardName, setCardName] = useState("");
    const [prediction, setPrediction] = useState("");

    const [advice, setAdvice] = useState("");
    const [image, setImage] = useState(null);
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
        setImage(null);
        setTimeOrCategory("Daily");
    };
    // =====================================CANCEL ADD CARD=====================================
    const handleCancel = () => {
        setCardName("");
        setPrediction("");
        setShowAddCard(false);
        setAdvice("");
        setImage(null);
        setTimeOrCategory("Daily");
    };

    // =====================================SAVE NEW CARD=====================================

    const handleSaveCard = (event) => {
        event.preventDefault();

        if (
            !cardName.trim() ||
            !prediction.trim() ||
            !advice.trim()
        ) {
            return;
        }

        const newCard = {
            id: Date.now(),
            name: cardName.trim(),
            title: cardName.trim().toUpperCase(),
            prediction: prediction.trim(),
            advice: advice.trim(),
            category: timeOrCategory,
            image,
        };

        setCards((currentCards) => [
            ...currentCards,
            newCard,
        ]);

        handleCancel();
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
    const handleSaveEdit = (event, id) => {
        event.preventDefault();
        if (
            !editName.trim() ||
            !editPrediction.trim() ||
            !editAdvice.trim()
        ) {
            return;
        }
        setCards((currentCards) =>
            currentCards.map((card) => {
                if (card.id !== id) {
                    return card;
                }
                const updatedCard = {
                    ...card,
                    name: editName.trim(),
                    title: editName
                        .trim()
                        .toUpperCase(),
                    prediction: editPrediction.trim(),
                    advice: editAdvice.trim(),
                    category: editTimeOrCategory,
                };
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
                                        accept="image/*"
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
        </main>
    );
}
