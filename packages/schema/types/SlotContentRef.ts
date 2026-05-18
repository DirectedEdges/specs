/**
 * Reference to a `SlotContent` or `Composition` entry by JSON Pointer.
 *
 * The pointer resolves to one of:
 *   - A `Composition` entry (the top-level triplet becomes the fill), e.g.
 *     `"#/compositions/pageGrid"`
 *   - A `Composition.slotContent` entry (intra-composition bundled fill), e.g.
 *     `"#/compositions/filterResultsPage/slotContent/pageHeader"`
 *   - A `Component.slotContentExamples` entry (component-scoped fill), e.g.
 *     `"#/components/pill/slotContentExamples/composedLabel"`
 *
 * All three pointer targets yield `anatomy + elements + layout`.
 * Discriminated by the `$slotContent` key (names the act of filling a slot,
 * not the target type).
 */
export interface SlotContentRef {
  $slotContent: string;
}
