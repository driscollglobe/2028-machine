// Blind priors for the 2020 backtest, written as of 2019-12-01 from reporting published before that date.
// PROVISIONAL UNTIL KEVIN REVIEWS THE BLIND PRIORS. Sources are listed in SOURCES.md.
// Shapes match the 2028 model's data so the same sim code runs on them.
'use strict';

// base: operator strength. run: 100 for everyone declared on 2019-12-01 (Harris quit on 2019-12-03 and is left out).
// fit: early states in the 2020 order (IA, NH, NV, SC) plus ST, used for Super Tuesday and the later states.
const CANDS = [
  { id: 'biden', name: 'Joe Biden', role: 'Former VP', age: 77, run: 100, lane: 'anchor', rank: 1, debate: 0.95, base: 24, str: 'Black voters, electability, name', weak: 'Age, debate stumbles, thin money', fit: { IA: 0.85, NH: 0.85, NV: 1.05, SC: 1.6, ST: 1.15 } },
  { id: 'sanders', name: 'Bernie Sanders', role: 'Sen., Vermont', age: 78, run: 100, lane: 'movement', rank: 2, debate: 1.0, base: 16, str: 'Small-dollar money, loyal base', weak: 'October heart attack, ceiling', fit: { IA: 1.05, NH: 1.25, NV: 1.25, SC: 0.85, ST: 1.05 } },
  { id: 'warren', name: 'Elizabeth Warren', role: 'Sen., Massachusetts', age: 70, run: 100, lane: 'movement', rank: 3, debate: 1.08, base: 15, str: 'Plans, organization, college voters', weak: 'Medicare for All financing fight, fading since October', fit: { IA: 1.05, NH: 1.15, NV: 1.0, SC: 0.75, ST: 1.0 } },
  { id: 'buttigieg', name: 'Pete Buttigieg', role: 'Mayor, South Bend', age: 37, run: 100, lane: 'suburb', rank: 4, debate: 1.08, base: 11, str: 'Iowa and New Hampshire polling, money', weak: 'Near zero with Black voters', fit: { IA: 1.35, NH: 1.2, NV: 0.85, SC: 0.45, ST: 0.9 } },
  { id: 'bloomberg', name: 'Michael Bloomberg', role: 'Former Mayor, New York', age: 77, run: 100, lane: 'suburb', rank: 5, debate: 0.85, base: 6, str: 'Unlimited money', weak: 'Late entry, skips the first four states', fit: { IA: 0.1, NH: 0.1, NV: 0.1, SC: 0.1, ST: 1.3 } },
  { id: 'klobuchar', name: 'Amy Klobuchar', role: 'Sen., Minnesota', age: 59, run: 100, lane: 'suburb', rank: 6, debate: 1.04, base: 4, str: 'Midwest pragmatist, debate moments', weak: 'Money, staff stories', fit: { IA: 1.25, NH: 1.1, NV: 0.8, SC: 0.6, ST: 0.9 } },
  { id: 'yang', name: 'Andrew Yang', role: 'Entrepreneur', age: 44, run: 100, lane: 'out', rank: 7, debate: 1.02, base: 4, str: 'Online base, one clear idea', weak: 'No electoral record', fit: { IA: 1.0, NH: 1.1, NV: 1.0, SC: 0.8, ST: 0.95 } },
  { id: 'booker', name: 'Cory Booker', role: 'Sen., New Jersey', age: 50, run: 100, lane: 'anchor', rank: 8, debate: 1.05, base: 3, str: 'Endorsements in Iowa, debate skill', weak: 'Missed the December debate threshold', fit: { IA: 0.95, NH: 0.9, NV: 0.9, SC: 1.3, ST: 1.0 } },
  { id: 'steyer', name: 'Tom Steyer', role: 'Investor', age: 62, run: 100, lane: 'out', rank: 9, debate: 0.95, base: 2.5, str: 'Heavy ad spending in Nevada and South Carolina', weak: 'Self-funder in a populist year', fit: { IA: 0.9, NH: 0.9, NV: 1.3, SC: 1.3, ST: 0.9 } },
  { id: 'gabbard', name: 'Tulsi Gabbard', role: 'Rep., Hawaii', age: 38, run: 100, lane: 'out', rank: 10, debate: 0.98, base: 2, str: 'New Hampshire independents', weak: 'Party hostility', fit: { IA: 0.9, NH: 1.3, NV: 0.9, SC: 0.8, ST: 0.9 } },
  { id: 'castro', name: 'Julián Castro', role: 'Former HUD Secretary', age: 45, run: 100, lane: 'movement', rank: 11, debate: 1.0, base: 1.5, str: 'Latino voters in Nevada', weak: 'Polling near one percent', fit: { IA: 0.8, NH: 0.8, NV: 1.3, SC: 0.8, ST: 1.05 } },
  { id: 'other', name: 'Someone else', role: 'The rest of the field', age: 0, run: 100, lane: 'out', rank: 12, debate: 1.0, base: 2, str: 'Bennet, Delaney, Patrick, Williamson and others', weak: 'Nobody consolidates them', fit: { IA: 1, NH: 1, NV: 1, SC: 1, ST: 1 } }
];

