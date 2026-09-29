# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React, Tailwind CSS, Vite on the frontend. FastAPI, Python, LangGraph on the backend.

## Users

Knowledge workers and students needing automated research and structured reports.

## Product Purpose

Automate deep research tasks by orchestrating web searches, content extraction, and report generation, ensuring high quality through autonomous evaluation and self-refinement.

## Positioning

A multi-agent LangGraph pipeline differentiated by a dual-judge evaluation loop and self-refinement capabilities.

## Operating Context

Users initiate research through a web interface, wait as the agent pipeline streams real-time progress, and then review the structured report. They can interact with the generated content via an intent-routed chat to ask questions or request revisions.

## Capabilities and Constraints

- Architecture must preserve the LangGraph multi-agent pipeline and dual-judge evaluation loop.
- The UI must remain React/Tailwind.
- Engineering must prioritize production-grade focus (observability, streaming, reliability) over lightweight hackathon approaches.
- Current capabilities include web search, content extraction, and PDF export.

## Evidence on Hand

- Fully operational LangGraph architecture for research and chat workflows.
- Dual-judge evaluation implementation.
- React frontend with existing Report and Chat panels.
- Project analysis report highlighting production-grade roadmap.

## Product Principles

- **Reliability First**: Favor robust engineering, error handling, and testing over fragile hacks.
- **Self-Correcting**: The system should iterate and refine its own work autonomously before presenting it.
- **Transparent Execution**: Provide real-time streaming and observability into the agent's thought process and progress.
