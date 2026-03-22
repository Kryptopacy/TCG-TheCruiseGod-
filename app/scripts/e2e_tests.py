from playwright.sync_api import sync_playwright

def test_tcg_e2e():
    print("Starting TCG End-to-End Tests...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # Test 1: Homepage Load
        print("Test 1: Navigate to TCG Homepage")
        page.goto('http://localhost:3000')
        page.wait_for_load_state('networkidle')
        assert "TCG" in page.title() or page.locator("text=TCG").is_visible(), "TCG title not found in page!"
        print("Homepage loaded successfully.")

        # Test 2: Verify Trophy Room Link
        print("Test 2: Verify Trophy Room Link")
        trophy_link = page.locator("a[href='/trophy-room']")
        assert trophy_link.count() > 0, "Trophy Room link missing!"
        print("Trophy Room Nav link exists.")

        # Test 3: Chat Input Presence
        print("Test 3: Verify Chat Input Region")
        input_locator = page.locator("input[placeholder*='Where are you?']")
        assert input_locator.count() > 0, "Location input missing!"
        print("Location input field is active.")

        # Capture artifact
        page.screenshot(path='e2e-screenshot.png', full_page=True)
        print("Captured e2e-screenshot.png")
        
        browser.close()
        print("All E2E Playwright tests passed.")

if __name__ == "__main__":
    test_tcg_e2e()
