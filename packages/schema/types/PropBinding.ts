/**
 * A component-prop binding. Emitted when a property is bound to a Figma
 * component property at extraction time. Discriminated by the `$binding` key,
 * which avoids the JSON Schema `$ref` keyword collision.
 *
 * The `$binding` value is a JSON Pointer to the bound prop within this
 * spec's `props` block, e.g. `"#/props/label"`.
 *
 * @since 1.0.0
 */
export interface PropBinding {
  /** JSON Pointer to the bound prop, e.g. `"#/props/label"`. */
  $binding: string;
}

/**
 * Keys for properties that can be bound to component props.
 * Maps to Element properties: `instanceOf`, `content`, `children`; and Style property: `visible`.
 */
export type BindingKey = 'children' | 'instanceOf' | 'visible' | 'content';