const POOLS = { anchor: ['biden', 'booker'], fight: [], suburb: ['buttigieg', 'klobuchar', 'bloomberg'], working: [], movement: ['sanders', 'warren', 'castro'], out: ['yang', 'steyer', 'gabbard', 'other'] };
const POOL2 = { warren: 'suburb', booker: 'movement', castro: 'anchor', bloomberg: 'anchor', buttigieg: 'anchor', klobuchar: 'anchor', yang: 'movement', gabbard: 'movement', steyer: 'movement' };

// theme fits: affordability and class, the future of work, fighting Trump, competence and electability
const TM = {
  biden: { afford: 0.85, ai: 0.9, fight: 1.15, norm: 1.4 }, sanders: { afford: 1.45, ai: 1.0, fight: 1.0, norm: 0.7 },
  warren: { afford: 1.35, ai: 1.05, fight: 1.05, norm: 0.85 }, buttigieg: { afford: 0.95, ai: 1.1, fight: 0.95, norm: 1.15 },
  bloomberg: { afford: 0.7, ai: 1.0, fight: 1.1, norm: 1.2 }, klobuchar: { afford: 0.9, ai: 0.95, fight: 0.95, norm: 1.2 },
  yang: { afford: 1.0, ai: 1.6, fight: 0.8, norm: 0.8 }, booker: { afford: 1.0, ai: 1.0, fight: 1.05, norm: 1.0 },
  castro: { afford: 1.1, ai: 1.0, fight: 1.0, norm: 0.9 }, steyer: { afford: 1.05, ai: 1.0, fight: 1.2, norm: 0.9 },
  gabbard: { afford: 0.95, ai: 1.0, fight: 0.85, norm: 0.8 }, other: { afford: 1, ai: 1, fight: 1, norm: 1 }
};

// 2020 calendar: Iowa, New Hampshire, Nevada, South Carolina, then Super Tuesday (1,357) and the rest.
// Pledged total 3,979 (DNC Call for the 2020 Convention).
const CALS = { R: ['IA', 'NH', 'NV', 'SC'], NH: ['NH', 'IA', 'NV', 'SC'], IA: ['IA', 'NH', 'NV', 'SC'] };
const DELS = { IA: 41, NH: 24, NV: 36, SC: 54, ST: 1357, LS: 3979 - 41 - 24 - 36 - 54 - 1357 };

// Controls that have no 2020 meaning are set so their 2028-specific branches stay off.
// pAoc 100 keeps the 2028 "AOC stays out" boost to the unnamed field off. Trump approval 42 is roughly
// where the public averages sat at the start of December 2019 (low 40s). Verify against an archived average.
const CONTROLS = { pAoc: '100', pHarris: '0', selLesson: 'muddle', pTrump: '42', selCal: 'R', selDarling: 'none' };

const WATCH = ['biden', 'sanders', 'warren', 'buttigieg', 'bloomberg', 'klobuchar', 'yang', 'booker', 'steyer', 'gabbard', 'castro'];

module.exports = { CANDS, POOLS, POOL2, TM, CALS, DELS, CONTROLS, WATCH };
