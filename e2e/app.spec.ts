import { test, expect } from "@playwright/test";
import { mockGitHubAPI, loadMockPR } from "./mocks";

test.beforeEach(async ({ page }) => {
  await mockGitHubAPI(page);
  await page.goto("/");
});

test.describe("loading a PR", () => {
  test("shows placeholder before loading", async ({ page }) => {
    await expect(page.locator("text=Load a PR to see its diff")).toBeVisible();
  });

  test("loads and displays PR info", async ({ page }) => {
    await loadMockPR(page);

    await expect(page.locator("text=Upgrade HTTP client library")).toBeVisible();
    await expect(page.locator("text=#42")).toBeVisible();
    await expect(page.locator("text=testuser")).toBeVisible();
  });

  test("displays file list in sidebar", async ({ page }) => {
    await loadMockPR(page);

    // Check the sidebar file list buttons (not the diff headers)
    await expect(page.getByRole("button", { name: /src\/api\/client\.ts/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /src\/api\/endpoints\.ts/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /src\/utils\/helpers\.ts/ })).toBeVisible();
  });

  test("displays diff content", async ({ page }) => {
    await loadMockPR(page);

    // Check that diff lines are rendered
    await expect(page.locator('[data-line-kind="deletion"]').first()).toBeVisible();
    await expect(page.locator('[data-line-kind="addition"]').first()).toBeVisible();
  });

  test("shows correct file and change counts", async ({ page }) => {
    await loadMockPR(page);

    // 3 files in the mock diff
    await expect(page.locator("text=Files (3)")).toBeVisible();
  });
});

test.describe("diff navigation", () => {
  test.beforeEach(async ({ page }) => {
    await loadMockPR(page);
  });

  test("navigates to next/previous change with buttons", async ({ page }) => {
    const nextChangeBtn = page.locator("[title*='Next change']");
    const prevChangeBtn = page.locator("[title*='Previous change']");

    await expect(nextChangeBtn).toBeVisible();
    await expect(prevChangeBtn).toBeVisible();

    // Click next change and verify scroll happened (hunk should be visible)
    await nextChangeBtn.click();
    await expect(page.locator("[data-hunk-id]").first()).toBeVisible();
  });

  test("navigates to next/previous file with buttons", async ({ page }) => {
    const nextFileBtn = page.locator("[title*='Next file']");

    await nextFileBtn.click();
    // After navigating, the second file's diff header should be visible
    await expect(page.locator("[data-file-index='1']")).toBeVisible();
  });
});

test.describe("view toggle", () => {
  test.beforeEach(async ({ page }) => {
    await loadMockPR(page);
  });

  test("defaults to unified view", async ({ page }) => {
    // Unified button should be active (has bg-gray-700)
    const unifiedBtn = page.locator("button", { hasText: "Unified" });
    await expect(unifiedBtn).toHaveClass(/bg-gray-700/);
  });

  test("switches to split view", async ({ page }) => {
    const splitBtn = page.locator("button", { hasText: "Split" });
    await splitBtn.click();

    // Split button should now be active
    await expect(splitBtn).toHaveClass(/bg-gray-700/);

    // Unified should no longer be active
    const unifiedBtn = page.locator("button", { hasText: "Unified" });
    await expect(unifiedBtn).not.toHaveClass(/bg-gray-700/);
  });

  test("toggles view with keyboard shortcut", async ({ page }) => {
    // Press 't' to toggle
    await page.keyboard.press("t");

    // Should now be in split view
    const splitBtn = page.locator("button", { hasText: "Split" });
    await expect(splitBtn).toHaveClass(/bg-gray-700/);
  });
});

test.describe("file list views", () => {
  test.beforeEach(async ({ page }) => {
    await loadMockPR(page);
  });

  test("defaults to flat view", async ({ page }) => {
    const flatBtn = page.locator("button", { hasText: "Flat" });
    await expect(flatBtn).toHaveClass(/bg-gray-700/);
  });

  test("switches to tree view", async ({ page }) => {
    const treeBtn = page.locator("button", { hasText: "Tree" });
    await treeBtn.click();

    await expect(treeBtn).toHaveClass(/bg-gray-700/);

    // In tree view, folder collapse buttons should be visible
    await expect(page.getByRole("button", { name: /▼ src/ })).toBeVisible();
  });

  test("clicking a file scrolls to it", async ({ page }) => {
    // Click on the third file in the sidebar (the button with the filename)
    await page.getByRole("button", { name: /src\/utils\/helpers\.ts/ }).click();

    // The file's diff section should be visible
    await expect(page.locator("[data-file-index='2']")).toBeVisible();
  });
});

