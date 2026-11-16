/* ==========================================================================
   SolarWire • Engine & Guided Wiring Challenge
   ========================================================================== */

// --- Audio Synthesizer (Web Audio API) ---
class SoundController {
  constructor() {
    this.ctx = null;
  }
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }
  tone(freq, type, duration, gain = 0.1) {
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      g.gain.setValueAtTime(gain, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }
  snap() { this.tone(580, 'sine', 0.08, 0.12); }
  click() { this.tone(420, 'triangle', 0.05, 0.1); }
  success() {
    this.tone(523.25, 'sine', 0.12, 0.15);
    setTimeout(() => this.tone(659.25, 'sine', 0.16, 0.15), 100);
  }
  error() { this.tone(200, 'sawtooth', 0.22, 0.2); }
}
const sound = new SoundController();

// --- 15 Reference Connections ---
const expected = [
  ['pv.+', 'pvM.IN+', 'red'],
  ['pv.−', 'pvM.IN−', 'black'],
  ['pvM.OUT+', 'cc.PV+', 'red'],
  ['pvM.OUT−', 'cc.PV−', 'black'],
  ['bat.+', 'battM.BAT+', 'red'],
  ['bat.−', 'battM.BAT−', 'black'],
  ['battM.SYS+', 'cc.BAT+', 'red'],
  ['battM.SYS−', 'cc.BAT−', 'black'],
  ['battM.SYS+', 'inv.DC+', 'red'],
  ['battM.SYS−', 'inv.DC−', 'black'],
  ['inv.L', 'load.IN L', 'red'],
  ['inv.N', 'load.IN N', 'black'],
  ['inv.PE', 'socket.E', 'earth'],
  ['load.OUT L', 'socket.L', 'red'],
  ['load.OUT N', 'socket.N', 'black']
];

const terminalNames = {
  'pv.+': 'Solar Panel (+)',
  'pv.−': 'Solar Panel (−)',
  'pvM.IN+': 'PV MCB [IN+]',
  'pvM.IN−': 'PV MCB [IN−]',
  'pvM.OUT+': 'PV MCB [OUT+]',
  'pvM.OUT−': 'PV MCB [OUT−]',
  'bat.+': 'Battery (+)',
  'bat.−': 'Battery (−)',
  'battM.BAT+': 'BATT MCB [BAT+]',
  'battM.BAT−': 'BATT MCB [BAT−]',
  'battM.SYS+': 'BATT MCB [SYS+]',
  'battM.SYS−': 'BATT MCB [SYS−]',
  'cc.PV+': 'Charge Controller [PV+]',
  'cc.PV−': 'Charge Controller [PV−]',
  'cc.BAT+': 'Charge Controller [BAT+]',
  'cc.BAT−': 'Charge Controller [BAT−]',
  'inv.DC+': 'Inverter [DC+]',
  'inv.DC−': 'Inverter [DC−]',
  'inv.L': 'Inverter [L]',
  'inv.N': 'Inverter [N]',
  'inv.PE': 'Inverter [PE Earth]',
  'load.IN L': 'LOAD MCB [IN L]',
  'load.IN N': 'LOAD MCB [IN N]',
  'load.OUT L': 'LOAD MCB [OUT L]',
  'load.OUT N': 'LOAD MCB [OUT N]',
  'socket.L': 'Socket [L]',
  'socket.N': 'Socket [N]',
  'socket.E': 'Socket [E Earth]'
};

const key = (a, b) => [a, b].sort().join('|');
const answers = new Map(expected.map(e => [key(e[0], e[1]), e[2]]));

// Direct Terminal Element Cache (Never fails on CSS escape / special characters)
const terminalElements = new Map();

// --- State Variables ---
let wires = [];
let history = [];
let selectedWireIndex = null;
let startTerminalId = null;
let currentWireColor = 'red';
let guidedMode = true;
let currentHint = null;

