# SEF eFakture Shared Library

Shared TypeScript code used by both Frontend and Backend applications.

## Contents

- **Types**: Shared TypeScript interfaces and types (e.g., API responses, data models).
- **Validation**: Zod schemas used for validation on both client and server.
- **Utils**: Common utility functions.

## Usage

This package is referenced by other workspaces in the monorepo.

```json
// package.json
{
  "dependencies": {
    "@sef-app/shared": "*"
  }
}
```
