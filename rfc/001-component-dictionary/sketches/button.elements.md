# Button — Element rules

For each anatomy element: default styles, then a flat override table of every variant configuration that touches it. Inverts the YAML's variant→element axis to element→variant.

## root (container)

### Default styles

| Property | Value |
|---|---|
| visible | true |
| layoutMode | HORIZONTAL |
| mainAxisAlignment | CENTER |
| crossAxisAlignment | CENTER |
| layoutSizingHorizontal | HUG |
| layoutSizingVertical | HUG |
| backgroundColor | `mode/button/default/bgColor/rest` |
| strokes | `mode/button/default/borderColor/rest` |
| strokeWeight | 1 |
| cornerRadius | `functional/size/borderRadius/medium` |
| effects | `_component/button/default/shadow/resting` |
| padding.top, padding.bottom | `pattern/size/control/medium/paddingBlock` |
| padding.start, padding.end | `pattern/size/control/medium/paddingInline/normal` |
| itemSpacing | `pattern/size/control/medium/gap` |

### Variant-by-variant layered overrides

| When | Property | Value |
|---|---|---|
| alignContent=start | width | 174 |
| alignContent=start | mainAxisAlignment | SPACE_BETWEEN |
| alignContent=start | primaryAxisSizingMode | FIXED |
| alignContent=start | layoutSizingHorizontal | FIXED |
| alignContent=start | itemSpacing | 8 |
| state=focus | cornerRadius | 6 |
| state=focus | strokes | `mode/focus/outlineColor` |
| state=focus | strokeWeight | 2 |
| state=focus | effects | null |
| state=hover | strokes | `mode/button/default/borderColor/hover` |
| state=hover | effects | `shadow/resting/small` |
| state=hover | backgroundColor | `mode/button/default/bgColor/hover` |
| state=pressed | strokes | `mode/button/default/borderColor/hover` |
| state=pressed | effects | `shadow/inset` |
| state=pressed | backgroundColor | `mode/button/default/bgColor/active` |
| state=disabled | strokes | `mode/button/default/borderColor/disabled` |
| state=disabled | effects | null |
| state=inactive | strokes | null |
| state=inactive | strokeAlign | null |
| state=inactive | strokeWeight | null |
| state=inactive | effects | null |
| state=inactive | backgroundColor | `mode/button/inactive/bgColor` |
| size=small | itemSpacing | `pattern/size/control/small/gap` |
| size=small | padding.top, padding.bottom | `pattern/size/control/small/paddingBlock` |
| size=small | padding.start, padding.end | `pattern/size/control/small/paddingInline/condensed` |
| size=large | itemSpacing | `pattern/size/control/large/gap` |
| size=large | padding.top, padding.bottom | `pattern/size/control/large/paddingBlock` |
| size=large | padding.start, padding.end | `pattern/size/control/large/paddingInline/spacious` |
| variant=primary | strokes | `mode/button/primary/borderColor/rest` |
| variant=primary | backgroundColor | `mode/button/primary/bgColor/rest` |
| variant=danger | strokes | `mode/button/danger/borderColor/rest` |
| variant=invisible | strokes | null |
| variant=invisible | strokeAlign | null |
| variant=invisible | strokeWeight | null |
| variant=invisible | effects | null |
| variant=invisible | backgroundColor | `mode/button/invisible/bgColor/rest` |
| state=focus, alignContent=start | cornerRadius | `functional/size/borderRadius/medium` |
| size=small, alignContent=start | width | 156 |
| size=small, alignContent=start | itemSpacing | 4 |
| size=small, state=focus | cornerRadius | `functional/size/borderRadius/medium` |
| size=small, state=pressed | cornerRadius | 6 |
| size=large, alignContent=start | width | 182 |
| size=large, alignContent=start | itemSpacing | 8 |
| size=large, state=focus | cornerRadius | `functional/size/borderRadius/medium` |
| variant=primary, state=focus | cornerRadius | `functional/size/borderRadius/medium` |
| variant=primary, state=focus | strokes | `mode/focus/outlineColor` |
| variant=primary, state=focus | effects | `_component/button/primary/shadow/selected` |
| variant=primary, state=hover | cornerRadius | 6 |
| variant=primary, state=hover | strokes | `mode/button/primary/borderColor/hover` |
| variant=primary, state=hover | backgroundColor | `mode/button/primary/bgColor/hover` |
| variant=primary, state=pressed | strokes | `mode/button/primary/borderColor/hover` |
| variant=primary, state=pressed | effects | `_component/button/primary/shadow/selected` |
| variant=primary, state=pressed | backgroundColor | `mode/button/primary/bgColor/active` |
| variant=primary, state=disabled | strokes | `mode/button/primary/borderColor/disabled` |
| variant=primary, state=disabled | backgroundColor | `mode/button/primary/bgColor/disabled` |
| variant=primary, state=inactive | strokes | null |
| variant=primary, state=inactive | backgroundColor | `mode/button/inactive/bgColor` |
| variant=danger, state=focus | cornerRadius | `functional/size/borderRadius/medium` |
| variant=danger, state=focus | strokes | `mode/focus/outlineColor` |
| variant=danger, state=hover | strokes | `mode/button/danger/borderColor/hover` |
| variant=danger, state=hover | backgroundColor | `mode/button/danger/bgColor/hover` |
| variant=danger, state=pressed | strokes | `mode/button/danger/borderColor/active` |
| variant=danger, state=pressed | effects | `_component/button/danger/shadow/selected` |
| variant=danger, state=pressed | backgroundColor | `mode/button/danger/bgColor/active` |
| variant=danger, state=disabled | strokes | null |
| variant=danger, state=disabled | strokeAlign | null |
| variant=danger, state=disabled | strokeWeight | null |
| variant=danger, state=disabled | effects | `_component/button/default/shadow/resting` |
| variant=danger, state=inactive | strokes | null |
| variant=invisible, state=focus | cornerRadius | `functional/size/borderRadius/medium` |
| variant=invisible, state=focus | strokes | `mode/focus/outlineColor` |
| variant=invisible, state=focus | strokeAlign | INSIDE |
| variant=invisible, state=focus | strokeWeight | 2 |
| variant=invisible, state=hover | backgroundColor | `mode/button/invisible/bgColor/hover` |
| variant=invisible, state=pressed | backgroundColor | `mode/button/invisible/bgColor/active` |
| variant=invisible, state=disabled | backgroundColor | `mode/button/invisible/bgColor/disabled` |
| variant=invisible, state=inactive | backgroundColor | `mode/button/inactive/bgColor` |
| _(plus 12 more 3- and 4-axis combinations affecting `cornerRadius` only — full set in `button.yaml`)_ | | |