let switches = { pvM: false, battM: false, load: false };
let inverterOn = false;
let socketOn = false;
let pluggedIn = false;
let sunOn = true;
let lampCount = 1;
let simSpeed = 1;

let energy = 512.0; // 640 Wh max (nominal 80% = 512 Wh)
let lastTick = Date.now();

let badWires = new Set();
let missingTerminals = new Set();

// --- DOM References ---
const $ = id => document.getElementById(id);
const statusEl = $('status-bar');

function setStatus(msg, isError = false) {
  if (statusEl) {
    statusEl.textContent = msg;
    statusEl.style.color = isError ? '#b91c1c' : '#143d22';
  }
}

// --- Wire Color Selector ---
function setWireColor(c) {
  currentWireColor = c;
  ['red', 'black', 'earth'].forEach(k => {
    const el = $('color-' + k);
    if (el) el.classList.toggle('chosen', k === c);
  });
}

// --- Terminal Coordinate Calculation ---
function getTerminalCenter(id) {
  const term = terminalElements.get(id);
  if (!term) return null;
  const screw = term.querySelector('.screw') || term;
  const rTerm = screw.getBoundingClientRect();
  const rView = $('workbench').getBoundingClientRect();
  return {
    x: rTerm.left - rView.left + rTerm.width / 2,
    y: rTerm.top - rView.top + rTerm.height / 2
  };
}

// --- Manual Terminal Click Handling ---
function handleTerminalClick(id) {
  sound.init();

  if (inverterOn || Object.values(switches).some(Boolean) || socketOn) {
    setStatus('Safety rule: Switch OFF all MCBs, inverter and socket before changing wiring!', true);
    sound.error();
    return;
  }

  // Click 1: Select start terminal
  if (!startTerminalId) {
    startTerminalId = id;
    setStatus(`Selected ${terminalNames[id] || id}. Now click destination terminal.`);
    sound.click();
    renderTerminalHighlights();
    return;
  }

  // Click same terminal: cancel
  if (startTerminalId === id) {
    startTerminalId = null;
    hideDraftWire();
    setStatus('Selection cancelled.');
    renderTerminalHighlights();
    return;
  }

  // Check if connection already exists
  const connKey = key(startTerminalId, id);
  if (wires.some(w => key(w.a, w.b) === connKey)) {
    setStatus('A wire is already connected between these two terminals.', true);
    sound.error();
    startTerminalId = null;
    hideDraftWire();
    renderTerminalHighlights();
    return;
  }

  // Record history for Undo
  saveHistory();

  // Add the wire
  wires.push({
    a: startTerminalId,
    b: id,
    color: currentWireColor
  });
  sound.snap();

  startTerminalId = null;
  hideDraftWire();
  selectedWireIndex = null;
  badWires.clear();
  missingTerminals.clear();

  // Validate wire against reference
  const lastWire = wires[wires.length - 1];
  const expectedColor = answers.get(key(lastWire.a, lastWire.b));

  if (!expectedColor || expectedColor !== lastWire.color) {
    badWires.add(wires.length - 1);
    setStatus('Check wire: destination or color does not match reference. Use "Delete Wire" or "Undo" to fix.', true);
    sound.error();
  } else {
    setStatus(`Connected: ${terminalNames[lastWire.a]} ➔ ${terminalNames[lastWire.b]}`);
    sound.success();
  }

  render();
  updateGuide();
}

function hideDraftWire() {
  const draftWire = $('draft-wire');
  if (draftWire) draftWire.style.display = 'none';
}

// --- History & Undo ---
function saveHistory() {
  history.push(wires.map(w => ({ ...w })));
  if (history.length > 50) history.shift();
}

function undo() {
  if (history.length > 0) {
    wires = history.pop();
    startTerminalId = null;
    hideDraftWire();
    selectedWireIndex = null;
    badWires.clear();
    missingTerminals.clear();
    render();
    updateGuide();
    setStatus('Last change undone.');
    sound.click();
  }
}

