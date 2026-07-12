Build a React + Tailwind CSS frontend for a Research AI Agent.
This is a continuation of an existing project — I already have a 
working Landing view and Loading view. I need you to build the 
Report View and Chat Split View only.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BACKEND CONTRACT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

POST /sessions/{session_id}/chat
  Request:  { "message": "string" }
  Response (CHAT intent):
    { "response": "string", "intent": "CHAT" }
  Response (IMPROVE intent):
    { "response": "string", "intent": "IMPROVE", "updated_report": "string" }

GET /sessions/{session_id}/chat
  Response: { "messages": [{ "role": "user"|"assistant", "content": "string" }] }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VIEW 1 — REPORT VIEW (shown right after report generation)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Layout:
- Full screen, dark theme, centered content max-width 800px
- Report rendered in markdown using react-markdown + remark-gfm
- Sticky top bar with:
    - Topic name on the left
    - "Export PDF" button on the right
    - "New Research" button on the right
- Sticky bottom bar with:
    - A chat input field (placeholder: "Ask about this report 
      or request changes...")
    - A send button
    - Subtle hint text above input: 
      "Ask questions or say 'make the conclusion longer' to improve"

Behavior:
- When user types in the bottom chat input and hits send,
  the view transitions to the Split View (View 2)
- The message they typed becomes the first message in the chat

Design:
- Report content area: clean white/dark card, good typography,
  proper heading hierarchy
- Bottom chat bar: frosted glass effect, slightly elevated,
  fixed to bottom of screen
- Smooth slide-up animation when chat bar is focused

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VIEW 2 — SPLIT VIEW (report left, chat right)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Layout:
- Full screen split into two panels side by side
- LEFT PANEL (60% width): Report panel
- RIGHT PANEL (40% width): Chat panel
- A thin vertical divider between them
- Both panels are independently scrollable

LEFT PANEL — Report:
- Sticky header with topic name and "Export PDF" button
- Report rendered in markdown (react-markdown + remark-gfm)
- When intent === "IMPROVE" comes back from the backend:
    - Show a subtle "Updating report..." skeleton/pulse overlay
      on the report panel while the request is in flight
    - When response arrives, smoothly replace report content
      with updated_report (fade transition)
    - Show a small green toast "Report updated" for 2 seconds
- Scroll position should reset to top after report update

RIGHT PANEL — Chat:
- Sticky header: "Research Assistant" title + a 
  "Close Chat" button (clicking it goes back to View 1)
- Messages list:
    - User messages: right-aligned, indigo/blue bubble
    - Assistant messages: left-aligned, dark gray bubble
    - Each message shows role label above it
    - Auto-scroll to latest message after each response
- For IMPROVE responses specifically:
    - Assistant bubble gets a small "✏️ Report Updated" 
      badge below it so user knows the left panel changed
- Input area fixed to bottom of right panel:
    - Text input + send button
    - Disabled with a spinner while waiting for response
    - Clear input after send
    - Support Enter key to send (Shift+Enter for new line)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STATE MANAGEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Props this component receives from App.jsx:
- sessionId: string
- topic: string
- initialReport: string   ← markdown string from report generation

Internal state to manage:
- report: string          ← starts as initialReport, updates on IMPROVE
- messages: array         ← chat history
- inputValue: string
- isLoading: boolean      ← true while POST /chat is in-flight
- isChatOpen: boolean     ← false = View 1, true = View 2
- isUpdatingReport: boolean ← true during IMPROVE request, shows overlay

On mount:
- Call GET /sessions/{sessionId}/chat to restore any existing 
  chat history (in case user navigated back to this session 
  from the sidebar)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPONENT STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ReportChatView.jsx          ← main component, owns all state
├── ReportPanel.jsx         ← left panel, receives report + isUpdating
│   └── MarkdownReport.jsx  ← pure render of markdown string
└── ChatPanel.jsx           ← right panel, receives messages + handlers
    ├── MessageBubble.jsx   ← single message with intent badge logic
    └── ChatInput.jsx       ← input + send button + loading state

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEND MESSAGE FLOW (implement exactly this)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const handleSend = async (message) => {
  // 1. open split view if not already open
  setIsChatOpen(true)

  // 2. optimistically add user message to UI
  setMessages(prev => [...prev, { role: "user", content: message }])
  setInputValue("")

  // 3. if IMPROVE intent suspected, show report overlay
  setIsLoading(true)
  if (mightBeImproveIntent(message)) setIsUpdatingReport(true)

  // 4. POST to backend
  const data = await postChatMessage(sessionId, message)

  // 5. add assistant response to chat
  setMessages(prev => [...prev, {
    role: "assistant",
    content: data.response,
    intent: data.intent           // store intent on message for badge
  }])

  // 6. if IMPROVE, update report panel
  if (data.intent === "IMPROVE" && data.updated_report) {
    setReport(data.updated_report)
  }

  // 7. clear loading states
  setIsLoading(false)
  setIsUpdatingReport(false)
}

// simple heuristic for optimistic overlay — not always accurate,
// that's fine, it just shows the overlay a bit eagerly sometimes
const mightBeImproveIntent = (msg) => {
  const keywords = ["make", "change", "update", "rewrite", 
                    "improve", "add", "remove", "edit", "fix"]
  return keywords.some(k => msg.toLowerCase().includes(k))
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DESIGN TOKENS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Dark theme throughout. Use these consistently:
- Background:       #0a0a0a  (app bg)
- Panel bg:         #111111  (report and chat panels)
- Surface:          #1a1a1a  (cards, message bubbles)
- Border:           #2a2a2a  (dividers, panel borders)
- Primary:          #6366f1  (indigo — buttons, user bubbles, accents)
- Primary hover:    #4f46e5
- Text primary:     #f1f5f9
- Text secondary:   #94a3b8
- Success:          #22c55e  (report updated toast)
- Font (report):    Georgia or serif for readability
- Font (ui):        Inter or system-ui

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PACKAGES NEEDED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

npm install react-markdown remark-gfm lucide-react

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT NOT TO BUILD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- No React Router
- No authentication
- No sidebar (that's already built separately in App.jsx)
- No Landing view, no Loading view (already exist)
- No localStorage or sessionStorage
- Export PDF button can be a stub (onClick logs "export" for now)