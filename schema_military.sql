-- Military Config Table (with combat stats)
-- Run this SQL in the Neon Dashboard SQL Editor

DROP TABLE IF EXISTS military_config;

CREATE TABLE military_config (
    id VARCHAR(20) PRIMARY KEY,
    category VARCHAR(10) NOT NULL CHECK (category IN ('weapon', 'unit')),
    name VARCHAR(50) NOT NULL,
    icon VARCHAR(10) NOT NULL,
    cost JSONB NOT NULL DEFAULT '{}',
    sort_order INTEGER DEFAULT 0,

    -- Combat stats (only relevant for units, NULL for weapons)
    power INTEGER DEFAULT 0,
    hp INTEGER DEFAULT 0,
    atk INTEGER DEFAULT 0,
    rate NUMERIC(4,2) DEFAULT 1.0,
    range_m INTEGER DEFAULT 1,
    speed NUMERIC(4,2) DEFAULT 1.0,
    accuracy NUMERIC(4,2) DEFAULT 0.90,
    armor INTEGER DEFAULT 0,
    penetration INTEGER DEFAULT 0,
    is_ranged BOOLEAN DEFAULT FALSE,
    shape VARCHAR(10) DEFAULT 'circle',
    color VARCHAR(10) DEFAULT '#6aa7ff'
);

-- Weapons (no combat stats needed)
INSERT INTO military_config (id, category, name, icon, cost, sort_order) VALUES
('swords',  'weapon', 'חרב',       '🗡️', '{"steel": 2}', 1),
('armors',  'weapon', 'שריון',     '🦺', '{"steel": 2}', 2),
('shields', 'weapon', 'מגן',       '💠', '{"steel": 4}', 3),
('bows',    'weapon', 'קשת (נשק)', '🏹', '{"plank": 3}', 4),
('horses',  'weapon', 'סוס',       '🐎', '{"bread": 5}', 5);

-- Units (with full combat stats)
INSERT INTO military_config (id, category, name, icon, cost, sort_order, power, hp, atk, rate, range_m, speed, accuracy, armor, penetration, is_ranged, shape, color) VALUES
('archers',  'unit', 'קשת',   '🎯', '{"people": 1, "bows": 1}',                                        10, 1,  8, 3, 1.5, 10, 1.2, 0.85,  5, 10, TRUE,  'triangle', '#6ff0b0'),
('warriors', 'unit', 'לוחם',  '⚔️', '{"people": 1, "swords": 1, "armors": 1}',                          11, 2, 10, 2, 1.0,  1, 1.0, 0.90, 10,  0, FALSE, 'circle',   '#6aa7ff'),
('knights',  'unit', 'אביר',  '🏇', '{"people": 1, "swords": 1, "armors": 1, "shields": 1, "horses": 1}', 12, 3, 20, 5, 1.2,  2, 2.2, 0.80, 20,  0, FALSE, 'square',   '#9aa7ff');