function removeSelectedWire() {
  if (selectedWireIndex !== null && wires[selectedWireIndex]) {
    saveHistory();
    wires.splice(selectedWireIndex, 1);
    selectedWireIndex = null;
    badWires.clear();
    missingTerminals.clear();
    render();
    updateGuide();
    setStatus('Wire removed.');
    sound.click();
  }
}

function resetAll() {
  if (wires.length && !confirm('Reset and remove all wires?')) return;
  saveHistory();
  wires = [];
  startTerminalId = null;
  hideDraftWire();
  selectedWireIndex = null;
  badWires.clear();
  missingTerminals.clear();
  render();
  updateGuide();
  setStatus('All wires cleared.');
  sound.click();
}

// --- Auto-Wire Current Step ---
function autoWireStep() {
  sound.init();
  if (inverterOn || Object.values(switches).some(Boolean) || socketOn) {
    setStatus('Switch OFF all switches before wiring.', true);
    sound.error();
    return;
  }
  if (!currentHint) {
    setStatus('All 15 reference connections are already completed!');
    sound.success();
    return;
  }

  saveHistory();
  const k = key(currentHint[0], currentHint[1]);
  wires = wires.filter(w => key(w.a, w.b) !== k);

  wires.push({
    a: currentHint[0],
    b: currentHint[1],
    color: currentHint[2]
  });

  badWires.clear();
  missingTerminals.clear();
  startTerminalId = null;
  hideDraftWire();
  selectedWireIndex = null;

  sound.snap();
  setStatus(`Auto-wired: ${terminalNames[currentHint[0]]} ➔ ${terminalNames[currentHint[1]]}`);
  render();
  updateGuide();
}

// --- Check Wiring ---
function isWiringValid() {
  if (wires.length !== expected.length) return false;
  return wires.every(w => answers.get(key(w.a, w.b)) === w.color);
}

function checkWiring() {
  sound.init();
  badWires.clear();
  missingTerminals.clear();

  let correctCount = 0;
  wires.forEach((w, i) => {
    if (answers.get(key(w.a, w.b)) === w.color) {
      correctCount++;
    } else {
      badWires.add(i);
    }
  });

  expected.forEach(e => {
    const found = wires.some(w => key(w.a, w.b) === key(e[0], e[1]) && w.color === e[2]);
    if (!found) {
      missingTerminals.add(e[0]);
      missingTerminals.add(e[1]);
    }
  });

  render();

  if (badWires.size === 0 && correctCount === expected.length) {
    setStatus('Wiring 100% correct! Next: Switch ON BATT & LOAD MCBs, turn ON Inverter, INSERT PLUG, and turn ON Socket.');
    sound.success();
  } else {
    setStatus(`${correctCount}/${expected.length} correct connections. ${badWires.size} incorrect wire(s). Pulsing gold terminals need attention.`, true);
    sound.error();
  }
}

// --- Reveal Reference Answer ---
function showAnswer() {
  saveHistory();
  wires = expected.map(e => ({ a: e[0], b: e[1], color: e[2] }));
  startTerminalId = null;
  hideDraftWire();
  selectedWireIndex = null;
  badWires.clear();
  missingTerminals.clear();
  render();
  updateGuide();
  setStatus('Complete reference wiring displayed. Switch ON BATT and LOAD MCBs, turn ON inverter, and insert plug.');
  sound.success();
}

