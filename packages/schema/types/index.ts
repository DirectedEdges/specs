/**
 * Anova Schema Types
 *
 * TypeScript type definitions matching the Anova JSON schema.
 * These types represent the serialized output format produced by
 * @directededges/anova-transformer and other Anova-compatible tools.
 */

// Core component types
export type { Component } from './Component.js';
export type { Anatomy, AnatomyElement, ElementTypeRef, SubcomponentRef } from './Anatomy.js';
export type { Props, AnyProp, BooleanProp, StringProp, EnumProp, SlotProp, NumberProp, FigmaCodeOnlySource, FigmaPropExtension, PropExtensions } from './Props.js';
export type { Variant, Variants } from './Variant.js';
export type { Metadata } from './Metadata.js';
export type { Subcomponent, Subcomponents } from './Subcomponent.js';

// Element and structure types
export type { Element, Elements, ElementType } from './Element.js';
export type { Layout, LayoutNode } from './Layout.js';
export type { Children } from './Children.js';

// Configuration types
export type { PropConfigurations } from './PropConfigurations.js';
export type { Config } from './Config.js';
export { DEFAULT_CONFIG } from './Config.js';

// Style types
export type { Styles, Style, ColorStyle, ColorValue, StyleKey, TokenReference, AspectRatioValue, AspectRatioStyle, Typography, Sides, Corners } from './Styles.js';
export type { Shadow, Blur, Effects } from './Effects.js';
export type { GradientStop, GradientCenter, LinearGradient, RadialGradient, AngularGradient, GradientValue } from './Gradient.js';

// Reference types
export type { PropBinding, BindingKey } from './PropBinding.js';

// Conditional types
export type { Conditional, ConditionExpression, ConditionArgs } from './Conditional.js';
