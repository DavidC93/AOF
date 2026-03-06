const { getDb, verifyToken, signSaveData, verifySaveSignature, jsonResponse } = require('./db');

// Rate limit: max 1 save per 5 seconds per user (in-memory, resets on cold start)
const lastSaveTime = {};

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return jsonResponse(200, {});
    if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });

    try {
        const user = verifyToken(event.headers.authorization || event.headers.Authorization);
        if (!user) return jsonResponse(401, { error: 'לא מחובר' });

        // Rate limit check
        const now = Date.now();
        if (lastSaveTime[user.userId] && now - lastSaveTime[user.userId] < 5000) {
            return jsonResponse(429, { error: 'שמירה מהירה מדי, נסה שוב בעוד כמה שניות' });
        }
        lastSaveTime[user.userId] = now;

        const { saveData, signature: clientSig } = JSON.parse(event.body);
        if (!saveData) return jsonResponse(400, { error: 'חסר מידע לשמירה' });

        const sql = getDb();

        // If there's an existing save with a signature, verify the client sent the correct previous signature
        if (clientSig !== '__first_save__') {
            const existing = await sql`SELECT save_data FROM game_saves WHERE user_id = ${user.userId}`;
            if (existing.length > 0) {
                const existingData = existing[0].save_data;
                const expectedSig = signSaveData(existingData);
                // Client must prove they have the valid previous signature
                if (clientSig !== expectedSig) {
                    console.warn(`HMAC mismatch for user ${user.userId}. Possible tampering.`);
                    return jsonResponse(403, { error: 'שמירה נדחתה — זוהה שינוי לא מורשה במידע. טען את המשחק מהענן.' });
                }
            }
        }

        // Sign the new save data
        const newSignature = signSaveData(saveData);

        await sql`
            INSERT INTO game_saves (user_id, save_data, updated_at)
            VALUES (${user.userId}, ${JSON.stringify(saveData)}, NOW())
            ON CONFLICT (user_id)
            DO UPDATE SET save_data = ${JSON.stringify(saveData)}, updated_at = NOW()
        `;

        return jsonResponse(200, { message: 'המשחק נשמר בענן!', signature: newSignature });
    } catch (err) {
        console.error('Save error:', err);
        return jsonResponse(500, { error: 'שגיאת שמירה' });
    }
};
