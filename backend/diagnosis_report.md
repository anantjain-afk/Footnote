### Step 1: Diagnosis Findings

**a) Conditional Edge (`reflector_routing`)**
It checks `followup_queries and round_num < max_rounds`. `round_num` is fetched via `state.get("research_round", 1)`. Because `research_round` is not incremented by any node, it is **always 1**. The limit check `1 < 3` is perpetually true.

**b) Per-Round State & Reducers**
- `research_round` in `state.py` is defined as a plain `int`, not `Annotated[int, operator.add]`. 
- `gaps` is just `list[str]`. The reflector returns a brand new string list every time, completely overwriting the previous one. It has no memory of what it already asked.
- The UI's "Round 7" comes from the frontend hook blindly incrementing its own local state whenever it sees follow-up queries, diverging from the backend which is stuck at 1.
- The UI's "22 / 4 branches" is because the UI hook adds every follow-up query as a new key in `subQuestionProgress`, while `subQuestions.length` remains 4.

**c) The 0 Sources / 0 Claims Branch**
This happens when a follow-up query is extremely similar to a previous one. Tavily returns the exact same URLs. Since there is no cross-round deduplication, Firecrawl tries to scrape them again. If Firecrawl gets rate-limited (HTTP 429), or if extraction yields nothing new, `contents` is empty. The branch returns 0 claims.

**d) The Infinite Loop Root Cause**
Because the branch returned 0 claims, the `knowledge_map` fed into the next reflection round is identical to the previous one. The LLM sees the exact same gap, has no memory that it just tried and failed to fill it, and asks for it again. The edge check `round < 3` is stuck at `1 < 3`, so the graph spins forever.

### Step 2: Proceeding with Fix
I am now applying the architecture fixes: gap ledger, deterministic budgets, cross-round deduplication, DEV_MODE, and proper counter reducers.
