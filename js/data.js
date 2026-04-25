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
  'RA-2 Relay':        { power: 2e12,  relay: true,  combinable: false },
  'RA-15 Relay':       { power: 1.5e13, relay: true,  combinable: false },
  'RA-100 Relay':      { power: 1e14,  relay: true,  combinable: false },
  'Custom':            { power: null,  relay: false, combinable: false }
};

const DSN_LEVELS = {
  'Level 1 (2T)':   2e12,
  'Level 2 (50T)':  5e13,
  'Level 3 (250T)': 2.5e14
};

// Planet bodies that orbit Kerbol (for transfer calculator)
const KERBOL_PLANETS = ['moho','eve','kerbin','duna','dres','jool','eeloo'];
