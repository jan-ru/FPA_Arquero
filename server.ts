/**
 * Development server for the Financial Statement Generator
 * 
 * This server:
 * - Serves static files (HTML, CSS, JSON)
 * - Transpiles TypeScript files to JavaScript on-the-fly using esbuild
 * - Sets correct MIME types for all file types
 * - Provides hot-reload capability
 */

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { contentType } from "https://deno.land/std@0.208.0/media_types/mod.ts";
import * as esbuild from "https://deno.land/x/esbuild@v0.19.11/mod.js";

const PORT = parseInt(Deno.env.get("PORT") || "8000");

// MIME type mappings
const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".ts": "application/javascript", // TypeScript will be transpiled to JS
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".md": "text/markdown",
};

function getMimeType(path: string): string {
  const ext = path.substring(path.lastIndexOf("."));
  return MIME_TYPES[ext] || contentType(ext) || "application/octet-stream";
}

async function transpileTypeScript(code: string, filePath: string): Promise<string> {
  try {
    const result = await esbuild.transform(code, {
      loader: "ts",
      format: "esm",
      target: "es2020",
      sourcemap: "inline",
    });

    return result.code;
  } catch (error) {
    console.error(`Error transpiling ${filePath}:`, error);
    return `console.error('Failed to transpile ${filePath}:', ${JSON.stringify(String(error))});`;
  }
}

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  let pathname = url.pathname;

  // Default to index.html for root
  if (pathname === "/") {
    pathname = "/index.html";
  }

  try {
    // Read the file
    const filePath = `.${pathname}`;
    
    // Check if file exists
    try {
      await Deno.stat(filePath);
    } catch {
      return new Response("404 Not Found", { status: 404 });
    }

    // Read file content
    let content: string | Uint8Array;
    const mimeType = getMimeType(pathname);
    
    // Handle TypeScript files specially
    if (pathname.endsWith(".ts")) {
      const code = await Deno.readTextFile(filePath);
      content = await transpileTypeScript(code, filePath);
      
      return new Response(content, {
        status: 200,
        headers: {
          "Content-Type": "application/javascript; charset=utf-8",
          "Cache-Control": "no-cache",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
    
    // Handle text files
    if (mimeType.startsWith("text/") || mimeType.includes("javascript") || mimeType.includes("json")) {
      content = await Deno.readTextFile(filePath);
    } else {
      // Handle binary files
      content = await Deno.readFile(filePath);
    }

    return new Response(content, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error(`Error serving ${pathname}:`, error);
    return new Response(`Internal Server Error: ${error}`, { status: 500 });
  }
}

console.log(`🚀 Development server starting on http://localhost:${PORT}`);
console.log(`📁 Serving files from: ${Deno.cwd()}`);
console.log(`🔧 TypeScript files will be transpiled on-the-fly using esbuild`);
console.log(`\n✨ Open http://localhost:${PORT} in your browser\n`);

try {
  await serve(handleRequest, { port: PORT });
} finally {
  // Clean up esbuild
  esbuild.stop();
}
