# button-element — Web Components scaffolding

## Tag

`<gh-button variant="primary" size="medium" state="rest"></gh-button>`

## Observed attributes

```js
static get observedAttributes() {
  return ['variant', 'size', 'state', 'align-content',
          'counter', 'dropdown', 'leading-visual', 'trailing-visual'];
}
```

## Attribute → property reflection

| Attribute | Property | Type | Default |
|---|---|---|---|
| variant | variant | enum | "secondary" |
| size | size | enum | "medium" |
| state | state | enum | "rest" |
| align-content | alignContent | enum | "center" |
| counter | counter | boolean | false |
| dropdown | dropdown | boolean | false |
| leading-visual | leadingVisual | string\|null | null |
| trailing-visual | trailingVisual | string\|null | null |

## Slots (named after anatomy keys)

```html
<slot name="search"></slot>
<slot name="button"></slot>
<slot name="counterLabel"></slot>
<slot name="trailingVisual"></slot>
<slot name="dropdown"></slot>
```
