const { neon } = require('@netlify/neon');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'aof-dev-secret-change-in-production';

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

module.exports = { getDb, createToken, verifyToken, corsHeaders, jsonResponse };
