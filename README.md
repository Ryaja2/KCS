# KCS — Kerbal Calculator Suite

**Live app:** https://ryaja2.github.io/KCS/

A browser-based orbital mechanics and mission planning toolkit for **Kerbal Space Program**. No install, no account — runs entirely client-side.

---

## Calculators

### Constellation Designer
Design satellite constellations in KSP. Set the body, number of satellites, and target altitude. Get the exact orbital period needed for even spacing, plus the parking-orbit period to use during deployment.

### Hohmann Transfer Planner
Calculate Δv and travel time for Hohmann transfers between any two bodies in the Kerbol system. Enter a KSP universal time (UT) to see the current phase angle vs. the required angle, and a live countdown to the next optimal launch window — visualized on a radar-style phase clock.

### Mission Δv Estimator
Estimate total Δv for a mission profile: launch, orbit, transfer, capture, land, and return. Covers all planets and moons in stock KSP. Adjust destination orbit altitude and toggle aerobraking to see how it changes the budget.

### Orbit Visualizer
Visualize any Keplerian orbit in 3D. Input semi-major axis, eccentricity, inclination, argument of periapsis, and longitude of ascending node. The scene updates in real time.

### CommNet Calculator
Calculate communication link strength between any two antenna types, accounting for relay chains and DSN levels. Based on the stock KSP CommNet range formula: `range = √(P₁ × P₂)`.

---

## Features

- **Multiple themes** — Kerbin, Duna, Jool, Kerbol
- **Outer Planets Mod (OPM) support** — toggle in Settings to add Sarnus, Urlum, Neidon, Plock, and all their moons
- **Mission clock** — tracks time since your first visit, persists across sessions
- **Retro CRT aesthetic** — scanlines, phosphor glow, nixie-style readouts

---

## Usage

Open [https://ryaja2.github.io/KCS/](https://ryaja2.github.io/KCS/) in any modern browser. No download required.

To run locally: clone the repo and open `index.html` — no build step or server needed.

```bash
git clone https://github.com/Ryaja2/KCS.git
cd KCS
# open index.html in your browser
```

---

## OPM Support

Enable the **Outer Planets Mod** toggle in Settings (⚙) to add the following bodies:

| System | Moons |
|--------|-------|
| Sarnus | Hale, Ovok, Slate, Tekto |
| Urlum  | Priax, Wal, Tal |
| Neidon | Thatmo, Nissee |
| Plock  | Karen |

---

## Tech

- Vanilla HTML/CSS/JS — no frameworks, no build tools
- [Three.js r134](https://threejs.org/) for 3D orbital visualizations
- Hosted on GitHub Pages

---

## License

MIT.

Three.js is licensed under the [MIT License](https://github.com/mrdoob/three.js/blob/master/LICENSE).
