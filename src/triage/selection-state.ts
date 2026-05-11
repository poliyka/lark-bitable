import type { TriageSelection } from "../config/schema.js";
import type { ConfigStore } from "../config/store.js";

export function writeSelection(
  store: ConfigStore,
  selection: TriageSelection,
): TriageSelection {
  return store.setSelection(selection);
}

export function readSelection(store: ConfigStore): TriageSelection | undefined {
  return store.getSelection();
}
