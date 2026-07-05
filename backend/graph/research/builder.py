from asyncio import graph

from langgraph.graph import StateGraph , START, END 

from ...services.groq import llm
from .nodes.search import search
from .nodes.extract import extract_contents
from .nodes.generate import generate
from .nodes.critique import judge_1, judge_2 , route
from .nodes.cond import should_continue
from .state import State






def build_graph() -> StateGraph:
    builder = StateGraph(State)
    builder.add_node('search' , search)
    builder.add_node('extract_contents', extract_contents)
    builder.add_node('generate', generate)
    builder.add_node('judge_1', judge_1)
    builder.add_node('judge_2', judge_2)
    builder.add_node('route', route)



    builder.add_edge(START, 'search')
    builder.add_edge('search', 'extract_contents')
    builder.add_edge('extract_contents', 'generate')
    builder.add_edge('generate', 'judge_1')
    builder.add_edge('generate', 'judge_2')
    builder.add_edge('judge_1', 'route')
    builder.add_edge('judge_2', 'route')

    builder.add_conditional_edges('route', should_continue, {
        'finish': END,
        'generate': 'generate'
    })
    return builder.compile()
    
graph = build_graph()


