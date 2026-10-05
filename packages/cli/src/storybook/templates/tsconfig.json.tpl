{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true
  },
  "include": [
    ".storybook/**/*",
    "content/**/*",
    "content-overrides/**/*",
    "lib/**/*",
    "../react/src/**/*.ts",
    "../react/src/**/*.tsx",
    "../webcomponents/src/**/*.ts"
  ]
}