## search (instance)

### Default styles

| Property | Value |
|---|---|
| visible | conditional — `false` if `leadingVisual == null` else `true` |
| width | 16 |
| height | 16 |
| instanceOf | bound to `leadingVisual` |

### Variant overrides

_(none — `search` is unchanged across all variants)_

## button (text)

### Default styles

| Property | Value |
|---|---|
| visible | true |
| layoutSizingHorizontal | HUG |
| layoutSizingVertical | HUG |
| textColor | `mode/button/default/fgColor/rest` |
| typography | `Body/Medium Bold` |
| textAlignVertical | CENTER |
| content | `"Button"` |

### Variant overrides

| When | Property | Value |
|---|---|---|
| alignContent=start | textAlignHorizontal | CENTER |
| state=disabled | textColor | `mode/fgColor/disabled` |
| state=inactive | textColor | `mode/button/inactive/fgColor` |
| size=small | typography | `Body/Small Bold` |
| size=large | textAlignHorizontal | CENTER |
| variant=primary | textColor | `mode/button/primary/fgColor/rest` |
| variant=primary | textAlignHorizontal | CENTER |
| variant=danger | textColor | `mode/button/danger/fgColor/rest` |
| variant=invisible | textColor | `mode/button/invisible/fgColor/rest` |
| variant=primary, state=disabled | textColor | `mode/button/primary/fgColor/disabled` |
| variant=primary, state=inactive | textColor | `mode/button/inactive/fgColor` |
| variant=danger, state=hover | textColor | `mode/button/danger/fgColor/hover` |
| variant=danger, state=pressed | textColor | `mode/button/danger/fgColor/active` |
| variant=danger, state=disabled | textColor | `mode/button/danger/fgColor/disabled` |
| variant=danger, state=inactive | textColor | `mode/button/inactive/fgColor` |
| variant=danger, size=large | textAlignHorizontal | LEFT |
| variant=invisible, state=hover | textColor | `mode/button/invisible/fgColor/hover` |
| variant=invisible, state=disabled | textColor | `mode/button/invisible/fgColor/disabled` |
| variant=invisible, state=inactive | textColor | `mode/button/inactive/fgColor` |
| variant=invisible, size=large | textAlignHorizontal | LEFT |
| variant=danger, size=large, alignContent=start | textAlignHorizontal | CENTER |
| variant=invisible, size=large, alignContent=start | textAlignHorizontal | CENTER |

## counterLabel (instance)

### Default styles

| Property | Value |
|---|---|
| visible | bound to `counter` |
| layoutSizingHorizontal | HUG |
| height | 18 |
| instanceOf | `counterLabel` |
| propConfigurations.variant | `secondary` |

### Variant overrides

_(none)_

## trailingVisual (instance)

### Default styles

| Property | Value |
|---|---|
| visible | conditional — `false` if `trailingVisual == null` else `true` |
| width | 16 |
| height | 16 |
| instanceOf | bound to `trailingVisual` |

### Variant overrides

_(none on this element directly; layout reorders `trailingVisual` under variant=danger,state=pressed,alignContent=start — see `button.layout.md`)_

## dropdown (instance)

### Default styles

| Property | Value |
|---|---|
| visible | bound to `dropdown` |
| width | 16 |
| height | 16 |
| instanceOf | `textCaret` |
| propConfigurations.type | `default` |

### Variant overrides

| When | Property | Value |
|---|---|---|
| alignContent=start | x | 0 |
| alignContent=start | y | 0 |
| size=small, alignContent=start | x | 0 |
| size=small, alignContent=start | y | 0 |
| size=large, alignContent=start | x | 0 |
| size=large, alignContent=start | y | 0 |

## centered (container, detected)

Detected only in `variant=secondary, size=medium, state=rest, alignContent=start`. Used as a layout wrapper in restructured variants — see `button.layout.md`.

### Default styles

| Property | Value |
|---|---|
| visible | true |
| crossAxisAlignment | CENTER |
| layoutMode | HORIZONTAL |
| layoutSizingHorizontal | HUG |
| layoutSizingVertical | HUG |
| itemSpacing | 8 |

### Variant overrides

_(none — `centered` only appears in restructuring variants where it inherits its default styles)_
