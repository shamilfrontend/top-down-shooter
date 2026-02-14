"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.START_WEAPONS = exports.WEAPONS = exports.CREDITS_START = exports.CREDITS_ROUND_LOSS = exports.CREDITS_ROUND_WIN = exports.CREDITS_KILL = void 0;
exports.CREDITS_KILL = 300;
exports.CREDITS_ROUND_WIN = 3250;
exports.CREDITS_ROUND_LOSS = 1400;
exports.CREDITS_START = 800;
exports.WEAPONS = {
    usp: {
        id: 'usp',
        name: 'USP-S',
        damage: 20,
        magazineSize: 12,
        fireRateMs: 150,
        reloadTimeMs: 2200,
        range: 300,
        spread: 0.02,
    },
    ak47: {
        id: 'ak47',
        name: 'AK-47',
        damage: 35,
        magazineSize: 30,
        fireRateMs: 100,
        reloadTimeMs: 2500,
        range: 600,
        spread: 0.04,
        price: 2700,
    },
    m4: {
        id: 'm4',
        name: 'M4A1',
        damage: 33,
        magazineSize: 30,
        fireRateMs: 90,
        reloadTimeMs: 3100,
        range: 600,
        spread: 0.03,
        price: 3100,
    },
};
exports.START_WEAPONS = {
    ct: 'usp',
    t: 'usp',
};
