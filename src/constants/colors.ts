import palette from "./palette.json";

/**
 * The same tokens Tailwind is configured with, for the places that need a raw
 * value rather than a class — icon `color` props, `placeholderTextColor`,
 * ActivityIndicator, SVG fills.
 *
 * tailwind.config.js reads the identical JSON, so a brand colour changes in
 * exactly one file. Never hardcode a hex in a component.
 */
export const colors = palette;