// --- Step-by-Step Guided Mode ---
function updateGuide() {
  currentHint = expected.find(e => !wires.some(w => key(w.a, w.b) === key(e[0], e[1]) && w.color === e[2])) || null;

  const banner = $('guide-banner');
  if (banner) {
    banner.classList.toggle('disabled', !guidedMode);
  }

  const completedCount = expected.length - (expected.filter(e => !wires.some(w => key(w.a, w.b) === key(e[0], e[1]) && w.color === e[2])).length);
  const pct = Math.round((completedCount / expected.length) * 100);

  if ($('wire-counter')) $('wire-counter').textContent = `${completedCount} / ${expected.length} Wires`;
  if ($('guide-bar-fill')) $('guide-bar-fill').style.width = pct + '%';

  if (!guidedMode) {
    renderTerminalHighlights();
    return;
  }

  if (currentHint) {
    const stepNum = expected.indexOf(currentHint) + 1;
    if ($('guide-title')) $('guide-title').textContent = `GUIDE • CONNECTION ${stepNum} OF ${expected.length}`;
    const colorLabel = currentHint[2] === 'earth' ? 'GREEN-YELLOW (Earth)' : currentHint[2].toUpperCase();
    if ($('guide-text')) {
      $('guide-text').innerHTML = `<strong>${terminalNames[currentHint[0]] || currentHint[0]}</strong> ➔ <strong>${terminalNames[currentHint[1]] || currentHint[1]}</strong> · Use <strong>${colorLabel}</strong> wire.`;
    }
    setWireColor(currentHint[2]);
  } else {
    if ($('guide-title')) $('guide-title').textContent = 'ALL 15 CONNECTIONS COMPLETED! 🎉';
    if ($('guide-text')) $('guide-text').textContent = 'Follow energization sequence: BATT & LOAD MCBs ON ➔ Inverter ON ➔ Insert Plug ➔ Socket ON.';
  }

  renderTerminalHighlights();
}

function nextHint() {
  updateGuide();
  sound.click();
}

function toggleGuide() {
  guidedMode = !guidedMode;
  const btn = $('btn-guide-toggle');
  if (btn) {
    btn.textContent = `Guided Mode: ${guidedMode ? 'ON' : 'OFF'}`;
    btn.classList.toggle('primary', guidedMode);
  }
  updateGuide();
  sound.click();
}

// --- Interactive Switches & Controls ---
function toggleMCB(id) {
  sound.init();
  switches[id] = !switches[id];
  const lever = $('lever-' + id);
  const txt = $('txt-' + id);
  if (lever) lever.classList.toggle('on', switches[id]);
  if (txt) txt.textContent = switches[id] ? 'ON' : 'OFF';
  sound.click();
  updateSystemState();
}

function toggleInverter() {
  sound.init();
  if (!inverterOn && (!isWiringValid() || !switches.battM || !switches.load)) {
    setStatus('Start-up Sequence: Wire correctly ➔ Turn ON BATT & LOAD MCBs ➔ Then turn ON Inverter.', true);
    sound.error();
    return;
  }
  inverterOn = !inverterOn;
  const btn = $('btn-inv-switch');
  const txt = $('txt-inv-switch');
  if (btn) btn.classList.toggle('on', inverterOn);
  if (txt) txt.textContent = inverterOn ? 'I' : 'O';
  sound.click();
  updateSystemState();
}

function toggleSocket() {
  sound.init();
  if (!socketOn && (!isWiringValid() || !switches.battM || !switches.load || !inverterOn || !pluggedIn)) {
    setStatus('Socket requires: Valid Wiring ➔ BATT & LOAD MCBs ON ➔ Inverter ON ➔ Plug INSERTED.', true);
    sound.error();
    return;
  }
  socketOn = !socketOn;
  const btn = $('btn-socket-switch');
  const txt = $('txt-socket-switch');
  const statusTxt = $('txt-socket-status');
  if (btn) btn.classList.toggle('on', socketOn);
  if (txt) txt.textContent = socketOn ? 'I' : 'O';
  if (statusTxt) statusTxt.textContent = `SOCKET: ${socketOn ? 'ON' : 'OFF'}`;
  sound.click();
  updateSystemState();
}

