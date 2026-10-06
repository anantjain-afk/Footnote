"""Browser auth smoke check with mocked remote services; creates no real accounts.

Run the frontend on port 5173, then: .venv/bin/python backend/tests/auth_browser_check.py
"""
import json
import time
from urllib.parse import urlsplit, urlencode
from uuid import uuid4

import jwt
from playwright.sync_api import sync_playwright, expect

ORIGIN = 'http://127.0.0.1:5173'
PROJECT = 'https://dehgmggpjxjyfbfsrypr.supabase.co'
USER = {'id': str(uuid4()), 'aud': 'authenticated', 'role': 'authenticated',
        'email': 'browser-test@example.com', 'app_metadata': {}, 'user_metadata': {},
        'created_at': '2026-10-06T00:00:00Z'}
TOKEN = jwt.encode({'sub': USER['id'], 'exp': int(time.time()) + 3600,
                    'aud': 'authenticated', 'role': 'authenticated'}, 'browser-test-secret', algorithm='HS256')
SESSION = {'access_token': TOKEN, 'refresh_token': 'mock-refresh-token', 'token_type': 'bearer',
           'expires_in': 3600, 'expires_at': int(time.time()) + 3600, 'user': USER}


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(viewport={'width': 1280, 'height': 900})
        page = context.new_page()
        errors = []
        requests = []
        google_enabled = False
        stream_requests = []
        test_session_id = str(uuid4())
        page.on('pageerror', lambda error: errors.append(str(error)))

        def auth_route(route):
            path = urlsplit(route.request.url).path
            headers = {'Access-Control-Allow-Origin': ORIGIN, 'Access-Control-Allow-Headers': '*'}
            if route.request.method == 'OPTIONS':
                route.fulfill(status=204, headers=headers)
                return
            requests.append(path)
            if path.endswith('/signup'):
                route.fulfill(status=200, json={'user': USER, 'session': None}, headers=headers)
            elif path.endswith('/token'):
                body = route.request.post_data_json
                if body.get('password') == 'wrong-password':
                    route.fulfill(status=400, json={'code': 'invalid_credentials', 'msg': 'Invalid login credentials'}, headers=headers)
                else:
                    route.fulfill(status=200, json=SESSION, headers=headers)
            elif path.endswith('/settings'):
                route.fulfill(status=200, json={'external': {'google': google_enabled}}, headers=headers)
            elif path.endswith('/authorize'):
                callback = urlencode({
                    'access_token': TOKEN, 'refresh_token': 'mock-refresh-token',
                    'expires_in': 3600, 'token_type': 'bearer',
                })
                route.fulfill(status=302, headers={'Location': ORIGIN + '/#' + callback})
            elif path.endswith('/logout'):
                route.fulfill(status=204, headers=headers)
            elif path.endswith('/user'):
                route.fulfill(status=200, json=USER, headers=headers)
            else:
                route.fulfill(status=400, json={'msg': 'Unexpected auth request'}, headers=headers)

        def api_route(route):
            headers = {'Access-Control-Allow-Origin': ORIGIN, 'Access-Control-Allow-Headers': '*',
                       'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'}
            if route.request.method == 'OPTIONS':
                route.fulfill(status=204, headers=headers)
                return
            assert route.request.headers.get('authorization') == f'Bearer {TOKEN}'
            assert 'token=' not in route.request.url
            path = urlsplit(route.request.url).path
            if path.endswith('/stream'):
                stream_requests.append(route.request.url)
                route.fulfill(status=200, content_type='text/event-stream', headers=headers,
                              body='event: complete\ndata: ' + json.dumps({'report': '# Browser stream verified', 'sources': []}) + '\n\n')
            elif path == '/api/sessions' and route.request.method == 'POST':
                route.fulfill(status=201, json={'session_id': test_session_id}, headers=headers)
            elif path.endswith('/chat'):
                route.fulfill(status=200, json={'messages': []}, headers=headers)
            else:
                route.fulfill(status=200, json=[], headers=headers)

        context.route(f'{PROJECT}/auth/v1/**', auth_route)
        context.route('http://localhost:8000/api/**', api_route)
        page.goto(ORIGIN)
        expect(page.get_by_role('button', name='Sign In', exact=True)).to_be_visible()
        page.get_by_label('Email address').fill(USER['email'])
        page.get_by_label('Password', exact=True).fill('test-password')
        page.get_by_role('button', name='Sign Up', exact=True).click()
        expect(page.get_by_role('status')).to_contain_text('Check your email')
        assert '/auth/v1/signup' in requests
        page.get_by_label('Password', exact=True).fill('wrong-password')
        page.get_by_role('button', name='Sign In', exact=True).click()
        expect(page.get_by_role('alert')).to_contain_text('Invalid login credentials')
        expect(page.get_by_role('button', name='Sign In', exact=True)).to_be_enabled()
        page.get_by_role('button', name='Google', exact=True).click()
        expect(page.get_by_role('alert')).to_contain_text('Google sign-in is not available yet')
        assert page.url == ORIGIN + '/'
        page.get_by_label('Password', exact=True).fill('test-password')
        page.get_by_role('button', name='Sign In', exact=True).click()
        expect(page.get_by_placeholder('What would you like to research today?')).to_be_visible()
        page.reload()
        expect(page.get_by_placeholder('What would you like to research today?')).to_be_visible()
        page.get_by_placeholder('What would you like to research today?').fill('Browser test topic')
        page.get_by_placeholder('What would you like to research today?').press('Enter')
        expect(page.get_by_role('heading', name='Browser stream verified', exact=True)).to_be_visible()
        assert stream_requests
        page.get_by_role('button', name='Open Sidebar', exact=True).click()
        page.get_by_role('button', name='Sign out', exact=True).click()
        expect(page.get_by_role('button', name='Sign In', exact=True)).to_be_visible()
        page.reload()
        expect(page.get_by_role('button', name='Sign In', exact=True)).to_be_visible()
        google_enabled = True
        page.get_by_role('button', name='Google', exact=True).click()
        expect(page.get_by_placeholder('What would you like to research today?')).to_be_visible()
        assert '/auth/v1/authorize' in requests
        page.get_by_role('button', name='Open Sidebar', exact=True).click()
        page.get_by_role('button', name='Sign out', exact=True).click()
        expect(page.get_by_role('button', name='Sign In', exact=True)).to_be_visible()
        assert not errors, errors
        page.screenshot(path='/tmp/research-agent-auth-desktop.png', full_page=True)
        page.set_viewport_size({'width': 390, 'height': 844})
        page.screenshot(path='/tmp/research-agent-auth-mobile.png', full_page=True)
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
        print('PASS: signup confirmation, invalid credentials, disabled Google, Google callback, login, authenticated API and research stream, reload persistence, sign-out, no React errors, mobile overflow')
        browser.close()


if __name__ == '__main__':
    run()
