# Button — SwiftUI scaffolding

## Enums

```swift
enum ButtonVariant: String { case primary, secondary, danger, invisible }
enum ButtonSize: String    { case small, medium, large }
enum ButtonState: String   { case rest, focus, hover, pressed, disabled, inactive }
enum ButtonAlign: String   { case center, start }
```

## Initializer

```swift
struct DSButton: View {
  var variant: ButtonVariant     = .secondary
  var size: ButtonSize           = .medium
  var state: ButtonState         = .rest
  var alignContent: ButtonAlign  = .center
  var counter: Bool              = false
  var dropdown: Bool             = false
  var leadingVisual: String?     = nil
  var trailingVisual: String?    = nil
  var label: String              = "Button"  // from anatomy.button.content

  var body: some View { /* implementer: compose slots from anatomy */ }
}
```