function togglePlug() {
  sound.init();
  if (socketOn) {
    setStatus('Safety rule: Switch OFF the socket switch before inserting or removing the plug!', true);
    sound.error();
    return;
  }
  pluggedIn = !pluggedIn;
  const btn = $('btn-plug');
  const unit = $('plug-unit');
  const pins = $('plug-pins');
  const cord = $('cord-path');

  if (btn) {
    btn.textContent = pluggedIn ? 'REMOVE PLUG' : 'INSERT PLUG';
    btn.classList.toggle('plugged', pluggedIn);
  }
  if (unit) {
    unit.style.transform = pluggedIn ? 'translate(60px, -230px)' : 'translate(0px, 0px)';
  }
  if (pins) {
    pins.classList.toggle('hidden', pluggedIn);
  }
  if (cord) {
    cord.setAttribute('d', pluggedIn ? 'M 0 60 H 40 V -170 H 130' : 'M 0 60 H 50 V 60 H 90');
  }

  sound.snap();
  setStatus(pluggedIn ? 'Plug inserted into socket.' : 'Plug removed from socket.');
  updateSystemState();
}

function changeLamps(delta) {
  sound.init();
  if (socketOn) {
    setStatus('Safety rule: Switch OFF the socket before changing the number of lamps.', true);
    sound.error();
    return;
  }
  lampCount = Math.max(1, Math.min(3, lampCount + delta));
  if ($('load-title')) $('load-title').textContent = `READY-WIRED LOAD • ${lampCount} × 18 W = ${lampCount * 18} W`;
  if ($('lamp-count-text')) $('lamp-count-text').textContent = `${lampCount} LAMP${lampCount > 1 ? 'S' : ''} (${lampCount * 18} W)`;

  for (let i = 1; i <= 3; i++) {
    const el = $('tube-' + i);
    if (el) el.classList.toggle('hidden', i > lampCount);
  }
  sound.click();
  updateSystemState();
}

function toggleSun() {
  sunOn = !sunOn;
  const btn = $('btn-sun-toggle');
  if (btn) {
    btn.textContent = `☀️ Sun: ${sunOn ? 'ON' : 'OFF'}`;
    btn.classList.toggle('active', sunOn);
  }
  sound.click();
  updateSystemState();
}

function refillBattery() {
  energy = 512.0;
  sound.success();
  setStatus('Battery reset to 80% (512 Wh).');
  updateSystemState();
}

// --- Live Physical Simulation Engine ---
function updateSystemState() {
  const valid = isWiringValid();
  const isOperating = valid && switches.battM && switches.load && inverterOn && pluggedIn && socketOn && energy > 0;

  const solarGen = valid && switches.pvM && switches.battM && sunOn ? 128.0 : 0.0;
  const inverterDraw = valid && switches.battM && inverterOn && energy > 0
    ? (isOperating ? (lampCount * 18.0) / 0.9 : 0.0) + 2.0
    : 0.0;

  const netWatts = solarGen - inverterDraw;

  if ($('pv-watts-text')) $('pv-watts-text').textContent = `${solarGen.toFixed(0)} W`;
  if ($('cc-led-pv')) $('cc-led-pv').classList.toggle('on', solarGen > 0);
  if ($('cc-led-bat')) $('cc-led-bat').classList.toggle('on', valid && switches.battM);
  if ($('cc-status-text')) $('cc-status-text').textContent = solarGen > 0 ? 'CHARGING' : (valid && switches.battM ? 'STANDBY' : 'OFF');
  if ($('inv-led')) $('inv-led').classList.toggle('lit', inverterOn && valid && switches.battM && energy > 0);

  const pct = Math.max(0, Math.min(100, (energy / 640.0) * 100));
  if ($('bat-pct')) $('bat-pct').textContent = pct.toFixed(2) + '%';
  if ($('header-batt-pct')) $('header-batt-pct').textContent = pct.toFixed(0) + '%';
  if ($('bat-fill')) $('bat-fill').style.width = pct + '%';
  if ($('bat-wh')) $('bat-wh').textContent = `${energy.toFixed(1)} / 640 Wh`;
  if ($('bat-net')) $('bat-net').textContent = `${netWatts >= 0 ? '+' : ''}${netWatts.toFixed(1)} W`;

  let stateLabel = 'IDLE';
  if (energy >= 639.9 && netWatts >= 0) stateLabel = 'FULL';
  else if (netWatts > 0) stateLabel = 'CHARGING';
  else if (netWatts < 0) stateLabel = 'DISCHARGING';
  if ($('bat-state')) $('bat-state').textContent = stateLabel;

  let etaStr = 'Time remaining: —';
  if (netWatts > 0 && energy < 640) {
    const mins = Math.ceil(((640 - energy) / netWatts) * 60);
    etaStr = `Time to full: ${Math.floor(mins / 60)}h ${mins % 60}m`;
  } else if (netWatts < 0 && energy > 0) {
    const mins = Math.floor((energy / -netWatts) * 60);
    etaStr = `Est. runtime: ${Math.floor(mins / 60)}h ${mins % 60}m`;
  } else if (energy >= 639.9) {
    etaStr = 'Fully Charged';
  }
  if ($('bat-eta')) $('bat-eta').textContent = etaStr;

  for (let i = 1; i <= 3; i++) {
    const tube = $('tube-' + i);
    if (tube) tube.classList.toggle('lit', isOperating);
  }

  return { solarGen, inverterDraw, isOperating };
}

