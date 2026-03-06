const { getDb, verifyToken, signSaveData, jsonResponse } = require('./db');

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return jsonResponse(200, {});
    if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });

    try {
        const user = verifyToken(event.headers.authorization || event.headers.Authorization);
        if (!user) return jsonResponse(401, { error: 'לא מחובר' });

        const sql = getDb();
        const saves = await sql`SELECT save_data, updated_at FROM game_saves WHERE user_id = ${user.userId}`;

        if (saves.length === 0) return jsonResponse(200, { saveData: null, signature: '__first_save__', message: 'אין שמירה בענן' });

        // Generate signature for the loaded data so client can use it for next save
        const signature = signSaveData(saves[0].save_data);

        return jsonResponse(200, {
            saveData: saves[0].save_data,
            signature,
            updatedAt: saves[0].updated_at,
            message: 'נטען בהצלחה!'
        });
    } catch (err) {
        console.error('Load error:', err);
        return jsonResponse(500, { error: 'שגיאת טעינה' });
    }
};
