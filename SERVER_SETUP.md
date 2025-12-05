# Development Server Setup

## The Problem

The application uses TypeScript (`.ts`) files, but browsers can only execute JavaScript (`.js`). When you try to load TypeScript files directly in the browser, you'll see errors like:

```
Failed to load module script: Expected a JavaScript or Wasm module script 
but the server responded with a MIME type of "video/mp2t"
```

## The Solution

Use the included development server that automatically transpiles TypeScript to JavaScript on-the-fly.

## Quick Start

```bash
# Start the development server
deno task dev
```

Then open http://localhost:8000 in your browser.

## What the Dev Server Does

1. **Transpiles TypeScript**: Converts `.ts` files to JavaScript automatically
2. **Sets Correct MIME Types**: Ensures all files have proper content types
3. **Enables Hot Reload**: Changes are reflected immediately (no build step)
4. **Serves Static Files**: HTML, CSS, JSON, Excel files, etc.

## Alternative: Build to JavaScript

If you prefer to build once and serve static files:

```bash
# TODO: Add build script
# This would transpile all .ts files to .js files
```

## Why Not Use Python/Node HTTP Servers?

Simple HTTP servers like `python3 -m http.server` or `http-server` just serve files as-is. They don't:
- Transpile TypeScript
- Set correct MIME types for `.ts` files
- Handle module resolution

They're fine for pure JavaScript projects, but not for TypeScript development.

## Production Deployment

For production, you should:
1. Build/transpile all TypeScript to JavaScript
2. Bundle modules if needed
3. Serve the built JavaScript files

The dev server is for development only.
