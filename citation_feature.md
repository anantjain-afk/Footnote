━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEATURE: INLINE CITATIONS IN RESEARCH REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCOPE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Only these things change:
  1. extract node   — build a sources list alongside extracted content
  2. state          — add sources field
  3. generate node  — prompt LLM to cite inline using [1], [2]
  4. DB             — save sources to a new table
  5. API            — save sources after graph, expose via endpoint
  6. Frontend       — fetch sources, render [N] as links, show sources list

Nothing else changes. No new graph nodes. No verifier. No judge changes.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — STATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

File: graph/research/state.py

Add one field to ResearchState:

  sources: list[dict]

Each dict shape:
  {
    "id":      int,   ← citation number, starts at 1
    "url":     str,   ← original URL from Tavily
    "title":   str,   ← page title from Tavily search result
    "snippet": str    ← first 800 chars of Firecrawl markdown output
  }

Initialize it as empty list in the graph's initial state.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — EXTRACT NODE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

File: graph/research/nodes/extract.py

Current node returns:
  { "extracted_content": list }

After parallel Firecrawl extraction completes, also build
the sources list. The sources list is built here because this
is where you have both the Tavily URL/title AND the Firecrawl
extracted text at the same time.

Return:
  {
    "extracted_content": [...existing...],
    "sources": [
      {
        "id": 1,
        "url": tavily_result["url"],
        "title": tavily_result["title"],
        "snippet": firecrawl_result["markdown"][:800]
      },
      ...one entry per successfully extracted URL...
    ]
  }

Source ID is index + 1. Order matches the order URLs were 
processed. If a Firecrawl extraction failed (exception in
asyncio.gather), skip that URL — don't include it in sources.
Only successfully extracted URLs become sources.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3 — GENERATE NODE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

File: graph/research/nodes/generate.py

This is the main change. The node now receives state["sources"]
and builds a source-aware prompt.

SYSTEM PROMPT:

  You are a senior research analyst writing an authoritative
  research report. You are given numbered source documents.

  CITATION RULES — follow without exception:
  - After every factual claim, statistic, or named entity,
    add the citation number in square brackets immediately
    before the period: "AI adoption grew 40% in 2025 [1]."
  - Use [1,2] when a claim is supported by multiple sources
  - Only cite a source if it directly supports that claim
  - If a claim has no source, either remove it or soften it
    with "reportedly" or "some analysts suggest"
  - At the end of the report, include a ## References section:
    [1] Title — URL
    [2] Title — URL
  - Never write "based on the sources" or "according to the
    provided text" — write in confident declarative prose

USER PROMPT:

  Write a comprehensive research report on: {state["topic"]}

  Available sources:
  {
    for each source in state["sources"]:
    [SOURCE {id}]
    Title: {title}
    URL: {url}
    Content: {snippet}
    ---
  }

  Report structure:
  # {topic}
  ## Executive Summary
  ## Introduction
  ## Key Findings
  ## Analysis
  ## Conclusion
  ## References

  Write the full report with inline citations now.

No other changes to this node.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4 — DATABASE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

File: core/database.py

