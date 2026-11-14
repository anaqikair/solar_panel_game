# ☀️ SolarWire: Solar Photovoltaic Grid Wiring Simulator

An interactive educational electrical engineering game where you wire and power a complete solar photovoltaic system!

## ⚡ Featured Components & Principles
1. **🔋 Battery (DC Energy Storage)**
   - Stores 12V/24V Direct Current chemically.
   - Connected to the Charge Controller for safe charging and to the Inverter to supply power for AC loads.
2. **☀️ Solar Photovoltaic Panel (DC Generation)**
   - Converts photon energy from sunlight into Direct Current (DC).
   - Dynamic power generation affected by the real-time **Sunlight slider** (0% – 100%).
3. **🔄 Inverter (DC to AC Conversion)**
   - Converts 12V Direct Current (DC) from the battery into 230V 50Hz Alternating Current (AC) pure sine wave.
   - Features real-time animated oscilloscope wave screen and cooling fan.
4. **💡 Loads (Dual Load Types)**:
   - **DC Load**: 12V DC LED Bulb and mini fan powered directly by the charge controller DC ports.
   - **AC Load**: 230V household appliances (Television & home electronics) powered by the Inverter pure sine output.
5. **⚡ Solar Charge Controller (MPPT / PWM)**
   - Protects the battery from overcharging, reverse current at night, and deep discharging.
   - Has 3 pairs of dedicated terminals: Solar PV Input (+/-), Battery Port (+/-), and DC Load Port (+/-).
6. **🔌 AC (Alternating Current)**
   - Uses **Live (L - Gold/Brown)** and **Neutral (N - Blue)** circuits.
   - Delivers 230V oscillating electricity to household appliances.
7. **⚡ DC (Direct Current)**
   - Uses **Positive (+ - Red)** and **Negative (- - Black/Slate)** circuits.
   - Powers solar panels, charge controller, battery bank, and 12V DC loads.

---

## 🎮 How to Play
1. **Click & Drag Wires**: Click on any terminal pin, drag a rubber-band wire, and release over the destination pin.
2. **Remove Wires**: Click on any existing wire to unplug it.
3. **Multimeter Probe**: Hover your cursor over any terminal pin to inspect real-time Voltage (V), Polarity, and System readings.
4. **Sunlight Slider**: Slide sunlight between 0% (night) and 100% (noon peak) to observe real-time wattage changes.
5. **Short Circuit, Wrong Connection & Safety Protection**:
   - Connecting `(+)` to `(-)` directly on the battery, solar panel, controller, inverter, or loads triggers real-time **electric arc sparks 💥, smoke puffs, and burning wire glow!**
   - **Reverse Polarity Detection**: Connecting Solar or Battery positive to negative controller inputs trips reverse polarity safeguards with descriptive diagnostics.
   - **AC-to-DC Lethal Mismatch**: Connecting 230V AC mains into low-voltage 12V DC circuits instantly trips overload alerts.
   - **One-Click Fix**: Click `✂ Remove Shorted Wire` on the fault dialog to quickly clear hazards.
   - **Test Wrong Wire Button**: Click `💥 Test Wrong Wire` in the toolbar to immediately simulate short circuits and test system protections.

6. **🔋 Dynamic Battery Percentage & State of Charge (SoC)**:
   - **Live Battery Gauge**: High-contrast animated level meter with color transitions (Green > 50%, Yellow 20-50%, Red < 20%, Flashing Red 0%).
   - **Dual Voltage & State Readouts**: Real-time voltage curve from 10.5V (empty) up to 14.4V (bulk charging) on both the Battery and Charge Controller LCD.
   - **Interactive Battery Slider**: Use the `🔋 Battery` slider in the top toolbar to test empty (0%), half, or 100% full battery conditions anytime.
   - **Dynamic Physics Simulation**:
     - **Solar Charging**: Charges up to +0.8%/sec when sunlight > 0% and wired through the charge controller.
     - **Load Draining**: DC 12V bulb and 230V AC fan draw realistic discharge currents.
     - **Low Voltage Disconnect**: When battery reaches 0%, loads automatically power off.
     - **Rapid Short-Circuit Drain**: Short circuits rapidly drain battery reserves with realistic arc sound and visual warnings!

---

## 🎯 Game Levels
- **Level 1: DC Foundations**: Wire Solar Panel ➔ Charge Controller ➔ Battery ➔ 12V DC Bulb.
- **Level 2: Inverter & AC Power**: Wire Battery ➔ Inverter DC Input, and Inverter AC ➔ Household Television.
- **Level 3: Full Solar Grid**: Complete the whole off-grid PV system from scratch.
- **Level 4: Circuit Troubleshooter**: Pre-wired system contains dangerous reversed polarity errors. Find and correct them!
- **Sandbox Mode**: Experiment freely with full control over all components and solar conditions.

---

## 🚀 Quick Launch
Simply double click `index.html` or open it with any modern web browser (Chrome, Edge, Firefox, Safari).
