// KSP celestial body data — values from KSP wiki
const G0 = 9.80665; // standard gravity m/s²

const BODIES = {
  kerbol: {
    name: 'Kerbol', type: 'star', GM: 1.1723328e18, radius: 261600000,
    color: '#FFA500', parent: null, atmosphere: null, SOI: Infinity, SMA: 0
  },
  moho: {
    name: 'Moho', type: 'planet', GM: 1.6860938e11, radius: 250000,
    SOI: 9646663, SMA: 5263138304, eccentricity: 0.2, inclination: 7.0,
    color: '#CD853F', parent: 'kerbol', atmosphere: null, epochMA: Math.PI
  },
  eve: {
    name: 'Eve', type: 'planet', GM: 8.1717302e12, radius: 700000,
    SOI: 85109365, SMA: 9832684544, eccentricity: 0.01, inclination: 2.1,
    color: '#9400D3', parent: 'kerbol', atmosphere: { height: 90000, pressure: 506625 }, epochMA: Math.PI
  },
  gilly: {
    name: 'Gilly', type: 'moon', GM: 8289449.8, radius: 13000,
    SOI: 126123.27, SMA: 31500000, eccentricity: 0.55, inclination: 12.0,
    color: '#A0522D', parent: 'eve', atmosphere: null
  },
  kerbin: {
    name: 'Kerbin', type: 'planet', GM: 3.5316e12, radius: 600000,
    SOI: 84159286, SMA: 13599840256, eccentricity: 0.0, inclination: 0.0,
    color: '#1E90FF', parent: 'kerbol', atmosphere: { height: 70000, pressure: 101325 }, epochMA: 0.0
  },
  mun: {
    name: 'Mun', type: 'moon', GM: 6.5138398e10, radius: 200000,
    SOI: 2429559.1, SMA: 12000000, eccentricity: 0.0, inclination: 0.0,
    color: '#888888', parent: 'kerbin', atmosphere: null
  },
  minmus: {
    name: 'Minmus', type: 'moon', GM: 1.7658e9, radius: 60000,
    SOI: 2247428.4, SMA: 47000000, eccentricity: 0.0, inclination: 6.0,
    color: '#90EE90', parent: 'kerbin', atmosphere: null
  },
  duna: {
    name: 'Duna', type: 'planet', GM: 3.0136321e11, radius: 320000,
    SOI: 47921949, SMA: 20726155264, eccentricity: 0.051, inclination: 0.06,
    color: '#CD5C5C', parent: 'kerbol', atmosphere: { height: 50000, pressure: 6755.28 }, epochMA: Math.PI
  },
  ike: {
    name: 'Ike', type: 'moon', GM: 1.8568369e10, radius: 130000,
    SOI: 1049598.9, SMA: 3200000, eccentricity: 0.03, inclination: 0.2,
    color: '#696969', parent: 'duna', atmosphere: null
  },
  dres: {
    name: 'Dres', type: 'planet', GM: 2.1484489e10, radius: 138000,
    SOI: 32832840, SMA: 40839348203, eccentricity: 0.145, inclination: 5.0,
    color: '#708090', parent: 'kerbol', atmosphere: null, epochMA: 0.9082
  },
  jool: {
    name: 'Jool', type: 'planet', GM: 2.82528e14, radius: 6000000,
    SOI: 2455985185, SMA: 68773560320, eccentricity: 0.05, inclination: 1.304,
    color: '#228B22', parent: 'kerbol', atmosphere: { height: 200000, pressure: 1519875 }, epochMA: 0.1
  },
  laythe: {
    name: 'Laythe', type: 'moon', GM: 1.962e12, radius: 500000,
    SOI: 3723645.8, SMA: 27184000, eccentricity: 0.0, inclination: 0.0,
    color: '#4169E1', parent: 'jool', atmosphere: { height: 50000, pressure: 60795 }
  },
  vall: {
    name: 'Vall', type: 'moon', GM: 2.074815e11, radius: 300000,
    SOI: 2406401.4, SMA: 43152000, eccentricity: 0.0, inclination: 0.0,
    color: '#B0C4DE', parent: 'jool', atmosphere: null
  },
  tylo: {
    name: 'Tylo', type: 'moon', GM: 2.82528e12, radius: 600000,
    SOI: 10856518, SMA: 68500000, eccentricity: 0.0, inclination: 0.025,
    color: '#DAA520', parent: 'jool', atmosphere: null
  },
  bop: {
    name: 'Bop', type: 'moon', GM: 2.4868349e9, radius: 65000,
    SOI: 1221060.9, SMA: 128500000, eccentricity: 0.235, inclination: 15.0,
    color: '#8B4513', parent: 'jool', atmosphere: null
  },
  pol: {
    name: 'Pol', type: 'moon', GM: 7.2170208e8, radius: 44000,
    SOI: 1042138.9, SMA: 179890000, eccentricity: 0.171, inclination: 4.25,
    color: '#FFD700', parent: 'jool', atmosphere: null
  },
  eeloo: {
    name: 'Eeloo', type: 'planet', GM: 7.4410815e10, radius: 210000,
    SOI: 119082940, SMA: 90118820000, eccentricity: 0.26, inclination: 6.15,
    color: '#E0FFFF', parent: 'kerbol', atmosphere: null, epochMA: 1.7
  }
};

