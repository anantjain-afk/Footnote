"""Browser check for the Firecrawl settings flow with mocked remote services.

Run with the Vite dev server on 127.0.0.1:5173.
"""

import time
from pathlib import Path
from urllib.parse import urlsplit
from uuid import uuid4

import jwt
from playwright.sync_api import expect, sync_playwright


ORIGIN = "http://127.0.0.1:5173"
PROJECT = "https://dehgmggpjxjyfbfsrypr.supabase.co"
USER = {"id": str(uuid4()), "aud": "authenticated", "role": "authenticated",
        "email": "settings-browser@example.com", "app_metadata": {}, "user_metadata": {},
        "created_at": "2026-10-08T00:00:00Z"}
TOKEN = jwt.encode({"sub": USER["id"], "exp": int(time.time()) + 3600,
                    "aud": "authenticated", "role": "authenticated"},
                   "browser-test-secret", algorithm="HS256")
SESSION = {"access_token": TOKEN, "refresh_token": "mock-refresh-token", "token_type": "bearer",
           "expires_in": 3600, "expires_at": int(time.time()) + 3600, "user": USER}


def run():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        errors = []
        saved = False
        session_posts = 0
        page.on("pageerror", lambda error: errors.append(str(error)))

        def auth_route(route):
            path = urlsplit(route.request.url).path
            headers = {"Access-Control-Allow-Origin": ORIGIN, "Access-Control-Allow-Headers": "*"}
            if route.request.method == "OPTIONS":
                return route.fulfill(status=204, headers=headers)
            if path.endswith("/token"):
                return route.fulfill(status=200, json=SESSION, headers=headers)
            if path.endswith("/user"):
                return route.fulfill(status=200, json=USER, headers=headers)
            return route.fulfill(status=200, json={}, headers=headers)

        def api_route(route):
            nonlocal saved, session_posts
            headers = {"Access-Control-Allow-Origin": ORIGIN,
                       "Access-Control-Allow-Headers": "*",
                       "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS"}
            if route.request.method == "OPTIONS":
                return route.fulfill(status=204, headers=headers)
            path = urlsplit(route.request.url).path
            if path == "/api/user/settings":
                if route.request.method == "POST":
                    assert route.request.post_data_json["firecrawl_api_key"] == "fc-browser-test"
                    saved = True
                return route.fulfill(status=200, json={"has_firecrawl_key": saved}, headers=headers)
            if path == "/api/user/settings/firecrawl":
                saved = False
                return route.fulfill(status=200, json={"has_firecrawl_key": False}, headers=headers)
            if path == "/api/sessions" and route.request.method == "POST":
                session_posts += 1
                return route.fulfill(status=201, json={"session_id": str(uuid4())}, headers=headers)
            if path == "/api/sessions":
                return route.fulfill(status=200, json=[], headers=headers)
            if path.endswith("/stream"):
                return route.fulfill(status=200, content_type="text/event-stream", headers=headers,
                                     body='event: complete\ndata: {"report":"# Done","sources":[]}\n\n')
            return route.fulfill(status=200, json={}, headers=headers)

        context.route(f"{PROJECT}/auth/v1/**", auth_route)
        context.route("http://localhost:8000/api/**", api_route)
        page.goto(ORIGIN + "/?auth=signin")
        page.get_by_label("Email address").fill(USER["email"])
        page.get_by_label("Password", exact=True).fill("browser-password")
        page.get_by_role("button", name="Sign in", exact=True).click()
        expect(page.get_by_role("heading", name="Your research, continued.")).to_be_visible()

        page.get_by_label("Deep research", exact=True).check()
        page.get_by_placeholder("What would you like to research today?").fill("Test topic")
        page.get_by_role("button", name="Research", exact=True).click()
        expect(page.get_by_role("alert")).to_contain_text("Deep Research requires your own Firecrawl API key")
        assert session_posts == 0

        page.get_by_role("link", name="Settings → API Keys").click()
        expect(page.get_by_role("heading", name="Settings", exact=True)).to_be_visible()
        assert page.url.endswith("#settings")
        screenshots = Path("/tmp/firecrawl-settings-review")
        screenshots.mkdir(exist_ok=True)
        for label, width, height in (("desktop", 1440, 900), ("mobile", 390, 844)):
            page.set_viewport_size({"width": width, "height": height})
            page.screenshot(path=str(screenshots / f"settings-{label}.png"), full_page=True)
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), label
        page.set_viewport_size({"width": 1440, "height": 900})
        page.get_by_label("Firecrawl API Key").fill("fc-browser-test")
        page.get_by_role("button", name="Save key").click()
        expect(page.get_by_text("fc-••••••••••••")).to_be_visible()
        assert page.get_by_text("fc-browser-test").count() == 0
        page.get_by_role("button", name="Back to research").click()
        expect(page.get_by_label("Deep research", exact=True)).to_be_checked()
        expect(page.get_by_placeholder("What would you like to research today?")).to_have_value("Test topic")
        page.get_by_role("button", name="Research", exact=True).click()
        expect(page.get_by_role("heading", name="Done", exact=True)).to_be_visible()
        assert session_posts == 1
        page.get_by_role("button", name="Open Sidebar").click()
        page.get_by_role("button", name="Settings", exact=True).click()
        expect(page.get_by_text("fc-••••••••••••")).to_be_visible()
        page.get_by_role("button", name="Remove").click()
        expect(page.get_by_label("Firecrawl API Key")).to_be_visible()
        assert not saved
        assert not errors, errors
        print("PASS: deep-mode preflight, settings navigation, responsive layout, save, mask, deep run, remove")
        browser.close()


if __name__ == "__main__":
    run()
