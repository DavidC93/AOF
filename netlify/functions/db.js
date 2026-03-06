const { neon } = require('@netlify/neon');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'aof-dev-secret-change-in-production';
const HMAC_SECRET = process.env.JWT_SECRET + '-hmac-save';

function getDb() {
    const sql = neon();
    return sql;
}

function createToken(userId, email) {
    return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '30d' });
}

function verifyToken(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    try {
        return jwt.verify(authHeader.slice(7), JWT_SECRET);
    } catch (e) {
        return null;
    }
}

// HMAC signature for save data integrity
function signSaveData(saveData) {
    const payload = JSON.stringify(saveData);
    return crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex');
}

function verifySaveSignature(saveData, signature) {
    const expected = signSaveData(saveData);
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Content-Type': 'application/json'
    };
}

function jsonResponse(statusCode, body) {
    return { statusCode, headers: corsHeaders(), body: JSON.stringify(body) };
}

module.exports = { getDb, createToken, verifyToken, signSaveData, verifySaveSignature, corsHeaders, jsonResponse };
