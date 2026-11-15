// Transit modes used in each project's `mode` field.

export const MODES = [
  'light-rail', 'heavy-rail', 'commuter-rail', 'streetcar',
  'intercity', 'high-speed', 'monorail', 'brt',
] as const;

export type Mode = (typeof MODES)[number];

export const MODE_LABELS: Record<Mode, string> = {
  'light-rail': 'Light rail',
  'heavy-rail': 'Heavy rail',
  'commuter-rail': 'Commuter rail',
  streetcar: 'Streetcar',
  intercity: 'Intercity',
  'high-speed': 'High-speed',
  monorail: 'Monorail',
  brt: 'BRT',
};

export function modeLabel(mode: Mode): string;
export function modeLabel(mode: Mode | undefined): string | undefined;
export function modeLabel(mode: Mode | undefined): string | undefined {
  return mode && MODE_LABELS[mode];
}
