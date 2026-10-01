{
  "name": "{{WORKSPACE_NAME}}-storybook",
  "private": true,
  "version": "0.0.0",
  "type": "module",
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
    "@storybook/addon-essentials": "^8.6.14",
    "@storybook/blocks": "^8.6.14",
    "@storybook/react": "^8.6.14",
    "@storybook/react-vite": "^8.6.14",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "storybook": "^8.6.14",
    "typescript": "^5.6.3",
    "vite": "^5.4.11"
  }
}
