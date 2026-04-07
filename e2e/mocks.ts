import type { Page } from "@playwright/test";

export const MOCK_PR_INFO = {
  number: 42,
  title: "Upgrade HTTP client library",
  state: "open",
  user: { login: "testuser" },
  base: { ref: "main" },
  head: { ref: "feature/upgrade-http", sha: "abc123def456" },
  created_at: "2026-04-01T10:00:00Z",
  updated_at: "2026-04-05T15:30:00Z",
};

export const MOCK_DIFF = `diff --git a/src/api/client.ts b/src/api/client.ts
index abc1234..def5678 100644
--- a/src/api/client.ts
+++ b/src/api/client.ts
@@ -1,8 +1,8 @@
-import { OldHttpClient } from 'old-http';
-import { OldConfig } from 'old-http/config';
+import { NewHttpClient } from 'new-http';
+import { NewConfig } from 'new-http/config';
 import { Logger } from './logger';

 export function createClient(baseUrl: string) {
-  const config = new OldConfig({ timeout: 5000 });
-  return new OldHttpClient(baseUrl, config);
+  const config = new NewConfig({ timeout: 5000 });
+  return new NewHttpClient(baseUrl, config);
 }
diff --git a/src/api/endpoints.ts b/src/api/endpoints.ts
index abc1234..def5678 100644
--- a/src/api/endpoints.ts
+++ b/src/api/endpoints.ts
@@ -1,6 +1,6 @@
-import { OldHttpClient } from 'old-http';
+import { NewHttpClient } from 'new-http';
 import { User } from '../types';

-export async function getUser(client: OldHttpClient, id: string): Promise<User> {
+export async function getUser(client: NewHttpClient, id: string): Promise<User> {
   return client.get(\`/users/\${id}\`);
 }
diff --git a/src/utils/helpers.ts b/src/utils/helpers.ts
index abc1234..def5678 100644
--- a/src/utils/helpers.ts
+++ b/src/utils/helpers.ts
@@ -1,7 +1,7 @@
 export function formatDate(date: Date): string {
-  return date.toISOString().split('T')[0];
+  return date.toLocaleDateString('en-US');
 }

 export function capitalize(str: string): string {
   return str.charAt(0).toUpperCase() + str.slice(1);
 }
`;

export const MOCK_COMMENTS: unknown[] = [];

/**
 * Set up route mocking for all GitHub API calls.
 * Call this before navigating or interacting with the app.
 */
export async function mockGitHubAPI(page: Page) {
  // Mock PR comments (must be registered before the general PR route)
  await page.route("**/api.github.com/repos/**/comments", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_COMMENTS),
    });
  });

  // Mock PR info / diff
  await page.route("**/api.github.com/repos/**/pulls/**", async (route) => {
    const request = route.request();
    const accept = request.headers()["accept"] ?? "";

    if (accept.includes("application/vnd.github.diff")) {
      await route.fulfill({
        status: 200,
        contentType: "text/plain",
        body: MOCK_DIFF,
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_PR_INFO),
      });
    }
  });
}

/**
 * Enter a fake token and load the mock PR.
 */
export async function loadMockPR(page: Page) {
  // Enter token
  const tokenInput = page.locator("#token-input");
  await tokenInput.fill("ghp_fake_test_token");
  await page.locator("button", { hasText: "Save" }).click();

  // Enter PR reference and load
  const prInput = page.locator("#pr-input");
  await prInput.fill("testowner/testrepo#42");
  await page.locator("button", { hasText: "Load" }).click();

  // Wait for diff to render
  await page.waitForSelector("[data-file-index]");
}
