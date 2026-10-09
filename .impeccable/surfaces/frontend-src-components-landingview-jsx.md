---
version: 1
slug: "frontend-src-components-landingview-jsx"
primary_target: "frontend/src/components/LandingView.jsx"
related_targets: ["frontend/src/components/Login.jsx","frontend/src/components/DashboardView.jsx"]
---

# Entry pages

Landing: Persuade. Sign-in and dashboard: Operate. Extend the existing report's white editorial system; keep Supabase email and Google authentication, research modes, quotas, and saved sessions.

## Direction contract

THESIS: Research unfolds as an editorial filmstrip. A visitor follows a question through the product's actual research stages and into a sourced report.

OWN-WORLD: White canvas, black text, gray hairlines; existing Playfair Display headings, Lora prose, Inter controls. Flat rectangular inputs and buttons. User-requested refinements add teal text selection, yellow research actions, and restrained purple authentication accents.

STORY: A question becomes a sourced report, then a conversation. Visitors create an account or sign in; authenticated users see their own history.

FIRST VIEWPORT: Small masthead; Normal/Deep tabs above an oversized left serif headline and yellow signup action; right research frame with a cut-paper city collage, sample question, stage title and source excerpts. Four colorful chapter previews span the lower edge. Match the approved editorial-filmstrip.png composition.

FORM: Editorial Filmstrip, grounded candidate 4, surface seed 079b7ea0. User approved .impeccable/mocks/decision/editorial-filmstrip.png and authorized implementation. Comp first; scrolling advances four stages, while tabs switch the normal/deep flow. Playfair Display, Lora and Inter remain recognizable. Illustration is labeled; Deep research explains its Firecrawl key requirement. Mobile and reduced motion retain readable stages and direct chapter controls.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Implemented routes and states

- Signed-out `/` shows the landing page. `?auth=signin` and `?auth=signup` open the corresponding authentication form; authentication callback errors also open the form. A signed-in session opens the personal research dashboard and removes the authentication query parameter.
- Email sign-in, account creation, email-confirmation notices, Google sign-in, and provider/network/configuration errors remain connected to the existing Supabase integration. Pending requests disable form controls.
- The dashboard retains normal/deep research, quota cooldowns, saved-session selection, and history search. Loading, empty, failed-history/retry, and no-search-results states are explicit.
- Landing and authentication layouts stack below 700px; dashboard controls and session rows reflow at the same breakpoint. Keyboard focus and reduced-motion treatments are scoped to these entry surfaces.

## Incumbent-system comparison

This is an ordinary extension of the user-pinned report presentation. The implementation reuses `--font-display`, `--font-serif`, and `--font-sans` from `frontend/src/index.css`: Playfair Display headings, Lora prose, and Inter controls. White canvas, black primary actions, gray hairlines, flat surfaces, and rectangular controls carry the editorial character into the entry pages. The report preview is explicitly labeled as illustrative; all shipping visuals are text, CSS, or interface SVG icons. No shipping rasters require provenance.

`DESIGN.md` and global system files are preserved. Existing documentation still describes WiredDisplay/BreveText/Apercu, while the incumbent report uses the documented open-source substitutes above. Other pre-existing differences include colored global selection/code/citation treatments and rounded report toolbar buttons. These are recorded as incumbent drift, outside this extension's repair scope.

## Finished review

Initial redesign disposition: **SHIP**, with no material findings from the finish reviewer. Evidence comprises desktop and mobile captures for landing, sign-in, sign-up, and dashboard under `.impeccable/review/` (`landing`, `signin`, `signup`, and `dashboard`, each with `-desktop.png` and `-mobile.png`).

The implementation handoff reports a passing production build, changed-file lint, and browser interaction checks with mocked services. Full-project lint still reports 14 pre-existing errors outside the changed files. Mocked checks do not establish live authentication-provider or backend availability.

Documentation verification compared `PRODUCT.md`, `DESIGN.md`, the surface contract, `LandingView.jsx`, `Login.jsx`, `DashboardView.jsx`, `EntryViews.css`, and `App.jsx` against the incumbent `index.css`, `ReportPanel.jsx`, and `MarkdownReport.jsx`. The entry-page implementation matches the pinned report typography and minimal white presentation. No global design-system rewrite was needed.

## Requested color refinement

The user explicitly requested existing report/sidebar accents after the initial redesign: restore the global teal text selection (`#2dd4bf`), make the dashboard Research action yellow, lightly color the landing and authentication controls, and restore the multicolor Google mark. Entry views now inherit global selection instead of overriding it with gray. Yellow-300/400 marks research actions, purple-300 highlights authentication actions and selected heading underlines, and purple-800 marks links/focus. Sign-out keeps its text treatment with a purple underline. The Google button remains white with the four-color logo. White surfaces, existing typography, content, and behavior are retained.

The production build, scoped lint, design detector, and mocked browser authentication/research suite pass after the refinement. Desktop/mobile captures were refreshed for all four entry views.

Computed browser checks confirm teal selection on landing, sign-in, sign-up, and dashboard; the enabled Research button resolves to yellow-300 with 15.83:1 text contrast; the Google logo uses its four standard colors. The refinement review found no material visual problems in the refreshed desktop/mobile captures and the sign-out crop. Existing global DESIGN.md palette drift remains outside this scoped refinement; the user's explicit accent request governs these entry surfaces.
