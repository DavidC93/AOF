const { getDb, jsonResponse } = require('./db');

// Cache config for 5 minutes to reduce DB calls
let configCache = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return jsonResponse(200, {});

    try {
        const now = Date.now();
        if (configCache && now - cacheTime < CACHE_TTL) {
            return jsonResponse(200, { config: configCache });
        }

        const sql = getDb();
        const rows = await sql`SELECT id, category, name, icon, power, cost, sort_order, hp, atk, rate, range_m, speed, accuracy, armor, penetration, is_ranged, shape, color FROM military_config ORDER BY sort_order`;

        configCache = rows;
        cacheTime = now;

        return jsonResponse(200, { config: rows });
    } catch (err) {
        console.error('Military config error:', err);
        return jsonResponse(500, { error: 'Failed to load military config' });
    }
};