// --- Simulation Loop ---
function advanceTick() {
  const now = Date.now();
  const dt = Math.max(0, (now - lastTick) / 1000);
  lastTick = now;

  const sim = updateSystemState();
  const netRate = sim.solarGen - sim.inverterDraw;
  energy = Math.max(0, Math.min(640, energy + (netRate * dt * simSpeed) / 3600));

  updateSystemState();
}
setInterval(advanceTick, 250);

// --- Wire Rendering ---
function renderWires() {
  const g = $('wires-group');
  if (!g) return;
  g.innerHTML = '';

  const valid = isWiringValid();
  const isOperating = valid && switches.battM && switches.load && inverterOn && pluggedIn && socketOn && energy > 0;

  wires.forEach((w, i) => {
    const p1 = getTerminalCenter(w.a);
    const p2 = getTerminalCenter(w.b);
    if (!p1 || !p2) return;

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.hypot(dx, dy);
    const sag = Math.min(dist * 0.16, 40);
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2 + sag;

    const pathD = `M ${p1.x} ${p1.y} Q ${midX} ${midY} ${p2.x} ${p2.y}`;

    const wireG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    wireG.setAttribute('class', `wire-path ${selectedWireIndex === i ? 'selected' : ''} ${badWires.has(i) ? 'bad' : ''}`);

    const glow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    glow.setAttribute('d', pathD);
    glow.setAttribute('class', 'wire-glow');
    wireG.appendChild(glow);

    const core = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    core.setAttribute('d', pathD);
    const colorHex = w.color === 'red' ? '#df292c' : w.color === 'black' ? '#181b20' : '#148746';
    core.setAttribute('stroke', colorHex);
    core.setAttribute('class', `wire-core ${w.color === 'earth' ? 'earth' : ''}`);
    wireG.appendChild(core);

    if (isOperating) {
      const energyPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      energyPath.setAttribute('d', pathD);
      energyPath.setAttribute('fill', 'none');
      energyPath.setAttribute('stroke', '#ffffff');
      energyPath.setAttribute('stroke-width', '1.5');
      energyPath.setAttribute('class', 'wire-energy');
      wireG.appendChild(energyPath);
    }

    const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hit.setAttribute('d', pathD);
    hit.setAttribute('class', 'wire-hit');
    hit.addEventListener('click', e => {
      e.stopPropagation();
      selectedWireIndex = (selectedWireIndex === i) ? null : i;
      $('btn-delete').disabled = selectedWireIndex === null;
      renderWires();
      if (selectedWireIndex !== null) {
        setStatus(`Wire selected: ${terminalNames[w.a] || w.a} ➔ ${terminalNames[w.b] || w.b}. Press "Delete Wire" to remove.`);
      }
    });
    wireG.appendChild(hit);

    g.appendChild(wireG);
  });

  if ($('btn-delete')) $('btn-delete').disabled = selectedWireIndex === null;
}

