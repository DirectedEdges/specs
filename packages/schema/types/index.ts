/**
 * Specs Schema Types
 *
 * TypeScript type definitions matching the Specs JSON schema.
 * These types represent the serialized output format produced by
 * @directededges/specs-from-figma and other Specs-compatible tools.
 */

// Core component types
export type { Component } from './Component.js';
export type { Anatomy, AnatomyElement, ElementTypeRef, SubcomponentRef } from './Anatomy.js';
export type { Props, AnyProp, BooleanProp, StringProp, EnumProp, SlotProp, NumberProp, FigmaCodeOnlySource, FigmaPropExtension, PropExtensions } from './Props.js';
export type { Variant, Variants } from './Variant.js';
export type { Metadata } from './Metadata.js';
export type { Subcomponent, Subcomponents } from './Subcomponent.js';
export type { InstanceExample, InstanceExamples } from './InstanceExample.js';

// Element and structure types
export type { Element, Elements, ElementType } from './Element.js';
export type { Layout, LayoutNode } from './Layout.js';
export type { Children, SlotBinding, SlotBindingExtensions, FigmaSlotBindingExtension } from './Children.js';
export type { SlotContent } from './SlotContent.js';
export type { Composition, Compositions } from './Composition.js';

// Configuration types
export type { PropConfigurations } from './PropConfigurations.js';
export type { Config, ResolvedConfig, ColorFormat } from './Config.js';
export { DEFAULT_CONFIG } from './Config.js';

// Style types
export type { Styles, Style, ColorStyle, ColorObject, StyleKey, TokenReference, AspectRatioValue, AspectRatioStyle, Typography, Sides, Corners, ItemSpacing, LayoutMode, WrapAlignment, MainAxisAlignment, CrossAxisAlignment, Position, PositionOffset } from './Styles.js';
export type { Shadow, Blur, Effects } from './Effects.js';
export type { GradientStop, GradientCenter, LinearGradient, RadialGradient, AngularGradient, GradientValue } from './Gradient.js';

// Reference types
export type { PropBinding, BindingKey } from './PropBinding.js';
export type { SlotContentRef } from './SlotContentRef.js';

// Conditional types
export type { Conditional, ConditionExpression, ConditionArgs } from './Conditional.js';
