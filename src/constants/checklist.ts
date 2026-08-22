/**
 * Default room matrix seeded into a new inspection. Kept as data rather than a
 * table because it is app-versioned, not user-owned — a user's edits live in
 * inspection_rooms once seeded.
 */
export const ROOM_TEMPLATES = [
  "Entryway",
  "Living Room",
  "Kitchen",
  "Bedroom",
  "Bathroom",
  "Hallway",
  "Laundry",
  "Exterior",
] as const;

/** Checked in every room. Mirrors the plan's checklist matrix. */
export const ITEM_TEMPLATES = [
  "Walls",
  "Flooring",
  "Ceiling",
  "Windows",
  "Doors",
  "Outlets",
  "Fixtures",
  "Appliances",
] as const;

export const CONDITION_STATUSES = [
  "pristine",
  "normal_wear",
  "minor_scuff",
  "damaged",
] as const;

export type ConditionStatus = (typeof CONDITION_STATUSES)[number];

export const CONDITION_LABELS: Record<ConditionStatus, string> = {
  pristine: "Pristine",
  normal_wear: "Normal Wear",
  minor_scuff: "Minor Scuff",
  damaged: "Damaged",
};
