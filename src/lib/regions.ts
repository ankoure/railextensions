// Region codes used in each project's `state` field.
// US: USPS codes. Canada: postal province/territory codes. Mexico: ISO 3166-2:MX codes
// (three letters, so they never collide with the two-letter US/Canada codes).

export type CountryCode = 'US' | 'CA' | 'MX';

export const COUNTRY_NAMES: Record<CountryCode, string> = {
  US: 'United States',
  CA: 'Canada',
  MX: 'Mexico',
};

export const COUNTRY_ORDER: CountryCode[] = ['US', 'CA', 'MX'];

const US: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'Washington, D.C.', PR: 'Puerto Rico', GU: 'Guam', VI: 'U.S. Virgin Islands',
};

const CANADA: Record<string, string> = {
  AB: 'Alberta', BC: 'British Columbia', MB: 'Manitoba', NB: 'New Brunswick',
  NL: 'Newfoundland and Labrador', NS: 'Nova Scotia', NT: 'Northwest Territories',
  NU: 'Nunavut', ON: 'Ontario', PE: 'Prince Edward Island', QC: 'Quebec',
  SK: 'Saskatchewan', YT: 'Yukon',
};

const MEXICO: Record<string, string> = {
  AGU: 'Aguascalientes', BCN: 'Baja California', BCS: 'Baja California Sur',
  CAM: 'Campeche', CHP: 'Chiapas', CHH: 'Chihuahua', CMX: 'Mexico City',
  COA: 'Coahuila', COL: 'Colima', DUR: 'Durango', GUA: 'Guanajuato',
  GRO: 'Guerrero', HID: 'Hidalgo', JAL: 'Jalisco', MEX: 'State of Mexico',
  MIC: 'Michoacán', MOR: 'Morelos', NAY: 'Nayarit', NLE: 'Nuevo León',
  OAX: 'Oaxaca', PUE: 'Puebla', QUE: 'Querétaro', ROO: 'Quintana Roo',
  SLP: 'San Luis Potosí', SIN: 'Sinaloa', SON: 'Sonora', TAB: 'Tabasco',
  TAM: 'Tamaulipas', TLA: 'Tlaxcala', VER: 'Veracruz', YUC: 'Yucatán',
  ZAC: 'Zacatecas',
};

export interface Region {
  code: string;
  name: string;
  country: CountryCode;
}

export const REGIONS: Record<string, Region> = Object.fromEntries([
  ...Object.entries(US).map(([code, name]) => [code, { code, name, country: 'US' as const }]),
  ...Object.entries(CANADA).map(([code, name]) => [code, { code, name, country: 'CA' as const }]),
  ...Object.entries(MEXICO).map(([code, name]) => [code, { code, name, country: 'MX' as const }]),
]);

export function isRegionCode(code: string): boolean {
  return code in REGIONS;
}

export function regionName(code: string): string {
  return REGIONS[code]?.name ?? code;
}

export function regionCountry(code: string): CountryCode {
  return REGIONS[code]?.country ?? 'US';
}
