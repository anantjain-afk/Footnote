import os
import sys

def diagnose():
    print("=== DIAGNOSIS FINDINGS ===")
    
    # 1a) Conditional edge
    print("\n[1a] Conditional Edge (reflector_routing):")
    print("Checks `followup_queries and round_num < max_rounds`.")
    print("BUT `round_num` is fetched from `state.get('research_round', 1)`.")
    print("Neither reflector nor research_sub_question ever returns `research_round` to increment it.")
    print("So `round_num` is ALWAYS 1, and `1 < 3` is ALWAYS true. This causes the infinite loop.")

    # 1c) Inspect State & Reducers
    print("\n[1c] State Schema & Reducers:")
    print("`research_round` is just `int`, not `Annotated[int, operator.add]`. It gets set to 1 in planner and never updated.")
    print("`gaps` is just `list[str]`. The reflector returns a new list of strings every time, completely overwriting the old gaps. It has no memory of what it asked before.")
    print("UI Branch counting (`22 / 4 branches`) is because the UI hook adds every followup query as a new key in `subQuestionProgress`, while `subQuestions.length` remains 4.")

    # 1d) 0 sources / 0 claims branch
    print("\n[1d] Empty Branches:")
    print("If a follow-up query is similar to a previous one, Tavily might return the same URLs. Since there is no cross-round deduplication, Firecrawl scrapes them again. If Firecrawl hits a rate limit or returns empty/errors, `contents` is empty, leading to 0 sources / 0 claims. The LLM then receives no new info, so the gap remains, and it asks the exact same question again in the next round.")

    # 1e) Reflector prompt
    print("\n[1e] Reflector Prompt:")
    print("The reflector prompt receives `knowledge_map` but NOT the previous `gaps`. It cannot know a gap was already identified and attempted. It just looks at the knowledge map and says 'we are still missing X'.")

if __name__ == "__main__":
    diagnose()
