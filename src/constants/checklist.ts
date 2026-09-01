/**
 * Rooms seeded into a new inspection.
 *
 * Deliberately a small core that almost every home has. Seeding the full list
 * meant a studio started with six rooms it would never use, which read as the
 * user failing to document rather than the template being wrong. Anything else
 * is one tap away in SUGGESTED_ROOMS.
 */
export const ROOM_TEMPLATES = [
  "Living Room",
  "Kitchen",
  "Bedroom",
  "Bathroom",
] as const;

/** Offered when adding a room. Free text is still allowed. */
export const SUGGESTED_ROOMS = [
  "Entryway",
  "Hallway",
  "Dining Room",
  "Second Bedroom",
  "Second Bathroom",
  "Laundry",
  "Office",
  "Balcony",
  "Garage",
  "Basement",
  "Storage",
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
