---
title: "Technical Details"
description: "How the emitted trees expect to be served, for anyone wiring a Storybook by hand or debugging one."
---

You should not need this page. Once `specs storybook` exists it writes this
configuration for you, and the rest of this section describes what you get.

It is here because the emitted code already expects to be served a particular
way, and until the command ships you — or an agent helping you — have to supply
that yourself. It is also what to read when a Storybook that was working stops.

## What the emitted trees assume

Everything below follows from decisions already visible in the output, not from
preferences.

### One Storybook for the workspace, not one per platform

`specs react` and `specs webcomponents` emit sibling trees, and the Web
Components stories import a React host module from the workspace root. That is
deliberate: the stories are React CSF wrapping a Lit template, so a single
Storybook can show both platforms.

A Lit-only consumer reasonably reads the React dependency as a packaging
mistake. It is not. The host exists so that one instance can render both, and
only stories reference it — never a scaffold. Your Lit components themselves
import nothing from React.

Point your `stories` globs at both trees.

### The stylesheet has to be loaded globally

`specs react` and `specs webcomponents` both write
`assets/cssvars/cssvars.css`, and every emitted component stylesheet reads its
custom properties. Import it once in your Storybook preview.

Without it, components render completely unstyled, with nothing to indicate why.
The transform names this file in its output for exactly that reason.

### Assets resolve by URL

Icon glyphs are referenced as `/assets/icons/<slug>.svg`, so the icons directory
has to be served. Images and fonts, where your library has them, are the same.

Map each with a static directory entry. A dev server that happens to serve the
workspace root will appear to work and then fail in a static build, which is the
worst version of this problem.

### The Web Components tree resolves `lit` from outside the project

The emitted Web Components code lives beside your Storybook project rather than
inside it, so normal resolution looks for `lit` in a directory that has no
`node_modules`. Alias `lit` to the resolved package directory.

A root-level install can make this work by accident. It is still worth pinning,
because the accident is not reproducible on another machine.

### Regeneration recreates directories

`specs react` and `specs webcomponents` delete and recreate what they emit.
Vite caches existence checks, so after a regeneration it can serve 404s for files
that are plainly on disk. Disable those cached checks, and allow serving from the
workspace root rather than only the Storybook project.

This one is worth knowing by name: the symptom is a Storybook that was working,
a regeneration, and then missing files with no error that mentions caching.

## Verifying it

One non-resolving relative import takes down the whole instance rather than one
story, and the failure surfaces a long way from its cause. Check the emitted
trees resolve before Storybook sees them, rather than reading a stack trace
afterwards.

## What this page does not cover

How the navigation is organised, which sections exist, what each generated page
shows, and what of that you can change. All of that is produced by
`specs storybook`, and is described in the rest of this section rather than here.
