"""UI integration checks using mocked services; no paid API calls.

Start Vite on 127.0.0.1:5173, then run this script with the project Python.
"""
import json
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect
from auth_browser_check import ORIGIN, PROJECT, USER, SESSION


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(viewport={'width': 1280, 'height': 900})
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        state = {'reports': 429, 'chat': 429, 'delay': 3}
        report_requests = []
        chat_requests = []
        headers = {'Access-Control-Allow-Origin': ORIGIN, 'Access-Control-Allow-Headers': '*',
                   'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Expose-Headers': 'Retry-After'}
        sessions = [{'id': f'session-{i}', 'topic': f'Saved research {i}', 'status': 'completed',
                     'mode': 'normal', 'created_at': '2026-10-07T00:00:00Z'} for i in (1, 2)]

        def auth(route):
            if route.request.method == 'OPTIONS':
                return route.fulfill(status=204, headers=headers)
            path = urlsplit(route.request.url).path
            if path.endswith('/token'):
                route.fulfill(json=SESSION, headers=headers)
            elif path.endswith('/user'):
                route.fulfill(json=USER, headers=headers)
            elif path.endswith('/logout'):
                route.fulfill(status=204, headers=headers)
            else:
                route.fulfill(json={'external': {'google': False}}, headers=headers)

        def api(route):
            if route.request.method == 'OPTIONS':
                return route.fulfill(status=204, headers=headers)
            path = urlsplit(route.request.url).path
            if route.request.method == 'POST':
                quota = 'chat' if '/chat' in path else 'reports'
                (chat_requests if quota == 'chat' else report_requests).append(route.request.post_data_json)
                status = state[quota]
                if status in (429, 503):
                    body = {'error': 'Rate limit exceeded' if status == 429 else 'Temporarily unavailable',
                            'message': 'Chat limit reached. Try again shortly.' if quota == 'chat' and status == 429
                            else 'Report limit reached. Try again shortly.' if status == 429 else 'Temporarily unavailable. Please try again shortly.'}
                    if status == 429:
                        body['reset_in_seconds'] = state['delay']
                    route.fulfill(status=status, json=body, headers={**headers, 'Retry-After': str(state['delay'])})
                elif quota == 'chat':
                    route.fulfill(content_type='text/event-stream', body='event: done\ndata: {"intent":"ANSWER","response":"A successful reply"}\n\n', headers=headers)
                else:
                    route.fulfill(status=201, json={'session_id': 'session-1'}, headers=headers)
            elif path == '/api/sessions':
                route.fulfill(json=sessions, headers=headers)
            elif path.endswith('/chat'):
                route.fulfill(json={'messages': []}, headers=headers)
            elif path.endswith('/stream'):
                route.fulfill(content_type='text/event-stream', body='event: complete\ndata: {"report":"# Research report","sources":[]}\n\n', headers=headers)
            else:
                item = sessions[1] if 'session-2' in path else sessions[0]
                route.fulfill(json={'session': item, 'report': {'content': '# Research report'}, 'sources': []}, headers=headers)

        context.route(f'{PROJECT}/auth/v1/**', auth)
        context.route('http://localhost:8000/api/**', api)
        page.goto(ORIGIN)
        page.get_by_label('Email address').fill(USER['email'])
        page.get_by_label('Password', exact=True).fill('test-password')
        page.get_by_role('button', name='Sign In', exact=True).click()
        page.locator('#research-topic-input').fill('Preserve my topic')
        page.get_by_role('button', name='Deep Research', exact=True).click()
        page.locator('#generate-report-button').click()
        expect(page.get_by_role('heading', name='Report limit reached')).to_be_visible()
        expect(page.locator('#retry-research-button')).to_be_disabled()
        page.screenshot(path='/tmp/rate-limit-report-desktop.png')
        page.set_viewport_size({'width': 390, 'height': 844})
        page.screenshot(path='/tmp/rate-limit-report-mobile.png')
        page.set_viewport_size({'width': 1280, 'height': 900})
        expect(page.locator('#retry-research-button')).to_be_enabled(timeout=6000)
        assert len(report_requests) == 1  # Expiration does not automatically retry.
        state['reports'] = 503
        page.locator('#retry-research-button').click()
        expect(page.get_by_role('heading', name='Temporarily unavailable')).to_be_visible()
        assert report_requests[-1] == {'topic': 'Preserve my topic', 'mode': 'deep_research'}
        page.locator('#back-to-start-button').click()
        expect(page.locator('#research-topic-input')).to_have_value('Preserve my topic')
        state['reports'] = 200
        page.locator('#generate-report-button').click()
        expect(page.get_by_role('heading', name='Research report', exact=True)).to_be_visible()

        draft = 'Improve this draft without losing it'
        page.locator('textarea').fill(draft)
        page.locator('textarea').press('Enter')
        expect(page.get_by_role('status')).to_contain_text('Chat limit reached')
        expect(page.locator('textarea')).to_have_value(draft)
        expect(page.locator('textarea')).to_be_enabled()
        expect(page.get_by_role('button', name='Send message')).to_be_disabled()
        expect(page.get_by_text(draft, exact=True)).to_have_count(1)  # Draft only, no phantom bubble.
        page.screenshot(path='/tmp/rate-limit-chat-desktop.png')
        expect(page.get_by_role('button', name='Send message')).to_be_enabled(timeout=6000)
        assert len(chat_requests) == 1
        state['chat'] = 503
        page.get_by_role('button', name='Send message').click()
        expect(page.get_by_role('status')).to_contain_text('Temporarily unavailable')
        expect(page.locator('textarea')).to_have_value(draft)
        expect(page.get_by_role('button', name='Send message')).to_be_enabled()
        state['chat'] = 200
        page.get_by_role('button', name='Send message').click()
        expect(page.get_by_text('A successful reply', exact=True)).to_be_visible()

        state['chat'] = 429
        state['delay'] = 30
        page.locator('textarea').fill('Another question')
        page.get_by_role('button', name='Send message').click()
        expect(page.get_by_role('status')).to_contain_text('Chat limit reached')
        page.get_by_role('button', name='Open Sidebar', exact=True).click()
        page.get_by_text('Saved research 2', exact=True).click()
        expect(page.get_by_role('status')).to_contain_text('Chat limit reached')
        expect(page.locator('textarea')).to_be_enabled()
        page.locator('textarea').fill('Draft on second session')
        expect(page.get_by_role('button', name='Send message')).to_be_disabled()
        assert len(chat_requests) == 4
        assert not errors, errors
        browser.close()
        print('Rate-limit browser checks passed: 429/503, retry mode, drafts, cooldown expiry, cross-session state, loading recovery.')


if __name__ == '__main__':
    run()
