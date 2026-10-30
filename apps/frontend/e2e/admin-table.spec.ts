import { expect, type Page, test } from "@playwright/test";

/*
 * The data table kit, on the demo of /admin/development/admin-table: its
 * fake rows are fixed, dates included, so every state draws the same. A
 * change of the kit that moves a pixel fails here; accept a wanted one with
 * `test:visual:update`.
 */

const DEMO = "/admin/development/admin-table";

/** The demo with the given parameters, once its rows are in, without the tools of Next. */
async function open(page: Page, search = "") {
  await page.goto(`${DEMO}${search}`);
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

const settled = (page: Page) => expect(page.locator("table[aria-busy=false]")).toBeVisible();

/** The content of the page, without the sidebar. */
const content = (page: Page) => page.getByRole("heading", { level: 1 }).locator("xpath=../..");

const server = (page: Page, state: string) => page.getByRole("group", { name: "Réponse du serveur" }).getByText(state, { exact: true }).click();

test.describe("desktop", () => {
  test("table", async ({ page }) => {
    await open(page);
    await settled(page);
    await expect(content(page)).toHaveScreenshot("table.png");
  });

  test("grouped, filtered and sorted", async ({ page }) => {
    await open(page, "?users.group=status&users.f.status=active,suspended&users.sort=-lastSeenAt&users.fold=suspended");
    await settled(page);
    await expect(content(page)).toHaveScreenshot("grouped.png");
  });

  test("overview, page 2", async ({ page }) => {
    await open(page, "?users.view=overview&users.page=2");
    await settled(page);
    await expect(content(page)).toHaveScreenshot("overview.png");
  });

  test("cards", async ({ page }) => {
    await open(page, "?users.view=cards");
    await expect(page.locator("ul li").first()).toBeVisible();
    await expect(content(page)).toHaveScreenshot("cards.png");
  });

  test("loading keeps the widths of the columns", async ({ page }) => {
    await open(page);
    await settled(page);
    await server(page, "Chargement");
    await expect(page.locator("table[aria-busy=true]")).toBeVisible();
    await expect(page.getByRole("button", { name: "Trier" })).toBeDisabled();
    await expect(content(page)).toHaveScreenshot("loading.png");
  });

  test("empty and error", async ({ page }) => {
    await open(page);
    await settled(page);
    await server(page, "Vide");
    await expect(page.getByText("Aucun compte")).toBeVisible();
    await expect(content(page)).toHaveScreenshot("empty.png");
    await server(page, "Erreur");
    await expect(page.getByText("Chargement impossible")).toBeVisible();
    await expect(content(page)).toHaveScreenshot("error.png");
  });

  test("selection", async ({ page }) => {
    await open(page);
    await settled(page);
    await page.getByRole("checkbox", { name: "Sélectionner la ligne" }).nth(1).click();
    await expect(page.getByRole("toolbar", { name: "Sélection" })).toHaveScreenshot("selection.png");
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("table", async ({ page }) => {
    await open(page);
    await settled(page);
    await expect(content(page)).toHaveScreenshot("phone.png");
  });
});
