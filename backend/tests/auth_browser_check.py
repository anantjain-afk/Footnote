"""Browser auth smoke check with mocked remote services; creates no real accounts.

Run the frontend on port 5173, then: .venv/bin/python backend/tests/auth_browser_check.py
"""
import json
import time
from pathlib import Path
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
        saved_id = str(uuid4())
        history_state = 'loaded'
        history_requests = []
        saved_sessions = [
            {'id': saved_id, 'topic': 'Walkable cities and public transport', 'status': 'completed', 'mode': 'deep_research', 'created_at': '2026-10-06T10:00:00Z'},
            {'id': str(uuid4()), 'topic': 'Advances in energy storage', 'status': 'running', 'mode': 'normal', 'created_at': '2026-10-05T10:00:00Z'},
        ]
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
            elif path == '/api/sessions':
                history_requests.append(path)
                route.fulfill(status=503 if history_state == 'error' else 200, json={'detail': 'Unavailable'} if history_state == 'error' else [] if history_state == 'empty' else saved_sessions, headers=headers)
            elif path == f'/api/sessions/{saved_id}':
                route.fulfill(status=200, json={'session': saved_sessions[0], 'report': {'content': '# Saved city report', 'created_at': saved_sessions[0]['created_at']}, 'sources': []}, headers=headers)
            elif path.endswith('/chat'):
                route.fulfill(status=200, json={'messages': []}, headers=headers)
            else:
                route.fulfill(status=200, json=[], headers=headers)

        context.route(f'{PROJECT}/auth/v1/**', auth_route)
        context.route('http://localhost:8000/api/**', api_route)
        screenshots = Path('.impeccable/review')
        screenshots.mkdir(parents=True, exist_ok=True)

        def capture(name):
            for label, width, height in [('desktop', 1440, 1000), ('mobile', 390, 844)]:
                page.set_viewport_size({'width': width, 'height': height})
                page.evaluate('document.fonts.ready')
                page.evaluate('window.scrollTo(0, 0)')
                page.screenshot(path=str(screenshots / f'{name}-{label}.png'), full_page=True)
                assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), name
            page.set_viewport_size({'width': 1440, 'height': 1000})

        page.goto(ORIGIN)
        expect(page.get_by_role('heading', name='Follow your curiosity.')).to_be_visible()
        assert not history_requests, 'Logged-out visits must not request private session history'
        capture('landing')
        page.get_by_role('link', name='Start researching', exact=True).click()
        expect(page.get_by_role('heading', name='Create your account', exact=True)).to_be_visible()
        capture('signup')
        page.get_by_label('Email address').fill(USER['email'])
        page.get_by_label('Password', exact=True).fill('test-password')
        page.get_by_role('button', name='Create account', exact=True).click()
        expect(page.get_by_role('status')).to_contain_text('Check your email')
        assert '/auth/v1/signup' in requests
        page.get_by_role('button', name='Sign in', exact=True).click()
        page.get_by_label('Password', exact=True).fill('wrong-password')
        page.get_by_role('button', name='Sign in', exact=True).click()
        expect(page.get_by_role('alert')).to_contain_text('Invalid login credentials')
        expect(page.get_by_role('button', name='Sign in', exact=True)).to_be_enabled()
        page.get_by_role('button', name='Continue with Google', exact=True).click()
        expect(page.get_by_role('alert')).to_contain_text('Google sign-in is not available yet')
        page.reload()
        expect(page.get_by_role('heading', name='Welcome back', exact=True)).to_be_visible()
        capture('signin')
        page.get_by_label('Email address').fill(USER['email'])
        page.get_by_label('Password', exact=True).fill('test-password')
        page.get_by_role('button', name='Sign in', exact=True).click()
        expect(page.get_by_role('heading', name='Your research, continued.')).to_be_visible()
        expect(page.locator('.session-list')).to_contain_text(saved_sessions[0]['topic'])
        assert page.url == ORIGIN + '/'
        capture('dashboard')
        page.get_by_label('Search research history').fill('no matching topic')
        expect(page.get_by_text('No research matches', exact=False)).to_be_visible()
        page.get_by_role('button', name='Clear search', exact=True).click()
        page.locator('.session-list').get_by_role('button', name='Walkable cities', exact=False).click()
        expect(page.get_by_role('heading', name='Saved city report', exact=True)).to_be_visible()
        page.reload()
        expect(page.get_by_role('heading', name='Your research, continued.')).to_be_visible()
        history_state = 'empty'
        page.reload()
        expect(page.get_by_text('A place for your next discovery.')).to_be_visible()
        history_state = 'error'
        page.reload()
        expect(page.get_by_text('Your research history couldn’t be loaded. Please try again.')).to_be_visible()
        history_state = 'loaded'
        page.get_by_role('button', name='Try again', exact=True).click()
        expect(page.locator('.session-list')).to_contain_text(saved_sessions[0]['topic'])
        page.get_by_label('Deep research', exact=True).check()
        expect(page.get_by_text('A broader investigation', exact=False)).to_be_visible()
        page.get_by_label('Normal', exact=True).check()
        page.get_by_placeholder('What would you like to research today?').fill('Browser test topic')
        page.get_by_placeholder('What would you like to research today?').press('Enter')
        expect(page.get_by_role('heading', name='Browser stream verified', exact=True)).to_be_visible()
        assert stream_requests
        page.get_by_role('button', name='Open Sidebar', exact=True).click()
        page.get_by_role('button', name='Sign out', exact=True).click()
        expect(page.get_by_role('heading', name='Follow your curiosity.')).to_be_visible()
        page.reload()
        expect(page.get_by_role('heading', name='Follow your curiosity.')).to_be_visible()
        google_enabled = True
        page.get_by_role('link', name='Sign in', exact=True).first.click()
        page.get_by_role('button', name='Continue with Google', exact=True).click()
        expect(page.get_by_role('heading', name='Your research, continued.')).to_be_visible()
        assert '/auth/v1/authorize' in requests
        page.get_by_role('button', name='Open Sidebar', exact=True).click()
        page.get_by_role('button', name='Sign out', exact=True).click()
        expect(page.get_by_role('heading', name='Follow your curiosity.')).to_be_visible()
        page.goto(ORIGIN + '/?error_description=Sign-in+was+cancelled')
        expect(page.get_by_role('alert')).to_contain_text('Sign-in was cancelled')
        assert not errors, errors
        print('PASS: public landing, no logged-out history requests, signup confirmation, invalid credentials, Google unavailable and callback, sign-in, dashboard routing, saved reports, search, empty/error/retry history, research modes and stream, reload persistence, sign-out, callback errors, four desktop/mobile layouts, no React errors or overflow')
        browser.close()


if __name__ == '__main__':
    run()
