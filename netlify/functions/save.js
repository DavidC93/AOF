const { getDb, verifyToken, jsonResponse } = require('./db');

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return jsonResponse(200, {});
    if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });

    try {
        const user = verifyToken(event.headers.authorization || event.headers.Authorization);
        if (!user) return jsonResponse(401, { error: 'לא מחובר' });

        const { saveData } = JSON.parse(event.body);
        if (!saveData) return jsonResponse(400, { error: 'חסר מידע לשמירה' });

        const sql = getDb();
        await sql`
            INSERT INTO game_saves (user_id, save_data, updated_at)
            VALUES (${user.userId}, ${JSON.stringify(saveData)}, NOW())
            ON CONFLICT (user_id)
            DO UPDATE SET save_data = ${JSON.stringify(saveData)}, updated_at = NOW()
        `;

        return jsonResponse(200, { message: 'המשחק נשמר בענן!' });
    } catch (err) {
        console.error('Save error:', err);
        return jsonResponse(500, { error: 'שגיאת שמירה' });
    }
};
