---
version: 1
name: ResearchAI editorial system
description: The implemented visual system for research, reports, and the signed-out editorial filmstrip.
colors:
  ink: '#11110f'
  body: '#45413d'
  canvas: '#ffffff'
  paper: '#f9f8f5'
  hairline: '#c9c7c3'
  violet: '#7542df'
  yellow: '#ffdf35'
  turquoise: '#2dd4bf'
  research-blue: '#2871b6'
  report-coral: '#c7504d'
  review-green: '#287b45'
typography:
  display: 'Playfair Display, Georgia, serif'
  prose: 'Lora, Georgia, serif'
  interface: 'Inter, Helvetica Neue, sans-serif'
  code: 'JetBrains Mono, monospace'
spacing:
  unit: 4px
  section: 'clamp(82px, 10vw, 170px)'
  reading-width: '65–75ch'
---

# ResearchAI visual system

ResearchAI presents research as something a reader can inspect. The report is an editorial document on white paper, with restrained controls and clear citations. The signed-out landing page makes the research process visible through a colorful, four-stage filmstrip. The two surfaces share the same display, prose, and interface typefaces.

## Typography

- **Playfair Display** carries large headlines, report headings, stage numbers, and the wordmark. Landing headlines use a strong weight, short line height, and balanced line breaks.
- **Lora** carries explanatory prose, questions, card titles, and report copy. It makes the research feel readable rather than technical.
- **Inter** carries navigation, captions, source labels, progress, and form controls.
- **JetBrains Mono** is reserved for code or technical data.

The font tokens are defined in `frontend/src/index.css` as `--font-display`, `--font-serif`, `--font-sans`, and `--font-mono`. These are the faces used by the app. Earlier WiredDisplay/BreveText/Apercu references were inspiration and are not shipped fonts.

## Color and material

White `#ffffff` and warm paper `#f9f8f5` are the primary grounds. Primary text uses near-black `#11110f`; gray hairlines divide sources and document sections. Purple `#7542df` marks the research question and first stage. Yellow `#ffdf35` marks the primary research action. The sequence then moves through blue `#2871b6` for reading, coral `#c7504d` for writing, and green `#287b45` for review. Global text selection uses turquoise `#2dd4bf`.

The landing uses cut-paper city imagery and distinct paper fragments for evidence, writing, and review. These are illustrative assets, never claims about actual research results. Text that must be read stays in HTML over the collage. Shadows are soft and directional; thin rules organize the report. The rest of the app may use simpler white surfaces so the report remains the focus.

## Layout and components

- **Landing first screen:** small masthead, Normal and Deep research tabs, oversized serif headline, yellow signup action, illustrative question and source sheet, then four colored stage previews.
- **Research chapters:** four visible sections follow the page scroll. Each has a stage number, direct next-step control, readable evidence example, and its own paper artwork. The stage sequence communicates progress.
- **Report sample:** a structured document with inline reference links and a references section, labeled as illustrative.
- **Conversation sample:** one follow-up question continues the story after the report.
- **Application report:** long-form reading width, serif body text, hierarchy of report headings, citations near the claims they support, and working controls around the document.

Desktop story sections use a two-column composition. Below 700px, the story becomes a vertical sequence, the filmstrip scrolls horizontally, and all chapter content stays in document flow. Controls retain keyboard focus indicators. Reduced-motion users receive the complete story without transition movement.

## Motion and behavior

The city and paper compositions provide the authored movement. Filmstrip buttons scroll to their respective chapters; switching Normal and Deep research updates all chapter content. Soft evidence entrances support the sequence, and `prefers-reduced-motion` minimizes them. The Deep tab states that the feature uses the user's own Firecrawl key. Sign-in and signup actions keep the existing authentication query routes.

## Sources of truth

Implementation lives in `frontend/src/index.css`, `frontend/src/components/LandingView.jsx`, `frontend/src/components/LandingView.css`, and the existing report components. The approved landing composition is `.impeccable/mocks/decision/editorial-filmstrip.png`; the landing imagery lives in `frontend/src/assets/landing/` with generation prompts embedded in each raster.