Add one new table inside init_db() executescript:

  CREATE TABLE IF NOT EXISTS report_sources (
    id            TEXT PRIMARY KEY,
    session_id    TEXT NOT NULL REFERENCES research_sessions(id),
    source_number INTEGER NOT NULL,
    url           TEXT NOT NULL,
    title         TEXT,
    snippet       TEXT,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_sources_session
    ON report_sources(session_id, source_number ASC);

Delete research_agent.db and let init_db() rebuild it with
the new table on next server start.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 5 — API
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

File: api/routes/sessions.py

CHANGE 1 — Save sources after graph completes.

In create_session, after saving the report, add:

  for source in result["sources"]:
      conn.execute(
          """INSERT INTO report_sources
             (id, session_id, source_number, url, title, snippet)
             VALUES (?, ?, ?, ?, ?, ?)""",
          (str(uuid.uuid4()), session_id,
           source["id"], source["url"],
           source["title"], source["snippet"])
      )

This goes in the same get_db() block as the report insert
so both commit atomically.

CHANGE 2 — Add sources to the GET /sessions/{id} response.

In get_session, also fetch sources:

  sources = conn.execute(
      """SELECT source_number, url, title, snippet
         FROM report_sources
         WHERE session_id=?
         ORDER BY source_number ASC""",
      (session_id,)
  ).fetchall()

Add to return value:
  "sources": [dict(s) for s in sources]

No new endpoint needed. Sources come back with the session.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 6 — FRONTEND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Two small changes only.

CHANGE 1 — MarkdownReport.jsx
Make [N] citation markers render as superscript links that
anchor to the references section.

Pass a custom component to react-markdown that rewrites
text nodes containing [1] or [1,2] patterns:

  import ReactMarkdown from "react-markdown";
  import remarkGfm from "remark-gfm";

  function CitationText({ children }) {
    // match [1] or [1,2] or [1,2,3] pattern
    const citationRegex = /\[(\d+(?:,\d+)*)\]/g;
    const text = String(children);

    if (!citationRegex.test(text)) return <>{children}</>;

    const parts = text.split(/(\[\d+(?:,\d+)*\])/g);
    return (
      <>
        {parts.map((part, i) => {
          const match = part.match(/^\[(\d+(?:,\d+)*)\]$/);
          if (match) {
            return (
              <sup key={i}>
                <a
                  href={`#ref-${match[1].replace(/,/g, "-")}`}
                  className="text-indigo-400 hover:text-indigo-300 
                             font-mono text-xs ml-0.5"
                >
                  [{match[1]}]
                </a>
              </sup>
            );
          }
          return part;
        })}
      </>
    );
  }

  export function MarkdownReport({ content }) {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{ p: ({ children }) => <p><CitationText>{children}</CitationText></p> }}
      >
        {content}
      </ReactMarkdown>
    );
  }

CHANGE 2 — ReportPanel.jsx
Below the markdown report, render the sources list using the
sources array from the API. Each source gets an anchor ID
matching the citation links above so clicking [1] scrolls
to that source.

  function SourcesList({ sources }) {
    if (!sources || sources.length === 0) return null;
    return (
      <div className="mt-8 pt-6 border-t border-gray-800">
        <h2 className="text-lg font-semibold text-gray-200 mb-4">
          References
        </h2>
        <ol className="space-y-3">
          {sources.map((source) => (
            <li
              key={source.source_number}
              id={`ref-${source.source_number}`}
              className="flex gap-3 text-sm"
            >
              <span className="text-indigo-400 font-mono shrink-0">
                [{source.source_number}]
              </span>
              <div>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-200 hover:text-white underline 
                             underline-offset-2"
                >
                  {source.title || source.url}
                </a>
                <p className="text-gray-500 text-xs mt-1 line-clamp-2">
                  {source.snippet}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    );
  }

Add sources to ReportPanel props and render below MarkdownReport:
  <MarkdownReport content={report} />
  <SourcesList sources={sources} />

Sources come from the existing getSession() API call — no
new fetch needed. Just destructure sources from the response
and pass it down as a prop.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FILE SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MODIFIED (4 files):
  graph/research/state.py          ← add sources: list[dict]
  graph/research/nodes/extract.py  ← build and return sources list
  graph/research/nodes/generate.py ← citation-aware prompt
  core/database.py                 ← report_sources table
  api/routes/sessions.py           ← save sources, return in GET
  frontend/src/components/
    MarkdownReport.jsx             ← [N] → superscript anchor links
    ReportPanel.jsx                ← render SourcesList below report

NEW (0 files):
  Nothing new. No new nodes, no new routes, no new hooks.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONSTRAINTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. extract node must still be async def — do not change that.

2. sources list must only contain successfully extracted URLs.
   Skip any URL where Firecrawl raised an exception.

3. snippet must be capped at 800 chars. Longer snippets bloat
   the generate prompt and waste tokens.

4. The ## References section the LLM writes at the end of the
   report will render automatically via react-markdown. The
   SourcesList component below it is separate — styled and
   anchored properly. Both will appear. That is intentional:
   the LLM references section is part of the report content,
   the SourcesList is the interactive UI layer on top of it.
   If this causes visual duplication, hide the LLM-written
   references section with a CSS rule targeting the last h2
   in the report container.

5. Delete research_agent.db before testing so the new
   report_sources table is created cleanly.