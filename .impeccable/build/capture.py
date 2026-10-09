from pathlib import Path
from playwright.sync_api import expect, sync_playwright

out = Path('.impeccable/review')
out.mkdir(exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch()
    errors = []
    page = browser.new_page(viewport={"width": 1586, "height": 992}, device_scale_factor=1)
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto('http://127.0.0.1:5174/', wait_until='domcontentloaded')
    expect(page.get_by_role('heading', name='Every answer has a story.')).to_be_visible()
    page.evaluate('document.fonts.ready')
    page.screenshot(path=str(out / 'hero-repro.png'), animations='disabled')
    for name, size in [('desktop', {'width': 1440, 'height': 900}), ('mobile', {'width': 390, 'height': 844}), ('compact', {'width': 1280, 'height': 800})]:
        page.set_viewport_size(size)
        page.evaluate('window.scrollTo(0, 0)')
        if name == 'mobile':
            page.screenshot(path=str(out / 'mobile-first-screen.png'), animations='disabled')
            page.locator('.lp-filmstrip').evaluate('el => el.scrollLeft = el.scrollWidth')
            page.screenshot(path=str(out / 'mobile-filmstrip-end.png'), animations='disabled')
            page.locator('.lp-filmstrip').evaluate('el => el.scrollLeft = 0')
        page.screenshot(path=str(out / f'{name}.png'), full_page=True, animations='disabled')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'{name} horizontal overflow'
    page.set_viewport_size({'width': 1440, 'height': 900})
    page.evaluate('window.scrollTo(0, 0)')
    page.evaluate("window.scrollTo({top: window.innerHeight, behavior: 'instant'})")
    expect(page.locator('#lp-chapter-title-1')).to_be_visible()
    page.wait_for_function("document.querySelector('[data-chapter=\"1\"]').classList.contains('is-visible')")
    assert page.locator('[data-chapter="1"] .lp-chapter-paper-art').evaluate("el => getComputedStyle(el).animationName") == 'lp-paper-unfold'
    page.evaluate("window.scrollTo({top: 0, behavior: 'instant'})")
    expect(page.get_by_role('link', name='Start researching')).to_have_attribute('href', '?auth=signup')
    page.get_by_role('tab', name='Deep research').click()
    expect(page.get_by_text('Deep research uses your own Firecrawl key.')).to_be_visible()
    expect(page.get_by_role('heading', name='Plan the questions')).to_be_visible()
    page.get_by_role('button', name='Show step 3: Write & assemble').click()
    expect(page.locator('#lp-chapter-title-2')).to_be_visible()
    page.wait_for_function("Math.abs(document.querySelector('[data-chapter=\"2\"]').getBoundingClientRect().top) < 4")
    page.screenshot(path=str(out / 'landing-deep-stage.png'), animations='disabled')
    assert not errors, errors
    print('Landing desktop/mobile screenshots and tab/stage checks passed')
    browser.close()
