{
  "name": "{{WORKSPACE_NAME}}-storybook",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "engines": {
    "node": ">=20.19"
  },
  "scripts": {
    "storybook": "storybook dev -p {{PORT}} --no-open",
    "build-storybook": "storybook build"
  },
  "dependencies": {
    "lit": "^3.3.3",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@storybook/addon-docs": "^{{STORYBOOK_VERSION}}",
    "@storybook/react": "^{{STORYBOOK_VERSION}}",
    "@storybook/react-vite": "^{{STORYBOOK_VERSION}}",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "storybook": "^{{STORYBOOK_VERSION}}",
    "typescript": "^5.6.3",
    "vite": "^5.4.11"
  }
}
