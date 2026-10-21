# Turing Kitchen

Three everyday cooking stories implemented as real deterministic Turing machines, by Yevhen Protasov (36020).

## Run

With Node.js 18 or later:

    node serve.cjs

Open http://127.0.0.1:4173. The browser app has no runtime dependencies; dist/index.html also works directly from disk. Share links work best on a real HTTP/HTTPS host.

## Examples

- Pancakes: DDD → PPP in eight transitions. D = batter, G = first side cooked, P = ready. The head scans right to cook, then left to flip.
- Tea: WT or WTM accepts. Water/tea/milk markers become completed actions. TWM and W reject.
- Sandwich: BLCB → blcS. Bread must enclose one or more lettuce/cheese fillings. Missing bread, extra trailing items and empty fillings reject.

Use ingredient buttons or type the letters, then Load input. Step, Run/Pause, speed, Reset, Back, tape navigation and the rulebook stay synchronized. Food icons and labels explain the symbols. These are symbolic workflows, not cooking timers.

## Tests

    node --test tests/kitchen.test.cjs
    node --check dist/app.js

Nine engine groups cover all 64 supported pancake batch sizes, 1,093 tea strings and 3,280 sandwich strings, plus reversibility, invalid input, missing rules, boundaries and L/R-only transitions.

With the server running, Playwright and a Chromium browser available:

    node tests/browser-kitchen.cjs

The test accepts an installed Playwright module path as its first argument. EDGE_PATH overrides the browser executable; SITE_URL overrides the target URL. Checks cover all three recipes, both halt outcomes, controls, ingredient buttons, input validation, downloads, keyboard, URL state and 15 responsive recipe/viewport combinations. Screenshots and downloads go in ignored test-results.

## Source structure

- dist/recipes.js: the three finite rule sets, input alphabets, symbol icons, explanations and presets.
- dist/engine.js: shared sparse-tape interpreter and reversible transition history.
- dist/app.js: controls and rendering, driven exclusively by interpreter state.
- dist/index.html, style.css, kitchen.css, icon.svg: portable browser interface.

The input limit is 64 symbols; the UI pauses at 10,000 transitions. A pause is distinct from a halt. The on-screen log shows the latest 30 events; export contains the complete current history. All displayed user input is escaped or inserted as text.

## Publication and course requirements

The user is reviewing the local version before publication or any course GitHub push/PR. The current implementation uses Codex; the required Lovable/Bolt/Base44/v0 step is still pending. See ../BUILDER-HANDOFF.md.

The saved Sites version 1 contains the earlier numerical version, not Turing Kitchen. Do not deploy it as this version. Public hosting and anonymous-access verification are pending.
