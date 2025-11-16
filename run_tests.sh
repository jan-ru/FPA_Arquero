#!/bin/bash
# Convenience script to run all tests from project root

cd "$(dirname "$0")"
exec deno run --allow-read --allow-env --allow-sys --allow-run test/scripts/run_all_tests.ts
