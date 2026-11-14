// Tinkercad Circuits - Solar PV System Simulator
// Robust Tinkercad wiring engine: Click-to-Connect + Drag-and-Drop + Short Circuit & Battery Simulation

class TinkercadAudio {
  constructor() {
    this.ctx = null;
    this.lastSparkTime = 0;
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

  playWireSnap() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(450, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  playDelete() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(250, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  playSimStart() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playSpark() {
    this.init();
    if (!this.ctx) return;
    const now = Date.now();
    if (now - this.lastSparkTime < 180) return; // Prevent audio clipping
    this.lastSparkTime = now;

    // Realistic electrical arc sizzle crackle using synthetic noise & oscillator
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.18);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1600;
    filter.Q.value = 2.5;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(45, this.ctx.currentTime + 0.18);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.45, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.18);

    noise.connect(filter);
    filter.connect(gain);
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
    osc.start();
    osc.stop(this.ctx.currentTime + 0.18);
    noise.stop(this.ctx.currentTime + 0.18);
  }

  playAlarm() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }
}

const TK_SOUND = new TinkercadAudio();

class TinkercadCircuits {
  constructor() {
    this.wires = []; // { id, from, to, color }
    this.selectedWireId = null;
    this.currentColor = '#ef4444';
    this.isSimulating = false;
    this.sunlight = 100;

    // Battery State & Simulation
    this.batteryPct = 80;
    this.batteryVolts = 12.7;
    this.batteryState = 'idle'; // 'idle', 'charging', 'discharging', 'empty', 'shorted'

    // Fault & Short Circuit State
    this.activeFaults = []; // [{ type, title, desc, terminals: [], wires: [] }]
    this.sparkParticles = [];
    this.smokeParticles = [];

    // Active wire being drawn
    this.activeStartTerminal = null;
    this.mousePos = { x: 0, y: 0 };
    this.isMouseDownOnTerminal = false;

    // Component Dragging
    this.draggedComponent = null;
    this.dragOffset = { x: 0, y: 0 };

    // DOM Elements Cache
    this.workplane = document.getElementById('workplane');
    this.wiresGroup = document.getElementById('wires-group');
    this.electronDots = document.getElementById('electron-dots');
    this.sparkEffects = document.getElementById('spark-effects');
    this.smokeEffects = document.getElementById('smoke-effects');
    this.tempWire = document.getElementById('temp-wire');
    this.btnSim = document.getElementById('btn-sim');
    this.btnDelete = document.getElementById('btn-delete');
    this.btnClear = document.getElementById('btn-clear');
    this.btnDemo = document.getElementById('btn-demo');
    this.btnFault = document.getElementById('btn-fault');
    this.btnFixShort = document.getElementById('btn-fix-short');
    this.colorSelect = document.getElementById('wire-color-select');
    this.colorSwatch = document.getElementById('current-color-swatch');
    this.sunSlider = document.getElementById('sun-slider');
    this.sunVal = document.getElementById('sun-val');
    this.battSlider = document.getElementById('batt-slider');
    this.battSliderVal = document.getElementById('batt-slider-val');
    this.statusMsg = document.getElementById('status-msg');
    this.sparkBubble = document.getElementById('sim-spark');
    this.sparkTitle = document.getElementById('spark-title');
    this.sparkDesc = document.getElementById('spark-desc');

    // Battery Component DOM Elements
    this.battMeterBar = document.getElementById('batt-meter-bar');
    this.battPctText = document.getElementById('batt-pct-text');
    this.battVoltsText = document.getElementById('batt-volts-text');
    this.battBadge = document.getElementById('batt-badge');
    this.battBadgeIcon = document.getElementById('batt-badge-icon');
    this.battBadgeText = document.getElementById('batt-badge-text');

    // Charge Controller LCD Elements
    this.ccLcdText = document.getElementById('cc-lcd-text');
    this.ccLcdPct = document.getElementById('cc-lcd-pct');
    this.ccLcdMode = document.getElementById('cc-lcd-mode');
    this.ccLed = document.getElementById('cc-led');

    this.init();
  }

  init() {
    this.bindEvents();
    this.setupTerminals();
    this.setupComponentDragging();
    this.updateBatteryUI();
    this.startAnimationLoop();

    window.addEventListener('resize', () => {
      this.renderWires();
    });
  }

  bindEvents() {
    // Wire color dropdown
    this.colorSelect.addEventListener('change', (e) => {
      this.currentColor = e.target.value;
      this.colorSwatch.style.background = this.currentColor;
      if (this.selectedWireId) {
        const wire = this.wires.find(w => w.id === this.selectedWireId);
        if (wire) {
          wire.color = this.currentColor;
          this.renderWires();
        }
      }
    });

    // Delete tool
    this.btnDelete.addEventListener('click', () => {
      this.deleteSelectedWire();
    });

    // Reset wires
    this.btnClear.addEventListener('click', () => {
      this.wires = [];
      this.selectedWireId = null;
      this.activeFaults = [];
      this.cancelDraftWire();
      TK_SOUND.playDelete();
      this.renderWires();
      this.updateTerminalVisuals();
      this.evaluateCircuit();
    });

    // Demo Auto-wire button
    this.btnDemo.addEventListener('click', () => {
      this.autoConnectFullSystem();
    });

    // Test Wrong Wire / Fault button
    if (this.btnFault) {
      this.btnFault.addEventListener('click', () => {
        this.autoConnectFaultySystem();
      });
    }

    // Fix Shorted Wire button in alert banner
    if (this.btnFixShort) {
      this.btnFixShort.addEventListener('click', () => {
        this.fixActiveFault();
      });
    }

    // Keyboard controls
    window.addEventListener('keydown', (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedWireId) {
        this.deleteSelectedWire();
      }
      if (e.key === 'Escape') {
        this.cancelDraftWire();
      }
    });

