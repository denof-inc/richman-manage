# Test info

- Name: property detail page loads correctly
- Location: /Users/tttela/Documents/Work/denof/works/250428richman-manage/dev/richman-manage/apps/web/e2e/property.e2e.ts:9:5

# Error details

```
Error: Timed out 5000ms waiting for expect(locator).toBeVisible()

Locator: locator('h1')
Expected: visible
Received: <element(s) not found>
Call log:
  - expect.toBeVisible with timeout 5000ms
  - waiting for locator('h1')

    at /Users/tttela/Documents/Work/denof/works/250428richman-manage/dev/richman-manage/apps/web/e2e/property.e2e.ts:11:36
```

# Page snapshot

```yaml
- button "Open Next.js Dev Tools":
  - img
- button "Open issues overlay": 1 Issue
- button "Collapse issues badge":
  - img
- navigation:
  - button "previous" [disabled]:
    - img "previous"
  - text: 1/1
  - button "next" [disabled]:
    - img "next"
- img
- link "Next.js 15.3.1 (stale) Webpack":
  - /url: https://nextjs.org/docs/messages/version-staleness
  - img
  - text: Next.js 15.3.1 (stale) Webpack
- img
- dialog "Runtime Error":
  - text: Runtime Error
  - button "Copy Stack Trace":
    - img
  - button "No related documentation found" [disabled]:
    - img
  - link "Learn more about enabling Node.js inspector for server code with Chrome DevTools":
    - /url: https://nextjs.org/docs/app/building-your-application/configuring/debugging#server-side-code
    - img
  - paragraph: "Error: Cannot read properties of undefined (reading 'filter')"
  - paragraph:
    - img
    - text: src/components/rentroll/RentRollTable.tsx (91:31) @ RentRollTable
    - button "Open in editor":
      - img
  - text: "89 | 90 | // フィルタリング > 91 | const filteredUnits = units.filter((unit) => { | ^ 92 | if (filterProperty !== 'all' && unit.property_id !== filterProperty) return false; 93 | if (filterStatus !== 'all' && unit.status !== filterStatus) return false; 94 | if (filterType !== 'all' && unit.unit_type !== filterType) return false;"
  - paragraph: Call Stack 3
  - button "Show 1 ignore-listed frame(s)":
    - text: Show 1 ignore-listed frame(s)
    - img
  - text: RentRollTable
  - button:
    - img
  - text: src/components/rentroll/RentRollTable.tsx (91:31) PropertyDetailPage
  - button:
    - img
  - text: src/app/properties/[propertyId]/page.tsx (233:17)
- contentinfo:
  - region "Error feedback":
    - paragraph:
      - link "Was this helpful?":
        - /url: https://nextjs.org/telemetry#error-feedback
    - button "Mark as helpful"
    - button "Mark as not helpful"
- 'heading "Application error: a client-side exception has occurred while loading localhost (see the browser console for more information)." [level=2]'
```

# Test source

```ts
   1 | import { test, expect } from '@playwright/test';
   2 |
   3 | test('property list page loads correctly', async ({ page }) => {
   4 |   await page.goto('/properties');
   5 |   await expect(page.locator('h1')).toContainText('物件一覧');
   6 |   await expect(page.locator('table')).toBeVisible();
   7 | });
   8 |
   9 | test('property detail page loads correctly', async ({ page }) => {
  10 |   await page.goto('/properties/550e8400-e29b-41d4-a716-446655440000');
> 11 |   await expect(page.locator('h1')).toBeVisible();
     |                                    ^ Error: Timed out 5000ms waiting for expect(locator).toBeVisible()
  12 |   await expect(page.locator('role=tab')).toBeVisible();
  13 | });
  14 |
```