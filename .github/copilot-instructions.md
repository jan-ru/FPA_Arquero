<!-- Copilot / AI Agent instructions for the Financial Statement Generator repo -->
# Repository Intent (quick)
This repository is a browser-based Financial Statement Generator that reads trial balance Excel files, maps accounts into statement hierarchies, performs period-based transformations (Arquero), and exports formatted statements back to Excel. The app runs entirely in the browser (no server). Tests and validation utilities use Deno.

# Big-picture architecture
- Frontend: `index.html` + vanilla JS helpers. No framework.
- Data layer: Arquero transformations operate on Excel data loaded via `ExcelJS` and the File System Access API.
- Configuration: `config.json` drives filenames and input/output directories.
- Tests & tools: `test/scripts/*.ts` — Deno-based validation scripts. `run_tests.sh` wraps the test runner.

# Essential files to reference
- `index.html` — entry point for the browser UI.
- `config.json` — canonical filenames and `input`/`output` directories.
- `README.md` — project overview, required input formats, and examples.
- `test/scripts/*` — test implementations and examples for Deno permissions and data validations.
- `run_tests.sh` — convenience script to run the full test suite.
- `docs/` and `test/docs/` — explain data formats and testing steps; reference these when adding features or tests.

# Workflows an AI agent should automate or assist with
- Run tests: `./run_tests.sh` or `deno run --allow-read --allow-env --allow-sys --allow-run test/scripts/run_all_tests.ts`.
- Add a new validation test: place `*.ts` under `test/scripts/`, mirror existing test patterns (`test_account_mapping.ts`, `test_period_mapping.ts`), and add it to `run_all_tests.ts`.
- Update configuration: change `config.json` keys and ensure tests and UI reference the same keys.
- Update export names: update `outputFiles` in `config.json` and adapt any README examples.

# Project-specific conventions & patterns
- Browser-first: assume transforms run in memory inside the browser. Avoid adding server-side assumptions.
- Excel input: trial balance files must include hierarchy columns (e.g. `statement_type`, `level1_code`, `level1_label`, `level2_code`, ...) — code and tests rely on exact column names.
- Dutch month names: trial balance monthly columns often use Dutch month names (`januari`, `februari`, ...). Handle locale-aware parsing where needed.
- Statement types: expect strings like `Balans` and `Winst & verlies` in the source files.
- Minimal dependencies in UI: prefer small, explicit changes (project avoids large frameworks).

# Testing, permissions, and CI notes
- Tests use Deno. Typical command includes permission flags: `--allow-read --allow-env --allow-sys --allow-run`.
- `run_tests.sh` is the CI-friendly wrapper; use it in scripts and CI jobs.
- Test runner exits with non-zero on failures; use exit code to gate CI merges.

# Common pitfalls and how to fix them (for the agent)
- Missing required columns: tests will report missing columns. When adding features that read Excel columns, update tests and `docs/SAMPLE_DATA_FORMAT.md` accordingly.
- Filename mismatches: `config.json` controls expected file names — update both tests and README when renaming.
- Browser compatibility: Safari and Firefox lack full File System Access API support — avoid recommending those browsers for local testing.

# Examples (copyable)
- Run full test suite (shell):
  `./run_tests.sh`
- Run single validation directly (Deno):
  `deno run --allow-read --allow-env --allow-sys test/scripts/test_period_mapping.ts`
- Add a test file: follow the Deno pattern in `test/scripts/run_all_tests.ts` and use `Deno.Command` or `Deno.run` consistent with existing files.

# What to do when modifying code
- Update `README.md` and any `test/docs/*` entries that describe behavior or data formats.
- If you change required Excel columns or rename config keys, add or update a test in `test/scripts/` and document the change in `docs/SAMPLE_DATA_FORMAT.md`.
- Keep changes minimal and explicit: this repo favors clarity and small vanilla-JS helpers over large refactors.

# Good first tasks for an AI coding agent
- Add a new unit validation for account code normalization (mirror `test_account_mapping.ts`).
- Create a small CLI helper (Deno) to convert sample Excel -> JSON for quicker local inspection (place under `test/scripts/`).
- Improve README code examples and add a short troubleshooting snippet showing how to fix the most common unmapped-account errors.

# When in doubt
- Inspect `test/scripts/*` for concrete examples of the repository's execution and permission model.
- Use `config.json` and `README.md` as the single source of truth for file names and expected input layout.

---
If you'd like, I can iterate on this file to add more command examples, include snippets that reference specific column names from the sample data, or merge other guidance you want preserved. Any missing areas you want me to expand? 