    // Start / Stop Simulation
    this.btnSim.addEventListener('click', () => {
      this.toggleSimulation();
    });

    // Sunlight slider
    this.sunSlider.addEventListener('input', (e) => {
      this.sunlight = parseInt(e.target.value, 10);
      this.sunVal.textContent = `${this.sunlight}%`;
      if (this.isSimulating) this.evaluateCircuit();
    });

    // Battery Percentage Slider (User interactive control)
    if (this.battSlider) {
      this.battSlider.addEventListener('input', (e) => {
        this.batteryPct = parseFloat(e.target.value);
        if (this.battSliderVal) this.battSliderVal.textContent = `${Math.round(this.batteryPct)}%`;
        this.updateBatteryUI();
        if (this.isSimulating) this.evaluateCircuit();
      });
    }

    // Mouse tracking on workplane for live draft wire
    this.workplane.addEventListener('mousemove', (e) => {
      const wpRect = this.workplane.getBoundingClientRect();
      this.mousePos = {
        x: e.clientX - wpRect.left,
        y: e.clientY - wpRect.top
      };
      if (this.activeStartTerminal) {
        this.updateDraftWire();
      }
    });

    // Clicking anywhere empty on the workplane
    this.workplane.addEventListener('click', (e) => {
      if (!e.target.closest('.tk-terminal') && !e.target.closest('.tk-wire') && !e.target.closest('.tk-toolbar') && !e.target.closest('.sim-spark-bubble')) {
        this.cancelDraftWire();
        this.selectedWireId = null;
        this.renderWires();
      }
    });

