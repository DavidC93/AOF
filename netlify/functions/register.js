const bcrypt = require('bcryptjs');
const { getDb, createToken, jsonResponse } = require('./db');

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return jsonResponse(200, {});
    if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });

    try {
        const { email, password } = JSON.parse(event.body);
        if (!email || !password) return jsonResponse(400, { error: 'נדרשים אימייל וסיסמה' });
        if (password.length < 6) return jsonResponse(400, { error: 'סיסמה חייבת להכיל לפחות 6 תווים' });

        const sql = getDb();

        // Check if user exists
        const existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()}`;
        if (existing.length > 0) return jsonResponse(409, { error: 'אימייל כבר רשום במערכת' });

        // Hash password and create user
        const hash = await bcrypt.hash(password, 10);
        const result = await sql`INSERT INTO users (email, password_hash) VALUES (${email.toLowerCase()}, ${hash}) RETURNING id`;
        const userId = result[0].id;

        const token = createToken(userId, email.toLowerCase());
        return jsonResponse(200, { token, email: email.toLowerCase(), message: 'נרשמת בהצלחה!' });
    } catch (err) {
        console.error('Register error:', err);
        return jsonResponse(500, { error: 'שגיאת שרת' });
    }
};
