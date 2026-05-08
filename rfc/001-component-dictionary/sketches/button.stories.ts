// Storybook CSF stories for Button.
// Types imported from button.contract.ts; story seeds derived from button.fixture.json.
// One Story per fixture entry; no rendered hierarchy (the implementer wires `render`).

import type { Meta, StoryObj } from '@storybook/react';
import type { ButtonProps } from './button.contract';

const meta: Meta<ButtonProps> = {
  title: 'Components/Button',
  // The implementer supplies the actual component:
  //   component: Button,
  //   render: (args) => <Button {...args} />,
  argTypes: {
    variant:        { control: 'select',  options: ['primary', 'secondary', 'danger', 'invisible'] },
    size:           { control: 'select',  options: ['small', 'medium', 'large'] },
    state:          { control: 'select',  options: ['rest', 'focus', 'hover', 'pressed', 'disabled', 'inactive'] },
    alignContent:   { control: 'select',  options: ['center', 'start'] },
    counter:        { control: 'boolean' },
    dropdown:       { control: 'boolean' },
    leadingVisual:  { control: 'text' },
    trailingVisual: { control: 'text' },
  },
  args: {
    variant: 'secondary',
    size: 'medium',
    state: 'rest',
    alignContent: 'center',
    counter: false,
    dropdown: false,
    leadingVisual: null,
    trailingVisual: null,
  },
};
export default meta;

type Story = StoryObj<ButtonProps>;

// Seeded from button.fixture.json — one Story per fixture entry.

export const Default: Story = {
  args: { variant: 'secondary', size: 'medium', state: 'rest', alignContent: 'center' },
};

export const PrimaryHover: Story = {
  args: { variant: 'primary', size: 'medium', state: 'hover' },
};

export const DangerPressedLarge: Story = {
  args: { variant: 'danger', size: 'large', state: 'pressed' },
};

export const WithLeading: Story = {
  args: { leadingVisual: 'search' },
};

export const WithCounterAndDropdown: Story = {
  args: { counter: true, dropdown: true },
};

export const SplitAligned: Story = {
  args: { alignContent: 'start', dropdown: true, leadingVisual: 'search' },
};

export const InvisibleDisabled: Story = {
  args: { variant: 'invisible', state: 'disabled' },
};
