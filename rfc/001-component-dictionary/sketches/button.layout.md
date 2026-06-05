# Button — Layout

## Default

- root
  - search
  - button
  - counterLabel
  - trailingVisual
  - dropdown

## Variant Tree Deltas

### alignContent=start

- root
  - centered
    - search
    - button
    - counterLabel
    - trailingVisual
  - dropdown
    - dropdown

### variant=danger, state=pressed, alignContent=start

- root
  - search
  - button
  - counterLabel
  - dropdown
    - dropdown
  - trailingVisual

_(Only variants that change tree shape appear; all other variants inherit `default`.)_
