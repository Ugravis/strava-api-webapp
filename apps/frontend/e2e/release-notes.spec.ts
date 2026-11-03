import { expect, type Page, test } from "@playwright/test";

/*
 * The release notes, from the back office to the users: a note written
 * ahead for a version not out yet, previewed, then deleted, so that the dev
 * database is left as found. Functional checks, no captures.
 */

const PAGE = "/admin/release-notes";
const VERSION = "99.0.0";

async function open(page: Page, search = "") {
  await page.goto(`${PAGE}${search}`);
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await expect(page.locator("table[aria-busy=false]")).toBeVisible();
}

test.describe("release notes", () => {
  test("lists one row per release, the running one marked", async ({ page }) => {
    await open(page);
    await expect(page.getByRole("heading", { level: 1, name: "Notes de MAJ" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Version en ligne" }).first()).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: "v0.1.0" })).toBeVisible();
  });

  test("writes a note ahead, previews it, then deletes it", async ({ page }) => {
    await open(page, "?row=new:release-note&panel=overlay");
    const panel = page.getByRole("complementary");
    await panel.getByRole("textbox", { name: "Version" }).fill(VERSION);
    // A major version: shown in a popup by default.
    await expect(panel.getByText("Popup + notification")).toBeVisible();
    await panel.getByRole("textbox", { name: "Titre" }).fill("Note de test");
    await panel.getByRole("button", { name: "Créer le brouillon" }).click();
    await expect(page).toHaveURL(new RegExp(`row=${VERSION.replaceAll(".", "\\.")}`));
    await expect(page.getByRole("row").filter({ hasText: `v${VERSION}` })).toContainText("Brouillon");

    await panel.getByRole("button", { name: "Aperçu" }).click();
    const preview = page.getByRole("dialog", { name: `Aperçu de la v${VERSION}` });
    await expect(preview.getByRole("heading", { name: "Note de test" })).toBeVisible();
    await preview.getByRole("tab", { name: "Notification" }).click();
    await expect(preview).toContainText(`Nouveautés de la version ${VERSION}`);
    await page.keyboard.press("Escape");

    await panel.getByRole("button", { name: "Supprimer" }).click();
    const confirm = page.getByRole("alertdialog").or(page.getByRole("dialog"));
    await confirm.getByRole("button", { name: "Doublon" }).click();
    await confirm.getByRole("textbox", { name: `Tapez ${VERSION} pour confirmer` }).fill(VERSION);
    await confirm.getByRole("button", { name: "Supprimer" }).click();
    await expect(page.getByRole("row").filter({ hasText: `v${VERSION}` })).toHaveCount(0);
  });

  test("refuses a version already listed, under its field", async ({ page }) => {
    await open(page, "?row=new:release-note&panel=overlay");
    const panel = page.getByRole("complementary");
    await panel.getByRole("textbox", { name: "Version" }).fill("0.1.0");
    await panel.getByRole("textbox", { name: "Titre" }).fill("Doublon");
    await panel.getByRole("button", { name: "Créer le brouillon" }).click();
    await expect(panel.getByText("Cette version a déjà sa ligne.")).toBeVisible();
  });

  test("shows the history of the published notes", async ({ page }) => {
    await page.goto("/nouveautes");
    await expect(page.getByRole("heading", { level: 1, name: "Nouveautés" })).toBeVisible();
    await expect(page.locator("article").first().or(page.getByText("Aucune note de version pour l'instant."))).toBeVisible();
  });
});
