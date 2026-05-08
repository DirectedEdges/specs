# Button — React scaffolding

## Prop types

```ts
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'invisible';
export type ButtonSize    = 'small' | 'medium' | 'large';
export type ButtonState   = 'rest' | 'focus' | 'hover' | 'pressed' | 'disabled' | 'inactive';
export type ButtonAlign   = 'center' | 'start';

export interface ButtonProps {
  variant?: ButtonVariant;          // default: 'secondary'
  size?: ButtonSize;                // default: 'medium'
  state?: ButtonState;              // default: 'rest'
  alignContent?: ButtonAlign;       // default: 'center'
  counter?: boolean;                // default: false
  dropdown?: boolean;               // default: false
  leadingVisual?: string | null;    // default: null
  trailingVisual?: string | null;   // default: null
  children?: React.ReactNode;       // mapped from anatomy.button (text-type slot)
}
```

## Call signature with defaults

```tsx
export function Button({
  variant = 'secondary',
  size = 'medium',
  state = 'rest',
  alignContent = 'center',
  counter = false,
  dropdown = false,
  leadingVisual = null,
  trailingVisual = null,
  children,
}: ButtonProps) { /* … */ }
```

## Slot map

| Anatomy key | Type | instanceOf | Visibility |
|---|---|---|---|
| `search` | instance | `search` | `leadingVisual != null` |
| `button` | text | — | always (mapped to `children`) |
| `counterLabel` | instance | `counterLabel` | `counter` |
| `trailingVisual` | instance | `linkExternal` | `trailingVisual != null` |
| `dropdown` | instance | `textCaret` | `dropdown` |

## Class hooks (pairs with `button.css`)

`data-variant`, `data-size`, `data-state`, `data-align-content`