// --- Terminal Highlight Rings ---
function renderTerminalHighlights() {
  terminalElements.forEach(t => {
    t.classList.remove('guide-source', 'guide-dest', 'missing');
  });

  if (guidedMode && currentHint) {
    const srcEl = terminalElements.get(currentHint[0]);
    const dstEl = terminalElements.get(currentHint[1]);
    if (srcEl) srcEl.classList.add('guide-source');
    if (dstEl) dstEl.classList.add('guide-dest');
  }

  if (startTerminalId) {
    const startEl = terminalElements.get(startTerminalId);
    if (startEl) startEl.classList.add('guide-source');
  }

  missingTerminals.forEach(termId => {
    const el = terminalElements.get(termId);
    if (el) el.classList.add('missing');
  });
}

function render() {
  renderWires();
  renderTerminalHighlights();
}

// --- Initialization ---
function init() {
  // Populate Terminal Map and Bind Listeners
  document.querySelectorAll('.terminal').forEach(term => {
    const termId = term.getAttribute('data-id');
    terminalElements.set(termId, term);

    term.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      handleTerminalClick(termId);
    });

    term.addEventListener('touchstart', e => {
      e.preventDefault();
      e.stopPropagation();
      handleTerminalClick(termId);
    }, { passive: false });
  });

  // Draft Wire Tracking on Mouse Move
  const workbench = $('workbench');
  const draftWire = $('draft-wire');
  if (workbench && draftWire) {
    workbench.addEventListener('mousemove', e => {
      if (!startTerminalId) {
        draftWire.style.display = 'none';
        return;
      }
      const p1 = getTerminalCenter(startTerminalId);
      if (!p1) return;
      const rView = workbench.getBoundingClientRect();
      const p2 = {
        x: e.clientX - rView.left,
        y: e.clientY - rView.top
      };
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const sag = Math.min(Math.hypot(dx, dy) * 0.16, 40);
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2 + sag;
      draftWire.setAttribute('d', `M ${p1.x} ${p1.y} Q ${midX} ${midY} ${p2.x} ${p2.y}`);
      draftWire.style.display = 'block';
    });
  }

  // Toolbar Binds
  $('btn-guide-toggle').addEventListener('click', toggleGuide);
  $('btn-auto-step').addEventListener('click', autoWireStep);
  $('btn-next-hint').addEventListener('click', nextHint);
  $('btn-undo').addEventListener('click', undo);
  $('btn-delete').addEventListener('click', removeSelectedWire);
  $('btn-reset').addEventListener('click', resetAll);
  $('btn-check').addEventListener('click', checkWiring);
  $('btn-show-answer').addEventListener('click', () => $('answer-dialog').showModal());

  $('btn-sun-toggle').addEventListener('click', toggleSun);
  $('btn-batt-refill').addEventListener('click', refillBattery);
  $('speed-select').addEventListener('change', e => {
    simSpeed = Number(e.target.value) || 1;
    sound.click();
    updateSystemState();
  });

  // Keyboard Shortcuts
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      startTerminalId = null;
      hideDraftWire();
      renderTerminalHighlights();
      setStatus('Selection cleared.');
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedWireIndex !== null) removeSelectedWire();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      undo();
    }
  });

  window.addEventListener('resize', () => renderWires());

  // Initial State Setup
  updateGuide();
  render();
  updateSystemState();
}

window.addEventListener('DOMContentLoaded', init);
