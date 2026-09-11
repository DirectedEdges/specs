// Name shaping shared by the transform layer.
//
// `toPascalCase` was privately duplicated in Contract.ts and Css.ts, and the
// transform command needs it too — to derive a component's directory inside a
// platform tree. Three copies of a naming rule is how two of them drift, so it
// lives here.
//
// `@directededges/from-specs` carries its own copy for the closed emitters. Which
// of the two is authoritative is the open cross-repo question project 024 has to
// settle; until it does, these must agree.

/** `dsButton` → `DsButton`, `ds-button` → `DsButton`. */
export function toPascalCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, c => c.toUpperCase());
}
