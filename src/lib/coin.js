import db from "./db";

export async function getCoins(accountId) {
    const [rows] = await db.execute(
        "SELECT coin FROM accounts WHERE id = ?",
        [accountId]
    );

    if (rows.length === 0) {
        throw new Error("Account not found");
    }

    return rows[0].coin;
}

export async function addCoins(accountId, amount) {
    const [result] = await db.execute(
        "UPDATE accounts SET coin = coin + ? WHERE id = ?",
        [amount, accountId]
    );

    if (result.affectedRows === 0) {
        throw new Error("Account not found");
    }

    return getCoins(accountId);
}

export async function spendCoins(accountId, amount) {
    const [result] = await db.execute(
        `UPDATE accounts
         SET coin = coin - ?
         WHERE id = ?
         AND coin >= ?`,
        [amount, accountId, amount]
    );

    if (result.affectedRows === 0) {
        return false;
    }

    return true;
}