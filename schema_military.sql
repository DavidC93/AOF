-- Military Config Table (with combat stats)
-- Run this SQL in the Neon Dashboard SQL Editor

DROP TABLE IF EXISTS military_config;

CREATE TABLE military_config (
    id VARCHAR(30) PRIMARY KEY,
    category VARCHAR(10) NOT NULL CHECK (category IN ('weapon', 'armor', 'unit')),
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
    color VARCHAR(10) DEFAULT '#ffffff'
);

-- === Weapons (כלי נשק) ===
INSERT INTO military_config (id, category, name, icon, cost, sort_order) VALUES
('woodSword',  'weapon', 'חרב עץ',        '🗡️', '{"plank": 2}', 1),
('ironSword',  'weapon', 'חרב ברזל',      '🗡️', '{"steel": 2, "leather": 1}', 2),
('steelSword', 'weapon', 'חרב פלדה',      '🗡️', '{"steelIngot": 2, "leather": 1}', 3),
('nickelSword','weapon', 'חרב ניקל',      '🗡️', '{"nickelSteel": 2, "leather": 1}', 4),
('woodBow',    'weapon', 'קשת עץ',        '🏹', '{"plank": 3, "woolThread": 1}', 5),
('longBow',    'weapon', 'קשת ארוכה',     '🏹', '{"plank": 5, "steel": 2, "woolThread": 2}', 6),
('advBow',     'weapon', 'קשת מתקדמת',    '🏹', '{"plank": 8, "steelIngot": 3, "woolThread": 2}', 7),
('crossbow',   'weapon', 'קשת צולבת',     '🏹', '{"nickelSteel": 3, "woolThread": 2}', 8),
('horses',     'weapon', 'סוס',           '🐎', '{"bread": 5}', 9);

-- === Armor (שריונות) ===
INSERT INTO military_config (id, category, name, icon, cost, sort_order) VALUES
('leatherArmor',    'armor', 'שריון עור',          '🦺', '{"leather": 3}', 20),
('advLeatherArmor', 'armor', 'שריון עור מתקדם',   '🦺', '{"leather": 6, "steelIngot": 2}', 21),
('ironArmor',       'armor', 'שריון ברזל',         '🛡️', '{"steel": 3}', 22),
('steelArmor',      'armor', 'שריון פלדה',         '🛡️', '{"steelIngot": 3}', 23),
('nickelArmor',     'armor', 'שריון ניקל',         '🛡️', '{"nickelSteel": 3}', 24),
('steelShield',     'armor', 'מגן פלדה',           '🛡️', '{"steelIngot": 4}', 25),
('nickelShield',    'armor', 'מגן ניקל',           '🛡️', '{"nickelSteel": 4}', 26);

-- === Units - Ground (לוחמי קרקע) ===
INSERT INTO military_config (id, category, name, icon, cost, sort_order, power, hp, atk, rate, range_m, speed, accuracy, armor, penetration, is_ranged, shape, color) VALUES
('scout',        'unit', 'טירון',          '⚔️', '{"people":1,"woodSword":1,"leatherArmor":1}',                         100, 1,  10, 2, 1.0,  1, 1.0, 0.75,  5,  0, FALSE, 'circle',  '#ffffff'),
('fighter',      'unit', 'לוחם',           '⚔️', '{"people":1,"ironSword":1,"ironArmor":1}',                             101, 6,  20, 4, 1.0,  1, 1.1, 0.80, 10,  5, FALSE, 'circle',  '#40c070'),
('vetFighter',   'unit', 'לוחם מנוסה',    '⚔️', '{"people":1,"steelSword":1,"steelArmor":1}',                           102, 14, 30, 6, 0.9,  1, 1.2, 0.85, 20,  8, FALSE, 'circle',  '#4090ff'),
('eliteFighter', 'unit', 'לוחם עילית',    '⚔️', '{"people":1,"nickelSword":1,"nickelArmor":1}',                         103, 32, 40, 8, 0.8,  1, 1.4, 0.90, 40, 15, FALSE, 'circle',  '#e04040'),
('tank',         'unit', 'משוריין',        '🛡️', '{"people":1,"steelSword":1,"steelArmor":1,"steelShield":1}',           104, 16, 60, 3, 1.6,  1, 0.6, 0.80, 30,  8, FALSE, 'hexagon', '#4090ff'),
('eliteTank',    'unit', 'משוריין עילית', '🛡️', '{"people":1,"nickelSword":1,"nickelArmor":1,"nickelShield":1}',        105, 40,100, 5, 1.5,  1, 0.7, 0.80, 60, 10, FALSE, 'hexagon', '#e04040');

-- === Units - Archers (קשתים) ===
INSERT INTO military_config (id, category, name, icon, cost, sort_order, power, hp, atk, rate, range_m, speed, accuracy, armor, penetration, is_ranged, shape, color) VALUES
('archer',       'unit', 'קשת',            '🎯', '{"people":1,"woodBow":1}',                                            110, 2,  10, 2, 1.2,  8, 1.3, 0.75,  0,  5, TRUE, 'triangle', '#ffffff'),
('sniper',       'unit', 'קשת צלף',       '🎯', '{"people":1,"longBow":1,"leatherArmor":1}',                           111, 5,  20, 6, 1.4, 10, 1.4, 0.85,  5, 10, TRUE, 'triangle', '#40c070'),
('eliteArcher',  'unit', 'קשת עילית',     '🎯', '{"people":1,"advBow":1,"advLeatherArmor":1}',                         112, 12, 30,10, 1.2, 12, 1.5, 0.90, 15, 20, TRUE, 'triangle', '#4090ff'),
('crossbowman',  'unit', 'קלע',            '🎯', '{"people":1,"crossbow":1,"advLeatherArmor":1}',                       113, 36, 40,18, 1.4, 15, 1.6, 0.90, 15, 35, TRUE, 'triangle', '#e04040');

-- === Units - Knights (אבירים) ===
INSERT INTO military_config (id, category, name, icon, cost, sort_order, power, hp, atk, rate, range_m, speed, accuracy, armor, penetration, is_ranged, shape, color) VALUES
('knight',       'unit', 'אביר',           '🏇', '{"people":1,"ironSword":1,"ironArmor":1,"horses":1}',                 120, 8,  30, 5, 1.4,  2, 2.0, 0.75, 10,  8, FALSE, 'square', '#40c070'),
('vetKnight',    'unit', 'אביר מנוסה',    '🏇', '{"people":1,"steelSword":1,"steelArmor":1,"steelShield":1,"horses":1}',121, 20, 50, 7, 1.3,  2, 2.2, 0.80, 20, 14, FALSE, 'square', '#4090ff'),
('eliteKnight',  'unit', 'אביר עילית',    '🏇', '{"people":1,"nickelSword":1,"nickelArmor":1,"nickelShield":1,"horses":1}',122, 50, 80, 9, 1.2,  2, 2.4, 0.85, 30, 20, FALSE, 'square', '#e04040');
