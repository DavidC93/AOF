const bcrypt = require('bcryptjs');
const { getDb, createToken, jsonResponse } = require('./db');

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return jsonResponse(200, {});
    if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });

    try {
        const { email, password } = JSON.parse(event.body);
        if (!email || !password) return jsonResponse(400, { error: 'נדרשים אימייל וסיסמה' });

        const sql = getDb();
        const users = await sql`SELECT id, email, password_hash FROM users WHERE email = ${email.toLowerCase()}`;
        if (users.length === 0) return jsonResponse(401, { error: 'אימייל או סיסמה שגויים' });

        const user = users[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return jsonResponse(401, { error: 'אימייל או סיסמה שגויים' });

        const token = createToken(user.id, user.email);
        return jsonResponse(200, { token, email: user.email, message: 'התחברת בהצלחה!' });
    } catch (err) {
        console.error('Login error:', err);
        return jsonResponse(500, { error: 'שגיאת שרת' });
    }
};