test.describe("filters", () => {
  test.beforeEach(async ({ page }) => {
    await loadMockPR(page);
  });

  test("shows built-in filters", async ({ page }) => {
    await expect(page.locator("text=Imports (Kotlin/Java)")).toBeVisible();
    await expect(page.locator("text=Whitespace-only lines")).toBeVisible();
  });

  test("enabling import filter hides import diffs", async ({ page }) => {
    // Count visible changes before filtering
    const changesBefore = await page.locator('[data-line-kind="addition"]').count();

    // Enable the TypeScript/JavaScript imports filter
    const tsImportFilter = page.locator("text=Imports (TypeScript/JavaScript)").locator("..");
    const checkbox = tsImportFilter.locator("input[type='checkbox']");
    await checkbox.check();

    // There should be fewer visible additions now
    const changesAfter = await page.locator('[data-line-kind="addition"]').count();
    expect(changesAfter).toBeLessThan(changesBefore);

    // The "hidden" indicator should be visible
    await expect(page.locator("text=/\\d+ hidden/")).toBeVisible();
  });

  test("adding a custom filter", async ({ page }) => {
    // Click "+ Add"
    await page.locator("button", { hasText: "+ Add" }).click();

    // Fill in the filter form
    await page.locator("input[placeholder='Filter name']").fill("Old/New HTTP client");
    await page.locator("input[placeholder='Regex for removed lines']").fill("OldHttpClient|OldConfig");
    await page.locator("input[placeholder='Regex for added lines']").fill("NewHttpClient|NewConfig");

    // Submit the filter
    await page.locator("button", { hasText: "Add Filter" }).click();

    // The filter should appear in the list
    await expect(page.locator("text=Old/New HTTP client")).toBeVisible();

    // Enable it
    const filterItem = page.locator("text=Old/New HTTP client").locator("..");
    const checkbox = filterItem.locator("input[type='checkbox']");
    await checkbox.check();

    // Changes should be hidden
    await expect(page.locator("text=/\\d+ hidden/")).toBeVisible();
  });

  test("disabling a filter restores hidden changes", async ({ page }) => {
    // Enable an import filter
    const tsImportFilter = page.locator("text=Imports (TypeScript/JavaScript)").locator("..");
    const checkbox = tsImportFilter.locator("input[type='checkbox']");
    await checkbox.check();

    const changesWithFilter = await page.locator('[data-line-kind="addition"]').count();

    // Disable it
    await checkbox.uncheck();

    const changesWithout = await page.locator('[data-line-kind="addition"]').count();
    expect(changesWithout).toBeGreaterThan(changesWithFilter);
  });

  test("filter with diff regex (normalize-and-compare)", async ({ page }) => {
    await page.locator("button", { hasText: "+ Add" }).click();

    await page.locator("input[placeholder='Filter name']").fill("Old→New rename");
    await page.locator("input[placeholder='Regex to strip — hide if sides become equal']").fill("Old|New");

    await page.locator("button", { hasText: "Add Filter" }).click();

    // Enable it
    const filterItem = page.locator("text=Old→New rename").locator("..");
    await filterItem.locator("input[type='checkbox']").check();

    // Some changes should be hidden (import lines where Old→New is the only difference)
    await expect(page.locator("text=/\\d+ hidden/")).toBeVisible();
  });

  test("files with all changes filtered are hidden from file list", async ({ page }) => {
    // The helpers.ts file has a formatDate change unrelated to imports.
    // Create a filter that hides everything in that file.
    await page.locator("button", { hasText: "+ Add" }).click();
    await page.locator("input[placeholder='Filter name']").fill("Hide helpers");
    await page.locator("input[placeholder='Regex for removed lines']").fill("toISOString|capitalize");
    await page.locator("input[placeholder='Regex for added lines']").fill("toLocaleDateString|capitalize");

    // Set to OR mode
    await page.locator("select").first().selectOption("or");

    await page.locator("button", { hasText: "Add Filter" }).click();

    const filterItem = page.locator("text=Hide helpers").locator("..");
    await filterItem.locator("input[type='checkbox']").check();

    // helpers.ts should no longer be in the file list (all its changes are filtered)
    // Wait a moment for the UI to update
    await page.waitForTimeout(100);
    const fileList = page.locator("text=src/utils/helpers.ts");
    // The file should not be visible in the sidebar file list
    // (it might still exist in the diff area as a hidden element, so check the sidebar specifically)
    const sidebarHelpers = page.locator("[data-file-index]").filter({ hasText: "helpers.ts" });
    await expect(sidebarHelpers).toHaveCount(0);
  });
});

test.describe("authentication", () => {
  test("shows token input on load", async ({ page }) => {
    await expect(page.locator("#token-input")).toBeVisible();
  });

  test("shows storage mode options", async ({ page }) => {
    await expect(page.locator("text=Session only")).toBeVisible();
    await expect(page.locator("text=Remember")).toBeVisible();
  });

  test("PR input is disabled without token", async ({ page }) => {
    await expect(page.locator("#pr-input")).toBeDisabled();
  });

  test("PR input is enabled after entering token", async ({ page }) => {
    await page.locator("#token-input").fill("ghp_fake");
    await page.locator("button", { hasText: "Save" }).click();

    await expect(page.locator("#pr-input")).toBeEnabled();
  });
});
