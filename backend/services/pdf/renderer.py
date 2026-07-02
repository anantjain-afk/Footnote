import asyncio
import markdown
from datetime import datetime
from playwright.async_api import async_playwright

def markdown_to_html(topic: str, report_md: str) -> str:
    """Convert markdown report to a styled HTML string."""
    body_html = markdown.markdown(
        report_md,
        extensions=["fenced_code", "tables", "toc"]
    )
    
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <style>
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}

            body {{
                font-family: 'Georgia', serif;
                font-size: 14px;
                line-height: 1.8;
                color: #1a1a1a;
                background: #ffffff;
                padding: 60px 80px;
                max-width: 900px;
                margin: 0 auto;
            }}

            /* Header bar */
            .report-header {{
                border-bottom: 3px solid #0f172a;
                padding-bottom: 20px;
                margin-bottom: 40px;
            }}
            .report-label {{
                font-size: 11px;
                font-family: 'Courier New', monospace;
                letter-spacing: 2px;
                text-transform: uppercase;
                color: #64748b;
                margin-bottom: 8px;
            }}
            .report-topic {{
                font-size: 28px;
                font-weight: 700;
                color: #0f172a;
                line-height: 1.3;
            }}
            .report-meta {{
                margin-top: 10px;
                font-size: 12px;
                color: #94a3b8;
                font-family: 'Courier New', monospace;
            }}

            /* Typography */
            h1 {{ font-size: 24px; color: #0f172a; margin: 36px 0 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }}
            h2 {{ font-size: 20px; color: #1e293b; margin: 28px 0 10px; }}
            h3 {{ font-size: 16px; color: #334155; margin: 20px 0 8px; }}

            p {{ margin-bottom: 14px; color: #374151; }}

            ul, ol {{ margin: 12px 0 16px 24px; }}
            li {{ margin-bottom: 6px; color: #374151; }}

            /* Code */
            code {{
                background: #f1f5f9;
                padding: 2px 6px;
                border-radius: 4px;
                font-family: 'Courier New', monospace;
                font-size: 13px;
                color: #0369a1;
            }}
            pre {{
                background: #0f172a;
                color: #e2e8f0;
                padding: 20px;
                border-radius: 8px;
                overflow-x: auto;
                margin: 16px 0;
                font-family: 'Courier New', monospace;
                font-size: 13px;
                line-height: 1.6;
            }}
            pre code {{ background: none; color: inherit; padding: 0; }}

            /* Tables */
            table {{
                width: 100%;
                border-collapse: collapse;
                margin: 16px 0;
                font-size: 13px;
            }}
            th {{
                background: #0f172a;
                color: #f8fafc;
                padding: 10px 14px;
                text-align: left;
                font-weight: 600;
            }}
            td {{
                padding: 9px 14px;
                border-bottom: 1px solid #e2e8f0;
                color: #374151;
            }}
            tr:nth-child(even) td {{ background: #f8fafc; }}

            blockquote {{
                border-left: 4px solid #3b82f6;
                padding: 12px 20px;
                margin: 16px 0;
                background: #eff6ff;
                color: #1e40af;
                border-radius: 0 6px 6px 0;
            }}

            /* Footer */
            .report-footer {{
                margin-top: 60px;
                padding-top: 16px;
                border-top: 1px solid #e2e8f0;
                font-size: 11px;
                color: #94a3b8;
                font-family: 'Courier New', monospace;
                display: flex;
                justify-content: space-between;
            }}
        </style>
    </head>
    <body>
        <div class="report-header">
            <div class="report-label">Research Report</div>
            <div class="report-topic">{topic}</div>
            <div class="report-meta">Generated on {datetime.now().strftime("%B %d, %Y at %I:%M %p")}</div>
        </div>

        {body_html}

        <div class="report-footer">
            <span>ResearchAI — AI Generated Report</span>
            <span>{datetime.now().strftime("%Y-%m-%d")}</span>
        </div>
    </body>
    </html>
    """

async def generate_pdf(topic: str, report_md: str, output_path: str) -> str:
    """Render HTML to PDF using Playwright. Returns the output path."""
    html_content = markdown_to_html(topic, report_md)

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        await page.set_content(html_content, wait_until="networkidle")

        await page.pdf(
            path=output_path,
            format="A4",
            margin={
                "top": "20mm",
                "bottom": "20mm",
                "left": "15mm",
                "right": "15mm"
            },
            print_background=True   # needed for colored table headers, blockquotes etc
        )

        await browser.close()

    return output_path