// Antenna powers in Watts
const ANTENNAS = {
  'Communotron 16':    { power: 5e5,   relay: false, combinable: true  },
  'Communotron 16-S':  { power: 5e5,   relay: false, combinable: false },
  'Communotron DTS-M1':{ power: 2e9,   relay: false, combinable: true  },
  'Communotron HG-55': { power: 1.5e10, relay: false, combinable: false },
  'Communotron 88-88': { power: 1e11,  relay: false, combinable: false },
  'RA-2 Relay':        { power: 2e9,   relay: true,  combinable: false },
  'RA-15 Relay':       { power: 1.5e10, relay: true,  combinable: false },
  'RA-100 Relay':      { power: 1e11,  relay: true,  combinable: false },
  'Custom':            { power: null,  relay: false, combinable: false }
};

const DSN_LEVELS = {
  'Level 1 (2G)':   2e9,
  'Level 2 (50G)':  5e10,
  'Level 3 (250G)': 2.5e11
};

// Planet bodies that orbit Kerbol (for transfer calculator)
const KERBOL_PLANETS = ['moho','eve','kerbin','duna','dres','jool','eeloo'];

// OPM moves Eeloo from Kerbol orbit to Sarnus moon — store both states
const STOCK_EELOO_ORBIT = { parent: 'kerbol', type: 'planet', SMA: 90118820000, eccentricity: 0.26, inclination: 6.15 };
const OPM_EELOO_ORBIT   = { parent: 'sarnus',  type: 'moon',   SMA: 19105978,    eccentricity: 0.0034, inclination: 2.3 };

// Outer Planets Mod bodies — merged into BODIES when OPM is enabled
const OPM_BODIES = {
  sarnus: {
    name: 'Sarnus', type: 'planet', GM: 8.3558e13, radius: 5300000,
    SOI: 7565719701, SMA: 125354319282, eccentricity: 0.056, inclination: 2.02,
    color: '#c8a87a', parent: 'kerbol', atmosphere: { height: 560000, pressure: 151988 }, epochMA: 0.0
  },
  hale: {
    name: 'Hale', type: 'moon', GM: 2570321, radius: 6000,
    SOI: 42702, SMA: 65334233, eccentricity: 0.0, inclination: 0.0,
    color: '#888888', parent: 'sarnus', atmosphere: null
  },
  ovok: {
    name: 'Ovok', type: 'moon', GM: 192000000, radius: 26000,
    SOI: 239736, SMA: 70117421, eccentricity: 0.0, inclination: 0.0,
    color: '#a09080', parent: 'sarnus', atmosphere: null
  },
  slate: {
    name: 'Slate', type: 'moon', GM: 3.277e11, radius: 540000,
    SOI: 2999693, SMA: 272365890, eccentricity: 0.0, inclination: 0.0,
    color: '#607080', parent: 'sarnus', atmosphere: null
  },
  tekto: {
    name: 'Tekto', type: 'moon', GM: 2.492e10, radius: 280000,
    SOI: 1154433, SMA: 1400000000, eccentricity: 0.02, inclination: 8.5,
    color: '#e8a050', parent: 'sarnus', atmosphere: { height: 95000, pressure: 101325 }
  },
  urlum: {
    name: 'Urlum', type: 'planet', GM: 8.5397e12, radius: 1600000,
    SOI: 4278547531, SMA: 254463421215, eccentricity: 0.012, inclination: 3.1,
    color: '#b3e8e8', parent: 'kerbol', atmosphere: { height: 200000, pressure: 202650 }, epochMA: 0.0
  },
  priax: {
    name: 'Priax', type: 'moon', GM: 1.6e9, radius: 74000,
    SOI: 494582, SMA: 31500000, eccentricity: 0.0, inclination: 2.0,
    color: '#a0a0a0', parent: 'urlum', atmosphere: null
  },
  wal: {
    name: 'Wal', type: 'moon', GM: 9.31e10, radius: 370000,
    SOI: 1944910, SMA: 90118820, eccentricity: 0.0, inclination: 1.5,
    color: '#8090a0', parent: 'urlum', atmosphere: null
  },
  tal: {
    name: 'Tal', type: 'moon', GM: 4.12e7, radius: 22000,
    SOI: 111452, SMA: 163000000, eccentricity: 0.0, inclination: 13.0,
    color: '#909090', parent: 'urlum', atmosphere: null
  },
  neidon: {
    name: 'Neidon', type: 'planet', GM: 1.0213e13, radius: 1750000,
    SOI: 4524965890, SMA: 409355191000, eccentricity: 0.009, inclination: 1.27,
    color: '#3b81e8', parent: 'kerbol', atmosphere: { height: 260000, pressure: 162120 }, epochMA: 0.0
  },
  thatmo: {
    name: 'Thatmo', type: 'moon', GM: 2.41e10, radius: 270000,
    SOI: 1000000, SMA: 31500000, eccentricity: 0.0, inclination: 8.0,
    color: '#90a0b0', parent: 'neidon', atmosphere: { height: 50000, pressure: 40000 }
  },
  nissee: {
    name: 'Nissee', type: 'moon', GM: 1.77e8, radius: 30000,
    SOI: 192000, SMA: 1264000000, eccentricity: 0.72, inclination: 24.0,
    color: '#888877', parent: 'neidon', atmosphere: null
  },
  plock: {
    name: 'Plock', type: 'planet', GM: 1.5898e9, radius: 189000,
    SOI: 179024385, SMA: 535834638714, eccentricity: 0.253, inclination: 6.15,
    color: '#c4b99a', parent: 'kerbol', atmosphere: null, epochMA: 0.9
  },
  karen: {
    name: 'Karen', type: 'moon', GM: 5.57e8, radius: 85000,
    SOI: 504000, SMA: 3215000, eccentricity: 0.0, inclination: 0.0,
    color: '#b0a898', parent: 'plock', atmosphere: null
  }
};
