import asyncio
import os
import sys

os.environ["DEV_MODE"] = "true"

from backend.graph.deep_research.builder import build_deep_research_graph
graph = build_deep_research_graph()

async def main():
    topic = "How Social Media Affects Students' Academic Performance"
    print(f"Running DEV_MODE test for topic: {topic}\n")
    
    # Initialize the graph
    initial_state = {
        "topic": topic
    }
    
    print(f"{'NODE':<25} | {'ROUND':<6} | {'INFO'}")
    print("-" * 80)
    
    async for event in graph.astream(initial_state):
        for node_name, state in event.items():
            rnd = state.get("research_round", 1)
            info = ""
            
            if node_name == "planner":
                info = f"Planned {len(state.get('sub_questions', []))} sub-questions."
            elif node_name == "research_sub_question":
                sub_res = state.get("sub_results", [{}])[0]
                q = sub_res.get("sub_question", "")
                srcs = len(sub_res.get("sources", []))
                nts = len(sub_res.get("notes", []))
                reason = sub_res.get("empty_reason", "")
                info = f"Researched: '{q[:30]}...' -> {srcs} srcs, {nts} notes. {reason}"
            elif node_name == "reflector":
                gaps = state.get("gaps", [])
                open_gaps = len([g for g in gaps if g['status'] == 'open'])
                fqs = len(state.get("followup_queries", []))
                info = f"Reflected -> {open_gaps} open gaps, {fqs} followups generated."
            
            print(f"{node_name:<25} | {rnd:<6} | {info}")

if __name__ == "__main__":
    asyncio.run(main())
