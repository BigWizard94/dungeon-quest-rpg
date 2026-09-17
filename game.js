/* ============================================================
   Dungeon Quest RPG - a free and open source D&D-style dungeon crawler
   MIT License. No build step: open index.html and play.
   ============================================================ */
(function () {
'use strict';

/* ---------------- Data ---------------- */

var CLASSES = {
  warrior: { name: 'Warrior', icon: '🛡️', hp: 120, atk: 14, def: 8, mana: 30,
    desc: 'A hardened fighter. Huge health, brutal strikes, rallying cries.' },
  mage: { name: 'Mage', icon: '🧙', hp: 80, atk: 8, def: 4, mana: 100,
    desc: 'Master of the arcane. Devastating spells, fragile body.' },
  rogue: { name: 'Rogue', icon: '🗡️', hp: 95, atk: 12, def: 6, mana: 50,
    desc: 'Silent and deadly. Dirty tricks and strikes from the dark.' }
};

var SPELLS = {
  power_strike: { name: 'Power Strike', icon: '⚔️', cls: 'warrior', mana: 15,
    desc: 'A crushing blow for double attack damage.',
    effect: function (p) { return { dmg: p.atk * 2 }; } },
  war_cry: { name: 'War Cry', icon: '📯', cls: 'warrior', mana: 10,
    desc: '+5 attack for your next 3 turns.',
    effect: function (p) { p.buffAtk = 5; p.buffTurns = 3; return { msg: 'Your attack rises!' }; } },
  second_wind: { name: 'Second Wind', icon: '💨', cls: 'warrior', mana: 20,
    desc: 'Catch your breath: heal 40 HP.',
    effect: function (p) { var h = Math.min(40, p.maxHp - p.hp); p.hp += h; return { msg: 'You recover ' + h + ' HP.' }; } },

  fireball: { name: 'Fireball', icon: '🔥', cls: 'mage', mana: 20,
    desc: 'Hurl flame for 38 damage.',
    effect: function () { return { dmg: 38 }; } },
  frostbolt: { name: 'Frostbolt', icon: '❄️', cls: 'mage', mana: 12,
    desc: '16 damage, and the enemy loses its next turn.',
    effect: function () { return { dmg: 16, skip: true }; } },
  heal: { name: 'Heal', icon: '💚', cls: 'mage', mana: 25,
    desc: 'Mend wounds: restore 55 HP.',
    effect: function (p) { var h = Math.min(55, p.maxHp - p.hp); p.hp += h; return { msg: 'You mend ' + h + ' HP.' }; } },
  lightning: { name: 'Lightning', icon: '⚡', cls: 'mage', mana: 35,
    desc: 'Call down lightning for 60 damage.',
    effect: function () { return { dmg: 60 }; } },

  backstab: { name: 'Backstab', icon: '🔪', cls: 'rogue', mana: 15,
    desc: 'Strike from the shadows for 2.5x attack damage.',
    effect: function (p) { return { dmg: Math.round(p.atk * 2.5) }; } },
  smoke_bomb: { name: 'Smoke Bomb', icon: '💨', cls: 'rogue', mana: 10,
    desc: 'Vanish: the enemy loses its next turn.',
    effect: function () { return { dmg: 0, skip: true, msg: 'You vanish in a cloud of smoke!' }; } },
  poison_blade: { name: 'Poison Blade', icon: '☠️', cls: 'rogue', mana: 12,
    desc: '10 damage now, plus poison: 8 damage for 3 turns.',
    effect: function () { return { dmg: 10, poison: 3 }; } }
};

var MONSTERS = [
  { name: 'Goblin', icon: '👺', hp: 40, atk: 8, def: 2, xp: 25, gold: 30, special: null,
    desc: 'A snarling little raider with a rusty dagger.' },
  { name: 'Skeleton Archer', icon: '💀', hp: 60, atk: 11, def: 3, xp: 40, gold: 45, special: null,
    desc: 'Bones that remember how to aim.' },
  { name: 'Orc Brute', icon: '👹', hp: 95, atk: 14, def: 5, xp: 60, gold: 65, special: null,
    desc: 'A wall of muscle with a bigger axe.' },
  { name: 'Dark Cultist', icon: '🧛', hp: 105, atk: 16, def: 4, xp: 85, gold: 90, special: 'heal',
    desc: 'Chants in the dark. Its wounds knit themselves shut.' },
  { name: 'Ancient Dragon', icon: '🐉', hp: 150, atk: 20, def: 8, xp: 200, gold: 250, special: 'breath',
    desc: 'The master of Emberdeep. Its breath melts stone.' }
];

var SHOP_ITEMS = [
  { id: 'hp_pot', name: 'Health Potion', icon: '🧪', price: 30, desc: 'Restores 50 HP. Drink in battle.' },
  { id: 'mp_pot', name: 'Mana Potion', icon: '🔮', price: 25, desc: 'Restores 40 mana. Drink in battle.' },
  { id: 'sword', name: 'Iron Sword', icon: '🗡️', price: 90, desc: '+5 attack, forever.' },
  { id: 'shield', name: 'Steel Shield', icon: '🛡️', price: 80, desc: '+4 defense, forever.' },
  { id: 'elixir', name: 'Elixir', icon: '✨', price: 120, desc: 'Fully restores HP and mana. Use at camp.' }
];

/* ---------------- Helpers ---------------- */

function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ---------------- State ---------------- */

var state = null;
var SAVE_KEY = 'dungeonQuestSaveV1';

function newGame(name, clsId) {
  var c = CLASSES[clsId] || CLASSES.warrior;
  state = {
    name: (name && name.trim()) ? name.trim().slice(0, 20) : 'Hero',
    cls: clsId in CLASSES ? clsId : 'warrior',
    level: 1, xp: 0, xpNext: 100,
    hp: c.hp, maxHp: c.hp, mana: c.mana, maxMana: c.mana,
    atk: c.atk, def: c.def, gold: 60, room: 0,
    buffAtk: 0, buffTurns: 0,
    inv: { hp_pot: 1, mp_pot: 0, elixir: 0 },
    justLeveled: false, dead: false,
    combat: null
  };
  saveGame();
  render();
}

/* ---------------- Combat ---------------- */

function startRoom() {
  var m = MONSTERS[state.room];
  if (!m) return;
  state.combat = {
    m: { name: m.name, icon: m.icon, hp: m.hp, maxHp: m.hp, atk: m.atk,
         def: m.def, xp: m.xp, gold: m.gold, special: m.special,
         skipNext: false, poisonTurns: 0 },
    turn: 1, log: [], over: false
  };
  addLog(m.icon + ' A wild <b>' + esc(m.name) + '</b> appears! ' + esc(m.desc));
  render();
}

function addLog(html) {
  if (state && state.combat) state.combat.log.push(html);
  if (typeof document === 'undefined') return;
  var el = document.getElementById('combat-log');
  if (el) {
    var d = document.createElement('div');
    d.innerHTML = html;
    el.appendChild(d);
    el.scrollTop = el.scrollHeight;
  }
}

function playerAttack() {
  var c = state.combat;
  if (!c || c.over) return;
  var p = state;
  var dmg = Math.max(1, p.atk + (p.buffAtk || 0) + rnd(-2, 2) - c.m.def);
  c.m.hp -= dmg;
  addLog('🗡️ You strike the ' + esc(c.m.name) + ' for <b>' + dmg + '</b> damage.');
  if (c.m.hp <= 0) { winRoom(); return; }
  enemyTurn();
}

function castSpell(id) {
  var c = state.combat;
  if (!c || c.over) return;
  var p = state, sp = SPELLS[id];
  if (!sp || sp.cls !== p.cls) return;
  if (p.mana < sp.mana) { addLog('Not enough mana for ' + esc(sp.name) + '.'); render(); return; }
  p.mana -= sp.mana;
  var res = sp.effect(p, c.m) || {};
  if (res.dmg) {
    var dmg = Math.max(1, res.dmg + rnd(-2, 2) - c.m.def);
    c.m.hp -= dmg;
    addLog(sp.icon + ' <b>' + esc(sp.name) + '</b> hits the ' + esc(c.m.name) + ' for <b>' + dmg + '</b> damage.');
  } else if (res.msg) {
    addLog(sp.icon + ' <b>' + esc(sp.name) + '</b>: ' + esc(res.msg));
  }
  if (res.skip) c.m.skipNext = true;
  if (res.poison) c.m.poisonTurns = res.poison;
  if (c.m.hp <= 0) { winRoom(); return; }
  enemyTurn();
}

function drinkPotion(kind) {
  var c = state.combat;
  if (!c || c.over) return;
  var p = state;
  if ((p.inv[kind] || 0) <= 0) {
    addLog('You have no ' + (kind === 'hp_pot' ? 'Health Potions' : 'Mana Potions') + ' left.');
    render(); return;
  }
  p.inv[kind]--;
  if (kind === 'hp_pot') {
    var h = Math.min(50, p.maxHp - p.hp);
    p.hp += h;
    addLog('🧪 You drink a Health Potion and recover <b>' + h + '</b> HP.');
  } else {
    var m = Math.min(40, p.maxMana - p.mana);
    p.mana += m;
    addLog('🔮 You drink a Mana Potion and recover <b>' + m + '</b> mana.');
  }
  enemyTurn();
}

function tryFlee() {
  var c = state.combat;
  if (!c || c.over) return;
  if (Math.random() < 0.6) {
    addLog('🏃 You slip away from the ' + esc(c.m.name) + '.');
    state.combat = null;
    state.buffAtk = 0; state.buffTurns = 0;
    saveGame(); render();
  } else {
    addLog('🥾 You fail to escape!');
    enemyTurn();
  }
}

function endPlayerBuffTick() {
  var p = state;
  if (p.buffTurns > 0) {
    p.buffTurns--;
    if (p.buffTurns === 0) p.buffAtk = 0;
  }
}

function enemyTurn() {
  var c = state.combat;
  if (!c || c.over) return;
  var p = state, m = c.m;

  if (m.poisonTurns > 0) {
    m.poisonTurns--;
    m.hp -= 8;
    addLog('☠️ Poison burns the ' + esc(m.name) + ' for <b>8</b> damage.');
    if (m.hp <= 0) { winRoom(); return; }
  }

  if (m.skipNext) {
    m.skipNext = false;
    addLog('💨 The ' + esc(m.name) + ' stumbles and misses its turn!');
  } else if (m.special === 'heal' && m.hp < m.maxHp && Math.random() < 0.2) {
    var h = Math.min(20, m.maxHp - m.hp);
    m.hp += h;
    addLog('🕯️ The ' + esc(m.name) + ' chants and restores <b>' + h + '</b> HP.');
  } else if (m.special === 'breath' && c.turn % 3 === 0) {
    var bd = Math.max(1, Math.round(m.atk * 1.5) + rnd(-3, 3) - Math.floor(p.def / 2));
    p.hp -= bd;
    addLog('🔥 The ' + esc(m.name) + ' breathes fire for <b>' + bd + '</b> damage!');
  } else {
    var dmg = Math.max(1, m.atk + rnd(-3, 3) - Math.floor(p.def / 2));
    p.hp -= dmg;
    addLog(m.icon + ' The ' + esc(m.name) + ' hits you for <b>' + dmg + '</b> damage.');
  }

  c.turn++;
  endPlayerBuffTick();
  if (p.hp <= 0) { gameOver(); return; }
  render();
}

function winRoom() {
  var c = state.combat, p = state;
  c.over = true;
  p.gold += c.m.gold;
  addLog('🏆 You defeated the <b>' + esc(c.m.name) + '</b>! +' + c.m.gold + ' gold, +' + c.m.xp + ' XP.');
  p.room++;
  p.buffAtk = 0; p.buffTurns = 0;
  var breather = Math.round(p.maxHp * 0.3);
  p.hp = Math.min(p.maxHp, p.hp + breather);
  var focus = Math.round(p.maxMana * 0.5);
  p.mana = Math.min(p.maxMana, p.mana + focus);
  addLog('💤 You catch your breath: recover <b>' + breather + '</b> HP and <b>' + focus + '</b> mana.');
  gainXP(c.m.xp);
  state.combat = null;
  saveGame();
  render();
}

function gainXP(n) {
  var p = state;
  p.xp += n;
  while (p.xp >= p.xpNext) {
    p.xp -= p.xpNext;
    p.level++;
    p.xpNext = 100 * p.level;
    p.maxHp += 20; p.atk += 3; p.def += 2; p.maxMana += 15;
    p.hp = p.maxHp; p.mana = p.maxMana;
    p.justLeveled = true;
  }
}

function gameOver() {
  state.dead = true;
  state.combat = null;
  clearSave();
  render();
}

/* ---------------- Camp: shop & rest ---------------- */

function buyItem(id) {
  var item = null;
  for (var i = 0; i < SHOP_ITEMS.length; i++) if (SHOP_ITEMS[i].id === id) item = SHOP_ITEMS[i];
  var p = state;
  if (!item || p.gold < item.price) { render(); return; }
  p.gold -= item.price;
  if (id === 'sword') p.atk += 5;
  else if (id === 'shield') p.def += 4;
  else p.inv[id] = (p.inv[id] || 0) + 1;
  saveGame(); render();
}

function restAtCamp() {
  var p = state;
  if (p.gold < 25) { render(); return; }
  p.gold -= 25;
  p.hp = p.maxHp; p.mana = p.maxMana;
  saveGame(); render();
}

function useElixir() {
  var p = state;
  if ((p.inv.elixir || 0) <= 0) { render(); return; }
  p.inv.elixir--;
  p.hp = p.maxHp; p.mana = p.maxMana;
  saveGame(); render();
}

/* ---------------- Saving ---------------- */

function saveGame() {
  if (typeof localStorage === 'undefined' || !state || state.dead) return;
  try {
    var s = {};
    for (var k in state) if (k !== 'combat') s[k] = state[k];
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch (e) {}
}

function loadGame() {
  if (typeof localStorage === 'undefined') return false;
  try {
    var raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    state = JSON.parse(raw);
    state.combat = null;
    state.buffAtk = 0; state.buffTurns = 0;
    return true;
  } catch (e) { return false; }
}

function hasSave() {
  if (typeof localStorage === 'undefined') return false;
  try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
}

function clearSave() {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
}

/* ---------------- Rendering (browser only) ---------------- */

function bar(cls, pct) {
  pct = Math.max(0, Math.min(100, Math.round(pct)));
  return '<div class="bar ' + cls + '"><div style="width:' + pct + '%"></div></div>';
}

function playerCard() {
  var p = state, c = CLASSES[p.cls];
  return '<div class="card"><h3>' + c.icon + ' ' + esc(p.name) +
    ' <span class="small">Lv ' + p.level + ' ' + c.name + '</span></h3>' +
    '<div class="stat-line">❤️ HP ' + Math.max(0, p.hp) + '/' + p.maxHp + '</div>' + bar('hp', p.hp / p.maxHp * 100) +
    '<div class="stat-line">🔷 Mana ' + Math.max(0, p.mana) + '/' + p.maxMana + '</div>' + bar('mana', p.mana / p.maxMana * 100) +
    '<div class="stat-line">⭐ XP ' + p.xp + '/' + p.xpNext + '</div>' + bar('xp', p.xp / p.xpNext * 100) +
    '<div class="stat-line">⚔️ ' + p.atk + ' &nbsp; 🛡️ ' + p.def + ' &nbsp; 💰 ' + p.gold + ' gold</div>' +
    '<div class="stat-line">🎒 Potions: 🧪x' + (p.inv.hp_pot || 0) + ' 🔮x' + (p.inv.mp_pot || 0) + ' ✨x' + (p.inv.elixir || 0) + '</div>' +
    '</div>';
}

function showTitle(el) {
  var cont = hasSave() ? '<button onclick="DQ.continueGame()">📜 Continue Adventure</button>' : '';
  el.innerHTML =
    '<h1>⚔️ Dungeon Quest</h1>' +
    '<p class="subtitle">A free & open source dungeon crawler.<br>Five rooms. One dragon. No mercy.</p>' +
    cont +
    '<button onclick="DQ.showCreate()">🆕 New Adventure</button>' +
    '<p class="small center">v1.0 — MIT licensed. Progress saves on this device.</p>';
}

var createCls = 'warrior';
function showCreate(el) {
  createCls = 'warrior';
  var cards = '';
  for (var id in CLASSES) {
    var c = CLASSES[id];
    cards += '<div class="card class-card' + (id === createCls ? ' selected' : '') + '" data-cls="' + id + '">' +
      '<div class="icon">' + c.icon + '</div><b>' + c.name + '</b>' +
      '<div class="stat-line">❤️' + c.hp + ' ⚔️' + c.atk + ' 🛡️' + c.def + ' 🔷' + c.mana + '</div>' +
      '<div class="small">' + c.desc + '</div></div>';
  }
  el.innerHTML =
    '<h1>⚔️ Dungeon Quest</h1><h2>Create your hero</h2>' +
    '<input type="text" id="hero-name" maxlength="20" placeholder="Hero name">' +
    '<div class="class-grid">' + cards + '</div>' +
    '<button class="gold" onclick="DQ.startNew()">⚔️ Begin the Descent</button>' +
    '<button class="ghost" onclick="DQ.render()">← Back</button>';
  var nodes = el.querySelectorAll('.class-card');
  for (var i = 0; i < nodes.length; i++) {
    nodes[i].addEventListener('click', function () {
      createCls = this.getAttribute('data-cls');
      for (var j = 0; j < nodes.length; j++) nodes[j].classList.remove('selected');
      this.classList.add('selected');
    });
  }
}

function showCamp(el) {
  var p = state;
  var html = '<h2>🏕️ Camp — Room ' + Math.min(p.room + 1, 5) + ' of 5</h2>';
  if (p.justLeveled) {
    html += '<div class="banner">⭐ LEVEL UP! You are now level ' + p.level + '. Fully healed!</div>';
    p.justLeveled = false;
  }
  html += playerCard();
  var next = MONSTERS[p.room];
  html += '<button class="danger" onclick="DQ.startRoom()">🚪 Enter Room ' + (p.room + 1) +
    (next ? ': ' + next.icon + ' ' + esc(next.name) : '') + '</button>';
  html += '<div class="btn-row"><button onclick="DQ.showShop()">🛒 Shop</button>' +
    '<button class="gold" onclick="DQ.restAtCamp()">😴 Rest (25g)</button></div>';
  if ((p.inv.elixir || 0) > 0) html += '<button class="ghost" onclick="DQ.useElixir()">✨ Drink Elixir (full restore)</button>';
  html += '<button class="ghost" onclick="DQ.quitToTitle()">💾 Save & Title</button>';
  el.innerHTML = html;
}

function showShop(el) {
  var p = state;
  var html = '<h2>🛒 Dungeon Shop</h2><div class="gold-display">💰 ' + p.gold + ' gold</div>';
  for (var i = 0; i < SHOP_ITEMS.length; i++) {
    var it = SHOP_ITEMS[i];
    var owned = (it.id === 'sword' || it.id === 'shield') ? '' : ' <span class="small">(own ' + (p.inv[it.id] || 0) + ')</span>';
    html += '<div class="card shop-item"><div class="icon">' + it.icon + '</div>' +
      '<div class="info"><b>' + it.name + '</b>' + owned + '<div class="small">' + it.desc + '</div></div>' +
      '<div><div class="price">' + it.price + 'g</div>' +
      '<button ' + (p.gold < it.price ? 'disabled' : '') + ' onclick="DQ.buyItem(\'' + it.id + '\')">Buy</button></div></div>';
  }
  html += '<button class="ghost" onclick="DQ.render()">← Back to Camp</button>';
  el.innerHTML = html;
}

function showCombat(el) {
  var p = state, c = state.combat, m = c.m;
  var html = '<h2>' + m.icon + ' ' + esc(m.name) + '</h2>' +
    '<div class="monster">' + m.icon + '</div>' +
    '<div class="stat-line center">❤️ ' + Math.max(0, m.hp) + '/' + m.maxHp + '</div>' + bar('mhp', m.hp / m.maxHp * 100) +
    '<div class="stat-line center">❤️ You: ' + Math.max(0, p.hp) + '/' + p.maxHp +
    ' &nbsp; 🔷 ' + Math.max(0, p.mana) + '/' + p.maxMana + '</div>' +
    bar('hp', p.hp / p.maxHp * 100) + bar('mana', p.mana / p.maxMana * 100) +
    '<div id="combat-log"></div>';

  html += '<button class="danger" onclick="DQ.playerAttack()">🗡️ Attack</button>';
  html += '<button onclick="DQ.toggleSpells()">✨ Cast Spell ▾</button><div id="spell-list" style="display:none">';
  for (var id in SPELLS) {
    var sp = SPELLS[id];
    if (sp.cls !== p.cls) continue;
    html += '<button class="ghost" ' + (p.mana < sp.mana ? 'disabled' : '') +
      ' onclick="DQ.castSpell(\'' + id + '\')">' + sp.icon + ' ' + sp.name +
      ' <span class="small">(' + sp.mana + ' mana) — ' + sp.desc + '</span></button>';
  }
  html += '</div>';
  html += '<div class="btn-row"><button onclick="DQ.drinkPotion(\'hp_pot\')">🧪 HP (' + (p.inv.hp_pot || 0) + ')</button>' +
    '<button onclick="DQ.drinkPotion(\'mp_pot\')">🔮 Mana (' + (p.inv.mp_pot || 0) + ')</button></div>';
  html += '<button class="ghost" onclick="DQ.tryFlee()">🏃 Flee</button>';
  el.innerHTML = html;

  var log = document.getElementById('combat-log');
  for (var i = 0; i < c.log.length; i++) {
    var d = document.createElement('div');
    d.innerHTML = c.log[i];
    log.appendChild(d);
  }
  log.scrollTop = log.scrollHeight;
}

function showVictory(el) {
  var p = state;
  el.innerHTML = '<h1>🏆 VICTORY!</h1>' +
    '<div class="card center"><div class="monster">🐉</div>' +
    '<p>The Ancient Dragon is slain. Emberdeep is free, hero.</p>' +
    '<p><b>' + esc(p.name) + '</b> — Level ' + p.level + ' ' + CLASSES[p.cls].name + '<br>' +
    '💰 ' + p.gold + ' gold hoarded</p></div>' +
    '<button class="gold" onclick="DQ.showCreate()">🆕 New Adventure</button>' +
    '<button class="ghost" onclick="DQ.quitToTitle()">Title Screen</button>';
  clearSave();
}

function showGameOver(el) {
  el.innerHTML = '<h1>💀 YOU DIED</h1>' +
    '<div class="card center"><p>The dungeon claims another hero.</p>' +
    '<p><b>' + esc(state.name) + '</b> fell in Room ' + Math.min(state.room + 1, 5) + '.</p></div>' +
    '<button class="danger" onclick="DQ.showCreate()">⚔️ Try Again</button>' +
    '<button class="ghost" onclick="DQ.quitToTitle()">Title Screen</button>';
}

function render() {
  if (typeof document === 'undefined') return;
  var el = document.getElementById('app');
  if (!el) return;
  if (!state) { showTitle(el); return; }
  if (state.dead) { showGameOver(el); return; }
  if (state.combat) { showCombat(el); return; }
  if (state.room >= MONSTERS.length) { showVictory(el); return; }
  if (render.shopOpen) { showShop(el); return; }
  showCamp(el);
}
render.shopOpen = false;

function toggleSpells() {
  var el = document.getElementById('spell-list');
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

/* ---------------- Public API ---------------- */

var DQ = {
  CLASSES: CLASSES, SPELLS: SPELLS, MONSTERS: MONSTERS, SHOP_ITEMS: SHOP_ITEMS,
  newGame: newGame, startRoom: startRoom,
  playerAttack: playerAttack, castSpell: castSpell,
  drinkPotion: drinkPotion, tryFlee: tryFlee,
  buyItem: buyItem, restAtCamp: restAtCamp, useElixir: useElixir,
  saveGame: saveGame, loadGame: loadGame, hasSave: hasSave,
  getState: function () { return state; },
  render: render, toggleSpells: toggleSpells,
  showCreate: function () { render.shopOpen = false; if (typeof document !== 'undefined') showCreate(document.getElementById('app')); },
  startNew: function () {
    var name = '';
    if (typeof document !== 'undefined') {
      var input = document.getElementById('hero-name');
      if (input) name = input.value;
    }
    newGame(name, createCls);
  },
  continueGame: function () { if (loadGame()) { render.shopOpen = false; render(); } },
  showShop: function () { render.shopOpen = true; render(); },
  quitToTitle: function () { saveGame(); state = null; render.shopOpen = false; render(); }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DQ;
} else {
  window.DQ = DQ;
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', render);
    } else {
      render();
    }
  }
}

})();
