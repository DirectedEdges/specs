// No React/Vue/Svelte imports. Pure types + slot signatures.
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'invisible';
export type ButtonSize    = 'small' | 'medium' | 'large';
export type ButtonState   = 'rest' | 'focus' | 'hover' | 'pressed' | 'disabled' | 'inactive';
export type ButtonAlign   = 'center' | 'start';

export interface ButtonProps {
  variant?:        ButtonVariant;  // default 'secondary'
  size?:           ButtonSize;     // default 'medium'
  state?:          ButtonState;    // default 'rest'
  alignContent?:   ButtonAlign;    // default 'center'
  counter?:        boolean;        // default false
  dropdown?:       boolean;        // default false
  leadingVisual?:  string | null;  // default null
  trailingVisual?: string | null;  // default null
}

export interface ButtonSlots {
  /* visible when leadingVisual != null */  search?:         unknown;
  /* always */                              button:          string;
  /* visible when counter == true */        counterLabel?:   unknown;
  /* visible when trailingVisual != null */ trailingVisual?: unknown;
  /* visible when dropdown == true */       dropdown?:       unknown;
}
