// Project lifecycle statuses, in lifecycle order (used for sorting).

export const STATUSES = [
  'proposed', 'planning', 'environmental-review', 'funded',
  'under-construction', 'on-hold', 'completed', 'cancelled',
] as const;

export type Status = (typeof STATUSES)[number];

/** Position of a status in the lifecycle; unknown/missing sorts last. */
export function statusRank(status: string | undefined): number {
  const i = STATUSES.indexOf(status as Status);
  return i === -1 ? STATUSES.length : i;
}