    // Right-click cancels draft wire
    this.workplane.addEventListener('contextmenu', (e) => {
      if (this.activeStartTerminal) {
        e.preventDefault();
        this.cancelDraftWire();
      }
    });
  }

  /* ================= TERMINAL WIRING (CLICK-TO-CONNECT & DRAG-AND-DROP) ================= */
  setupTerminals() {
    document.querySelectorAll('.tk-terminal').forEach(term => {
      term.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        TK_SOUND.init();

        if (!this.activeStartTerminal) {
          this.startDraftWire(term);
          this.isMouseDownOnTerminal = true;
        } else if (this.activeStartTerminal === term) {
          this.cancelDraftWire();
        } else {
          this.completeWire(this.activeStartTerminal, term);
        }
      });

      term.addEventListener('mouseup', (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (this.activeStartTerminal && this.activeStartTerminal !== term && this.isMouseDownOnTerminal) {
          this.completeWire(this.activeStartTerminal, term);
        }
      });

      term.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        TK_SOUND.init();

        if (!this.activeStartTerminal) {
          this.startDraftWire(term);
        } else if (this.activeStartTerminal === term) {
          this.cancelDraftWire();
        } else {
          this.completeWire(this.activeStartTerminal, term);
        }
      }, { passive: false });
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDownOnTerminal = false;
    });
  }

  getTerminalCenter(el) {
    const screw = el.querySelector('.terminal-screw');
    const rect = screw ? screw.getBoundingClientRect() : el.getBoundingClientRect();
    const wpRect = this.workplane.getBoundingClientRect();
    return {
      x: rect.left - wpRect.left + rect.width / 2,
      y: rect.top - wpRect.top + rect.height / 2
    };
  }

  startDraftWire(term) {
    this.activeStartTerminal = term;
    term.classList.add('active-src');

    // Auto-select color based on terminal polarity
    const type = term.dataset.type;
    const pol = term.dataset.pol;
    if (type === 'DC') {
      this.currentColor = (pol === '+') ? '#ef4444' : '#1e293b';
    } else {
      this.currentColor = (pol === 'L') ? '#f59e0b' : '#0284c7';
    }
    this.colorSelect.value = this.currentColor;
    this.colorSwatch.style.background = this.currentColor;

    this.tempWire.style.stroke = this.currentColor;
    this.tempWire.style.display = 'block';
    this.updateDraftWire();

    this.statusMsg.textContent = `Wire started from ${term.title}. Click destination terminal to connect (Esc to cancel).`;
  }

  updateDraftWire() {
    if (!this.activeStartTerminal) return;
    const p1 = this.getTerminalCenter(this.activeStartTerminal);
    const p2 = this.mousePos;

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const sag = Math.min(Math.hypot(dx, dy) * 0.18, 45);

    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2 + sag;

    this.tempWire.setAttribute('d', `M ${p1.x} ${p1.y} Q ${midX} ${midY} ${p2.x} ${p2.y}`);
  }

  cancelDraftWire() {
    if (this.activeStartTerminal) {
      this.activeStartTerminal.classList.remove('active-src');
      this.activeStartTerminal = null;
    }
    this.tempWire.style.display = 'none';
    this.isMouseDownOnTerminal = false;
    this.statusMsg.textContent = 'Click a terminal to start wire, then click destination terminal.';
  }

  completeWire(fromTerm, toTerm) {
    const fromId = fromTerm.dataset.id;
    const toId = toTerm.dataset.id;

    // Check if wire already exists
    const exists = this.wires.some(w => (w.from === fromId && w.to === toId) || (w.from === toId && w.to === fromId));
    if (exists) {
      this.cancelDraftWire();
      this.statusMsg.textContent = 'A wire is already connected between these terminals!';
      return;
    }

    const wire = {
      id: `w_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      from: fromId,
      to: toId,
      color: this.currentColor
    };

    this.wires.push(wire);
    this.selectedWireId = wire.id;
    this.cancelDraftWire();

    TK_SOUND.playWireSnap();
    this.renderWires();
    this.updateTerminalVisuals();

    this.statusMsg.textContent = `Connected ${fromTerm.title} to ${toTerm.title}.`;
    this.evaluateCircuit();
  }

  deleteSelectedWire() {
    if (!this.selectedWireId) return;
    this.wires = this.wires.filter(w => w.id !== this.selectedWireId);
    this.selectedWireId = null;
    TK_SOUND.playDelete();
    this.renderWires();
    this.updateTerminalVisuals();
    this.statusMsg.textContent = 'Wire deleted.';
    this.evaluateCircuit();
  }

  updateTerminalVisuals() {
    document.querySelectorAll('.tk-terminal').forEach(t => {
      const id = t.dataset.id;
      const isConnected = this.wires.some(w => w.from === id || w.to === id);
      t.classList.toggle('has-wire', isConnected);
    });
  }

  renderWires() {
    this.wiresGroup.innerHTML = '';

    const faultWireIds = new Set();
    this.activeFaults.forEach(f => f.wires.forEach(id => faultWireIds.add(id)));

    this.wires.forEach(w => {
      const t1 = document.querySelector(`.tk-terminal[data-id="${w.from}"]`);
      const t2 = document.querySelector(`.tk-terminal[data-id="${w.to}"]`);
      if (!t1 || !t2) return;

      const p1 = this.getTerminalCenter(t1);
      const p2 = this.getTerminalCenter(t2);

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const sag = Math.min(Math.hypot(dx, dy) * 0.18, 45);

      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2 + sag;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M ${p1.x} ${p1.y} Q ${midX} ${midY} ${p2.x} ${p2.y}`);

      const isFault = faultWireIds.has(w.id);
      path.setAttribute('class', `tk-wire ${w.id === this.selectedWireId ? 'selected' : ''} ${isFault ? 'short-circuit-wire' : ''}`);
      path.setAttribute('stroke', isFault ? '#ff1e00' : w.color);
      path.setAttribute('id', w.id);

      // Click wire to select it
      path.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectedWireId = w.id;
        this.currentColor = w.color;
        this.colorSelect.value = w.color;
        this.colorSwatch.style.background = w.color;
        this.renderWires();
        this.statusMsg.textContent = 'Wire selected. Press Del or click Trash to remove.';
      });

      this.wiresGroup.appendChild(path);
    });
  }

  /* ================= DRAGGABLE COMPONENTS ON WORKPLANE ================= */
  setupComponentDragging() {
    document.querySelectorAll('.tk-component').forEach(cmp => {
      cmp.addEventListener('mousedown', (e) => {
        if (e.target.closest('.tk-terminal') || e.target.closest('input')) return;
        this.draggedComponent = cmp;
        const rect = cmp.getBoundingClientRect();
        this.dragOffset = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
      });
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.draggedComponent) return;
      const wpRect = this.workplane.getBoundingClientRect();
      let left = e.clientX - wpRect.left - this.dragOffset.x;
      let top = e.clientY - wpRect.top - this.dragOffset.y;

      left = Math.max(10, Math.min(wpRect.width - 240, left));
      top = Math.max(10, Math.min(wpRect.height - 180, top));

      this.draggedComponent.style.left = `${left}px`;
      this.draggedComponent.style.top = `${top}px`;

      this.renderWires();
      if (this.activeStartTerminal) this.updateDraftWire();
    });

    window.addEventListener('mouseup', () => {
      this.draggedComponent = null;
    });
  }

  /* ================= DEMO AUTO-WIRE REFERENCE SYSTEM ================= */
  autoConnectFullSystem() {
    this.wires = [];
    this.selectedWireId = null;
    this.activeFaults = [];
    this.batteryPct = 80;

    const connections = [
      // Solar Panel -> Controller PV
      { from: 'solar_pos', to: 'cc_pv_pos', color: '#ef4444' },
      { from: 'solar_neg', to: 'cc_pv_neg', color: '#1e293b' },
      // Battery -> Controller BATT
      { from: 'batt_pos', to: 'cc_batt_pos', color: '#ef4444' },
      { from: 'batt_neg', to: 'cc_batt_neg', color: '#1e293b' },
      // Controller DC Load -> 12V DC Bulb
      { from: 'cc_load_pos', to: 'dcload_pos', color: '#ef4444' },
      { from: 'cc_load_neg', to: 'dcload_neg', color: '#1e293b' },
      // Battery -> Inverter DC IN
      { from: 'batt_pos', to: 'inv_dc_pos', color: '#ef4444' },
      { from: 'batt_neg', to: 'inv_dc_neg', color: '#1e293b' },
      // Inverter AC Output -> AC Fan
      { from: 'inv_ac_live', to: 'acload_live', color: '#f59e0b' },
      { from: 'inv_ac_neu', to: 'acload_neu', color: '#0284c7' }
    ];

    connections.forEach((c, idx) => {
      this.wires.push({
        id: `demo_${idx}`,
        from: c.from,
        to: c.to,
        color: c.color
      });
    });

    TK_SOUND.playWireSnap();
    this.renderWires();
    this.updateTerminalVisuals();
    this.statusMsg.textContent = 'Auto-connected clean reference circuit! Click "Start Simulation" to run.';

    this.evaluateCircuit();
  }

  /* ================= DEMO SHORT CIRCUIT / WRONG WIRE TEST ================= */
  autoConnectFaultySystem() {
    this.wires = [];
    this.selectedWireId = null;

    // Connect standard parts plus a deliberate wrong reverse-polarity & short circuit connection
    const connections = [
      // Solar Panel -> Controller PV (CORRECT)
      { from: 'solar_pos', to: 'cc_pv_pos', color: '#ef4444' },
      { from: 'solar_neg', to: 'cc_pv_neg', color: '#1e293b' },
      // Battery Pos wired directly to Battery Neg (DEAD SHORT CIRCUIT!)
      { from: 'batt_pos', to: 'batt_neg', color: '#ef4444' }
    ];

    connections.forEach((c, idx) => {
      this.wires.push({
        id: `fault_demo_${idx}`,
        from: c.from,
        to: c.to,
        color: c.color
      });
    });

    TK_SOUND.playWireSnap();
    this.renderWires();
    this.updateTerminalVisuals();

    // Start simulation automatically so user immediately experiences the short circuit
    if (!this.isSimulating) {
      this.toggleSimulation();
    } else {
      this.evaluateCircuit();
    }
  }

  /* ================= ONE-CLICK FIX FOR SHORTED WIRES ================= */
  fixActiveFault() {
    if (!this.activeFaults.length) return;
    const fault = this.activeFaults[0];
    fault.wires.forEach(wireId => {
      this.wires = this.wires.filter(w => w.id !== wireId);
    });

    TK_SOUND.playDelete();
    this.activeFaults = [];
    this.sparkBubble.style.display = 'none';
    this.sparkEffects.innerHTML = '';
    this.smokeEffects.innerHTML = '';
    this.renderWires();
    this.updateTerminalVisuals();
    this.statusMsg.textContent = 'Faulty wire removed! Circuit restored to safe state.';
    this.evaluateCircuit();
  }

  /* ================= FAULT & SHORT CIRCUIT DETECTION ENGINE ================= */
  detectCircuitFaults() {
    const faults = [];
    const getWire = (a, b) => this.wires.find(w => (w.from === a && w.to === b) || (w.from === b && w.to === a));

    // 1. Direct Dead Shorts (+ to - on same device or terminal pair)
    const deadShorts = [
      { a: 'batt_pos', b: 'batt_neg', title: 'Dead Short Circuit: Battery Terminals Bridged!', desc: 'Extreme current! Direct (+) to (-) battery short causes rapid discharge, thermal runaway, and fire hazard!' },
      { a: 'solar_pos', b: 'solar_neg', title: 'Direct Short Circuit: Solar Panel (+) to (-)', desc: 'Solar panel output is bridged together. Panel voltage collapses to 0V!' },
      { a: 'inv_ac_live', b: 'inv_ac_neu', title: 'Mains Short Circuit: 230V AC Live to Neutral!', desc: 'Dangerous 230V AC arc flash! Inverter overload circuit breaker tripped immediately.' },
      { a: 'inv_dc_pos', b: 'inv_dc_neg', title: 'Short Circuit: Inverter DC Input Terminals Bridged!', desc: 'Inverter DC input is dead-shorted together.' },
      { a: 'cc_pv_pos', b: 'cc_pv_neg', title: 'Short Circuit: Controller PV Terminals Bridged!', desc: 'Charge controller PV input terminals are directly bridged.' },
      { a: 'cc_batt_pos', b: 'cc_batt_neg', title: 'Short Circuit: Controller Battery Terminals Bridged!', desc: 'Charge controller battery terminals are directly bridged.' },
      { a: 'cc_load_pos', b: 'cc_load_neg', title: 'Short Circuit: Controller DC Load Terminals Bridged!', desc: 'DC Load output terminals are shorted together.' },
      { a: 'dcload_pos', b: 'dcload_neg', title: 'Short Circuit: 12V Bulb Terminals Bridged Together!', desc: 'DC Bulb terminals are bridged directly together.' },
      { a: 'acload_live', b: 'acload_neu', title: 'Short Circuit: AC Fan Terminals Bridged Together!', desc: 'AC Fan terminals are bridged directly together.' }
    ];

    for (const s of deadShorts) {
      const w = getWire(s.a, s.b);
      if (w) {
        faults.push({
          type: 'dead_short',
          title: s.title,
          desc: s.desc,
          terminals: [s.a, s.b],
          wires: [w.id]
        });
      }
    }

    // 2. High Voltage 230V AC to 12V DC Catastrophic Cross-Connections
    const acTerms = ['inv_ac_live', 'inv_ac_neu', 'acload_live', 'acload_neu'];
    const dcTerms = ['solar_pos', 'solar_neg', 'batt_pos', 'batt_neg', 'cc_pv_pos', 'cc_pv_neg', 'cc_batt_pos', 'cc_batt_neg', 'cc_load_pos', 'cc_load_neg', 'inv_dc_pos', 'inv_dc_neg', 'dcload_pos', 'dcload_neg'];

    for (const wire of this.wires) {
      const isFromAC = acTerms.includes(wire.from);
      const isToAC = acTerms.includes(wire.to);
      const isFromDC = dcTerms.includes(wire.from);
      const isToDC = dcTerms.includes(wire.to);

      if ((isFromAC && isToDC) || (isFromDC && isToAC)) {
        if (wire.from.startsWith('dcload_') || wire.to.startsWith('dcload_')) {
          faults.push({
            type: 'overvoltage',
            title: '💥 Overvoltage Blowout: 12V Bulb on 230V AC!',
            desc: 'Connecting a 12V DC lamp to 230V AC mains output instantly explodes the bulb filament!',
            terminals: [wire.from, wire.to],
            wires: [wire.id]
          });
        } else {
          faults.push({
            type: 'ac_dc_conflict',
            title: '💥 Dangerous AC-to-DC Cross-Wire Fault!',
            desc: 'Catastrophic hazard! Feeding 230V AC mains into low-voltage 12V DC circuits destroys electronics and poses severe shock danger.',
            terminals: [wire.from, wire.to],
            wires: [wire.id]
          });
        }
      }
    }

    // 3. Reverse Polarity Connections ("when you connect the wrong one")
    const polarityChecks = [
      // Solar reversed into CC
      { a: 'solar_pos', b: 'cc_pv_neg', title: '💥 Reverse Polarity: Solar (+) wired to Controller PV (-)', desc: 'Solar array positive is connected to negative input! Charge controller input reverse-polarity protection engaged.' },
      { a: 'solar_neg', b: 'cc_pv_pos', title: '💥 Reverse Polarity: Solar (-) wired to Controller PV (+)', desc: 'Solar array negative connected to positive terminal. System disabled.' },
      // Battery reversed into CC
      { a: 'batt_pos', b: 'cc_batt_neg', title: '💥 Reverse Polarity: Battery (+) wired to Controller (-)', desc: 'Battery polarity is inverted! Dangerous reverse current flow risks blowing controller MOSFETs.' },
      { a: 'batt_neg', b: 'cc_batt_pos', title: '💥 Reverse Polarity: Battery (-) wired to Controller (+)', desc: 'Battery negative connected to positive terminal! Polarity mismatch.' },
      // Battery reversed into Inverter DC
      { a: 'batt_pos', b: 'inv_dc_neg', title: '💥 Reverse Polarity: Battery (+) wired to Inverter DC (-)', desc: 'Inverting DC polarity into inverter dead-shorts internal freewheeling diodes! Heavy spark and blown fuse!' },
      { a: 'batt_neg', b: 'inv_dc_pos', title: '💥 Reverse Polarity: Battery (-) wired to Inverter DC (+)', desc: 'Inverter DC negative connected to positive input! Reverse voltage hazard.' },
      // CC to Inverter reversed
      { a: 'cc_batt_pos', b: 'inv_dc_neg', title: '💥 Reverse Polarity: Controller (+) to Inverter DC (-)', desc: 'Inverter input polarity is reversed from controller.' },
      { a: 'cc_batt_neg', b: 'inv_dc_pos', title: '💥 Reverse Polarity: Controller (-) to Inverter DC (+)', desc: 'Inverter input polarity is reversed from controller.' },
      // DC Load reversed
      { a: 'cc_load_pos', b: 'dcload_neg', title: '⚠️ Reverse Polarity: DC Load (+) to (-)', desc: 'DC Bulb wired in reverse polarity.' },
      { a: 'cc_load_neg', b: 'dcload_pos', title: '⚠️ Reverse Polarity: DC Load (-) to (+)', desc: 'DC Bulb wired in reverse polarity.' }
    ];

    for (const p of polarityChecks) {
      const w = getWire(p.a, p.b);
      if (w) {
        faults.push({
          type: 'reverse_polarity',
          title: p.title,
          desc: p.desc,
          terminals: [p.a, p.b],
          wires: [w.id]
        });
      }
    }

    // 4. DC direct to 230V AC Motor
    for (const wire of this.wires) {
      const isACFan = wire.from.startsWith('acload_') || wire.to.startsWith('acload_');
      const isDirectDC = wire.from.startsWith('solar_') || wire.to.startsWith('solar_') ||
                         wire.from.startsWith('batt_') || wire.to.startsWith('batt_') ||
                         wire.from.startsWith('cc_') || wire.to.startsWith('cc_');
      if (isACFan && isDirectDC) {
        faults.push({
          type: 'dc_to_ac_motor',
          title: '⚠️ Motor Incompatibility: 230V AC Fan on 12V DC',
          desc: 'The 230V AC induction fan cannot run directly on 12V DC. It requires an inverter to supply 230V AC.',
          terminals: [wire.from, wire.to],
          wires: [wire.id]
        });
      }
    }

    return faults;
  }

  /* ================= SIMULATION & LOGIC ================= */
  toggleSimulation() {
    this.isSimulating = !this.isSimulating;

    if (this.isSimulating) {
      TK_SOUND.playSimStart();
      this.btnSim.className = 'tk-sim-btn running';
      this.btnSim.innerHTML = '<span class="sim-icon">■</span><span class="sim-label">Stop Simulation</span>';
      this.statusMsg.textContent = 'Simulation running... Inspecting circuit connections.';
      this.evaluateCircuit();
    } else {
      this.btnSim.className = 'tk-sim-btn start';
      this.btnSim.innerHTML = '<span class="sim-icon">▶</span><span class="sim-label">Start Simulation</span>';
      this.statusMsg.textContent = 'Simulation stopped.';
      this.activeFaults = [];
      this.sparkBubble.style.display = 'none';
      this.sparkEffects.innerHTML = '';
      this.smokeEffects.innerHTML = '';
      this.resetVisualOutputs();
      this.updateBatteryUI();
    }
  }

  isWired(idA, idB) {
    return this.wires.some(w => (w.from === idA && w.to === idB) || (w.from === idB && w.to === idA));
  }

  evaluateCircuit() {
    // Detect faults
    this.activeFaults = this.detectCircuitFaults();

    if (this.activeFaults.length > 0) {
      // FAULT DETECTED!
      const primaryFault = this.activeFaults[0];
      TK_SOUND.playSpark();

      // Show enhanced fault bubble
      this.sparkBubble.style.display = 'block';
      if (this.sparkTitle) this.sparkTitle.textContent = primaryFault.title;
      if (this.sparkDesc) this.sparkDesc.textContent = primaryFault.desc;

      this.statusMsg.textContent = `CRITICAL FAULT: ${primaryFault.title}`;

      // Mark faulty wire
      this.renderWires();
      this.resetVisualOutputs();

      // If battery is involved in short, update battery status
      const hasBattFault = primaryFault.terminals.some(t => t.startsWith('batt_'));
      if (hasBattFault) {
        this.batteryState = 'shorted';
      }

      this.updateBatteryUI();
      return;
    } else {
      // Clear faults
      this.sparkBubble.style.display = 'none';
      this.sparkEffects.innerHTML = '';
      this.smokeEffects.innerHTML = '';
      this.renderWires();
    }

    if (!this.isSimulating) {
      this.resetVisualOutputs();
      this.updateBatteryUI();
      return;
    }

    // Normal circuit connections check
    const hasSolarToCC = this.isWired('solar_pos', 'cc_pv_pos') && this.isWired('solar_neg', 'cc_pv_neg');
    const hasBattToCC = this.isWired('batt_pos', 'cc_batt_pos') && this.isWired('batt_neg', 'cc_batt_neg');
    const hasDCLoad = (this.isWired('cc_load_pos', 'dcload_pos') && this.isWired('cc_load_neg', 'dcload_neg')) ||
                      (this.isWired('batt_pos', 'dcload_pos') && this.isWired('batt_neg', 'dcload_neg'));

    const hasBattToInv = (this.isWired('batt_pos', 'inv_dc_pos') && this.isWired('batt_neg', 'inv_dc_neg')) ||
                         (this.isWired('cc_batt_pos', 'inv_dc_pos') && this.isWired('cc_batt_neg', 'inv_dc_neg'));
    const hasACLoad = this.isWired('inv_ac_live', 'acload_live') && this.isWired('inv_ac_neu', 'acload_neu');

    const isSolarActive = hasSolarToCC && this.sunlight > 0;
    const hasStoredPower = this.batteryPct > 0;
    const hasDCBusPower = (hasBattToCC && hasStoredPower) || isSolarActive;

    // Check if battery is being charged
    const isChargingBattery = hasSolarToCC && hasBattToCC && this.sunlight > 10 && this.batteryPct < 100;

    // 1. Controller LED & Screen
    if (hasBattToCC || isSolarActive) {
      this.ccLed.className = 'lcd-led on';
    } else {
      this.ccLed.className = 'lcd-led';
    }

    // 2. DC Bulb (Requires power from battery or solar)
    const bulbGlass = document.getElementById('dc-bulb-glass');
    const bulbActive = hasDCLoad && hasDCBusPower;
    if (bulbActive) {
      bulbGlass.classList.add('lit');
    } else {
      bulbGlass.classList.remove('lit');
    }

    // 3. Inverter & Fan (Requires DC power from battery or CC)
    const invFan = document.getElementById('inv-fan');
    const invPowered = hasBattToInv && (hasStoredPower || isSolarActive);
    if (invPowered) {
      invFan.classList.add('spin');
    } else {
      invFan.classList.remove('spin');
    }

    // 4. AC Fan Load
    const acFan = document.getElementById('ac-fan-housing');
    const acFanActive = invPowered && hasACLoad;
    if (acFanActive) {
      acFan.classList.add('spinning');
    } else {
      acFan.classList.remove('spinning');
    }

    // Determine Battery State
    if (isChargingBattery && !bulbActive && !acFanActive) {
      this.batteryState = 'charging';
    } else if (isChargingBattery && (bulbActive || acFanActive)) {
      this.batteryState = 'charging';
    } else if (hasStoredPower && (bulbActive || acFanActive)) {
      this.batteryState = 'discharging';
    } else if (this.batteryPct <= 0) {
      this.batteryState = 'empty';
    } else {
      this.batteryState = 'idle';
    }

    this.updateBatteryUI();

    // Status Summary Text
    let okCount = 0;
    if (hasSolarToCC) okCount++;
    if (hasBattToCC) okCount++;
    if (hasDCLoad) okCount++;
    if (hasBattToInv) okCount++;
    if (hasACLoad) okCount++;

    if (this.batteryPct <= 0 && !isSolarActive && (hasDCLoad || hasACLoad)) {
      this.statusMsg.textContent = '⚠️ Low Battery Disconnect: Battery is 0% depleted! Increase sunlight to recharge.';
    } else if (okCount === 5) {
      const chargeText = isChargingBattery ? `• Solar charging (+${((this.sunlight / 100) * 4.5).toFixed(1)}A)` : '';
      this.statusMsg.textContent = `✔ Complete PV System Active: DC Bulb ON, Inverter powering 230V Fan! Battery: ${Math.round(this.batteryPct)}% ${chargeText}`;
    } else {
      this.statusMsg.textContent = `Simulation running. ${okCount}/5 sub-circuits active. Battery: ${Math.round(this.batteryPct)}% (${this.batteryVolts.toFixed(1)}V)`;
    }
  }

  /* ================= BATTERY METERS & UI REFRESH ================= */
  updateBatteryUI() {
    const pct = Math.max(0, Math.min(100, this.batteryPct));

    // Voltage calculation based on state of charge & state
    if (this.batteryState === 'shorted') {
      this.batteryVolts = 0.0;
    } else if (this.batteryState === 'charging') {
      this.batteryVolts = 13.6 + (pct / 100) * 0.8;
    } else if (pct <= 0) {
      this.batteryVolts = 10.5;
    } else {
      this.batteryVolts = 11.6 + (pct / 100) * 1.2;
    }

    // Battery meter bar width and color class
    if (this.battMeterBar) {
      this.battMeterBar.style.width = `${pct}%`;
      this.battMeterBar.className = 'batt-meter-bar';
      if (pct <= 0) {
        this.battMeterBar.classList.add('empty');
      } else if (pct <= 20) {
        this.battMeterBar.classList.add('low');
      } else if (pct <= 50) {
        this.battMeterBar.classList.add('med');
      }
    }

    // Battery values text
    if (this.battPctText) this.battPctText.textContent = `${Math.round(pct)}%`;
    if (this.battVoltsText) this.battVoltsText.textContent = `${this.batteryVolts.toFixed(1)}V`;
    if (this.battSlider) this.battSlider.value = Math.round(pct);
    if (this.battSliderVal) this.battSliderVal.textContent = `${Math.round(pct)}%`;

    // Battery badge status
    if (this.battBadge) {
      this.battBadge.className = 'batt-badge';
      if (this.batteryState === 'shorted') {
        this.battBadge.classList.add('shorted');
        this.battBadgeIcon.textContent = '💥';
        this.battBadgeText.textContent = 'SHORT CIRCUIT!';
      } else if (this.batteryState === 'charging') {
        this.battBadge.classList.add('charging');
        this.battBadgeIcon.textContent = '⚡';
        const amps = ((this.sunlight / 100) * 4.8).toFixed(1);
        this.battBadgeText.textContent = `Charging (+${amps}A)`;
      } else if (this.batteryState === 'discharging') {
        this.battBadge.classList.add('discharging');
        this.battBadgeIcon.textContent = '🔻';
        this.battBadgeText.textContent = 'Discharging (-6.5A)';
      } else if (pct <= 0) {
        this.battBadge.classList.add('depleted');
        this.battBadgeIcon.textContent = '⚠️';
        this.battBadgeText.textContent = 'Depleted (0%)';
      } else if (pct >= 100) {
        this.battBadgeIcon.textContent = '🔋';
        this.battBadgeText.textContent = '100% Full (Float)';
      } else {
        this.battBadgeIcon.textContent = '⚡';
        this.battBadgeText.textContent = 'Standby';
      }
    }

    // Charge Controller LCD sync
    if (this.ccLcdText) this.ccLcdText.textContent = `${this.batteryVolts.toFixed(1)}V`;
    if (this.ccLcdPct) this.ccLcdPct.textContent = `${Math.round(pct)}%`;
    if (this.ccLcdMode) {
      if (this.batteryState === 'shorted') {
        this.ccLcdMode.textContent = 'FAULT!';
        if (this.ccLed) this.ccLed.className = 'lcd-led blink-red';
      } else if (this.batteryState === 'charging') {
        this.ccLcdMode.textContent = 'SOLAR CHG';
      } else if (this.batteryState === 'discharging') {
        this.ccLcdMode.textContent = 'BATT LOAD';
      } else if (pct <= 0) {
        this.ccLcdMode.textContent = 'LOW BATT';
        if (this.ccLed) this.ccLed.className = 'lcd-led blink-red';
      } else {
        this.ccLcdMode.textContent = 'READY';
      }
    }
  }

  resetVisualOutputs() {
    this.ccLed.className = 'lcd-led';
    document.getElementById('dc-bulb-glass').classList.remove('lit');
    document.getElementById('inv-fan').classList.remove('spin');
    document.getElementById('ac-fan-housing').classList.remove('spinning');
  }

  /* ================= ANIMATION & PHYSICS SIMULATION LOOP ================= */
  startAnimationLoop() {
    let t = 0;
    let lastSimTick = Date.now();

    const loop = () => {
      t += 0.02;
      const now = Date.now();
      const dt = (now - lastSimTick) / 1000;
      lastSimTick = now;

      // 1. Electron Flow Animation (Only runs when simulation is active and NO faults)
      this.electronDots.innerHTML = '';
      if (this.isSimulating && this.activeFaults.length === 0) {
        this.wires.forEach(w => {
          const pathEl = document.getElementById(w.id);
          if (!pathEl) return;
          const len = pathEl.getTotalLength();
          if (len <= 0) return;

          const pt = pathEl.getPointAtLength((t % 1.0) * len);
          const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          dot.setAttribute('cx', pt.x);
          dot.setAttribute('cy', pt.y);
          dot.setAttribute('r', '3.5');
          dot.setAttribute('fill', '#ffffff');
          dot.setAttribute('stroke', w.color);
          dot.setAttribute('stroke-width', '1.5');
          dot.setAttribute('class', 'electron-particle');
          this.electronDots.appendChild(dot);
        });
      }

      // 2. Short Circuit Sparks & Smoke Particles Animation
      if (this.activeFaults.length > 0) {
        this.renderFaultVisuals();
        TK_SOUND.playSpark();
      } else {
        this.sparkEffects.innerHTML = '';
        this.smokeEffects.innerHTML = '';
      }

      // 3. Dynamic Battery Physics & Drain/Charge simulation over time
      if (this.isSimulating) {
        if (this.activeFaults.length > 0) {
          // If battery shorted, drain rapidly!
          const hasBattFault = this.activeFaults.some(f => f.terminals.some(term => term.startsWith('batt_')));
          if (hasBattFault && this.batteryPct > 0) {
            this.batteryPct = Math.max(0, this.batteryPct - 4.5 * dt);
            this.updateBatteryUI();
          }
        } else {
          // Normal charge & discharge balance
          const hasSolarToCC = this.isWired('solar_pos', 'cc_pv_pos') && this.isWired('solar_neg', 'cc_pv_neg');
          const hasBattToCC = this.isWired('batt_pos', 'cc_batt_pos') && this.isWired('batt_neg', 'cc_batt_neg');
          const hasDCLoad = (this.isWired('cc_load_pos', 'dcload_pos') && this.isWired('cc_load_neg', 'dcload_neg')) ||
                            (this.isWired('batt_pos', 'dcload_pos') && this.isWired('batt_neg', 'dcload_neg'));
          const hasBattToInv = (this.isWired('batt_pos', 'inv_dc_pos') && this.isWired('batt_neg', 'inv_dc_neg')) ||
                               (this.isWired('cc_batt_pos', 'inv_dc_pos') && this.isWired('cc_batt_neg', 'inv_dc_neg'));
          const hasACLoad = this.isWired('inv_ac_live', 'acload_live') && this.isWired('inv_ac_neu', 'acload_neu');

          let chargeRate = 0;
          if (hasSolarToCC && hasBattToCC && this.sunlight > 0) {
            chargeRate = (this.sunlight / 100) * 0.8; // Up to +0.8% per sec charging
          }

          let loadDrainRate = 0;
          if (hasDCLoad && this.batteryPct > 0) {
            loadDrainRate += 0.35; // DC bulb
          }
          if (hasBattToInv && hasACLoad && this.batteryPct > 0) {
            loadDrainRate += 0.65; // AC Fan
          }

          const netChange = (chargeRate - loadDrainRate) * dt;
          const oldPct = this.batteryPct;
          this.batteryPct = Math.max(0, Math.min(100, this.batteryPct + netChange));

          if (Math.abs(this.batteryPct - oldPct) > 0.05) {
            this.updateBatteryUI();
            if ((oldPct > 0 && this.batteryPct <= 0) || (oldPct < 100 && this.batteryPct >= 100)) {
              this.evaluateCircuit();
            }
          }
        }
      }

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  /* ================= DYNAMIC SPARK & SMOKE GENERATION ================= */
  renderFaultVisuals() {
    this.sparkEffects.innerHTML = '';
    this.smokeEffects.innerHTML = '';

    this.activeFaults.forEach(fault => {
      fault.terminals.forEach(termId => {
        const term = document.querySelector(`.tk-terminal[data-id="${termId}"]`);
        if (!term) return;
        const pt = this.getTerminalCenter(term);

        // Generate jagged electric spark lightning bolts
        for (let i = 0; i < 4; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 12 + Math.random() * 26;
          const x2 = pt.x + Math.cos(angle) * dist;
          const y2 = pt.y + Math.sin(angle) * dist;
          const midX = (pt.x + x2) / 2 + (Math.random() - 0.5) * 16;
          const midY = (pt.y + y2) / 2 + (Math.random() - 0.5) * 16;

          const spark = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          spark.setAttribute('d', `M ${pt.x} ${pt.y} Q ${midX} ${midY} ${x2} ${y2}`);
          spark.setAttribute('class', 'spark-zap-line');
          this.sparkEffects.appendChild(spark);
        }

        // Generate spark star burst
        const star = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        star.setAttribute('cx', pt.x + (Math.random() - 0.5) * 10);
        star.setAttribute('cy', pt.y + (Math.random() - 0.5) * 10);
        star.setAttribute('r', 2 + Math.random() * 4);
        star.setAttribute('class', 'spark-star');
        this.sparkEffects.appendChild(star);

        // Generate rising smoke puff
        const smoke = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        smoke.setAttribute('cx', pt.x + (Math.random() - 0.5) * 16);
        smoke.setAttribute('cy', pt.y - 12 - Math.random() * 20);
        smoke.setAttribute('r', 6 + Math.random() * 10);
        smoke.setAttribute('class', 'smoke-cloud');
        this.smokeEffects.appendChild(smoke);
      });
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.tinkercad = new TinkercadCircuits();
});
