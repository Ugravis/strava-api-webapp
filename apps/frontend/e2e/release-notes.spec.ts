import { expect, type Page, test } from "@playwright/test";

/*
 * The release notes, from the back office to the users: a note written
 * ahead for a version not out yet, previewed, then deleted, so that the dev
 * database is left as found. Functional checks, no captures.
 */

const PAGE = "/admin/release-notes";
const VERSION = "99.0.0-beta.1";
const RENAMED = "99.0.0-beta.2";
/** A PNG of one pixel. */
const PIXEL = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

async function open(page: Page, search = "") {
  await page.goto(`${PAGE}${search}`);
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await expect(page.locator("table[aria-busy=false]")).toBeVisible({ timeout: 60_000 });
}

test.describe("release notes", () => {
  // The dev server compiles the pages on their first visit.
  test.setTimeout(120_000);

  test("lists one row per release, the running one marked", async ({ page }) => {
    await open(page);
    await expect(page.getByRole("heading", { level: 1, name: "Notes de release" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Version en ligne" }).first()).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: "v0.1.0" })).toBeVisible();
  });

  test("writes a note ahead for a pre-release, renames it, gives it a banner, previews it, then deletes it", async ({ page }) => {
    await open(page, "?row=new:release-note&panel=overlay");
    const panel = page.getByRole("complementary");
    await panel.getByRole("textbox", { name: "Version" }).fill(VERSION);
    // A pre-release: a notification only, by default.
    await expect(panel.getByText("Notification seule")).toBeVisible();
    await panel.getByRole("textbox", { name: "Titre" }).fill("Note de test");
    await panel.getByRole("button", { name: "Créer le brouillon" }).click();
    await expect(page).toHaveURL(/row=99\.0\.0-beta\.1/);
    await expect(page.getByRole("row").filter({ hasText: `v${VERSION}` })).toContainText("Brouillon");

    // A draft not out yet changes version.
    await panel.getByRole("button", { name: "Modifier : Version" }).click();
    // The field opened holds the version: its selector no longer matches once typed.
    await panel.locator(`input[value="${VERSION}"]`).fill(RENAMED);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("row").filter({ hasText: `v${RENAMED}` })).toBeVisible();
    await expect(page).toHaveURL(/row=99\.0\.0-beta\.2/, { timeout: 10_000 });

    await panel.getByRole("button", { name: "Modifier : Bannière" }).click();
    await page.locator("input[type=file]").setInputFiles({ name: "banner.png", mimeType: "image/png", buffer: PIXEL });
    await page.getByRole("button", { name: "Valider" }).click();
    await expect(panel.getByRole("img", { name: `Bannière de la v${RENAMED}` }).first()).toBeVisible();

    const download = page.waitForEvent("download");
    await panel.getByRole("button", { name: "PDF" }).click();
    expect((await download).suggestedFilename()).toBe(`kilotrace-v${RENAMED}.pdf`);

    await panel.getByRole("button", { name: "Aperçu" }).click();
    const preview = page.getByRole("dialog", { name: `Aperçu de la v${RENAMED}` });
    // Opened on the surface of its display: the notification.
    await expect(preview.getByRole("tab", { name: "Notification" })).toHaveAttribute("aria-selected", "true");
    await preview.getByRole("tab", { name: "Popup" }).click();
    await expect(preview.getByRole("heading", { name: "Note de test" })).toBeVisible();
    await preview.getByRole("tab", { name: "Notification" }).click();
    await expect(preview).toContainText(`Nouveautés de la version ${RENAMED}`);
    await page.keyboard.press("Escape");
    await expect(preview).toBeHidden();

    await panel.getByRole("button", { name: "Supprimer" }).click();
    const confirm = page.getByRole("alertdialog").filter({ has: page.getByRole("heading", { name: `Supprimer la note de la v${RENAMED} ?` }) });
    await confirm.getByRole("button", { name: "Doublon" }).click();
    await confirm.getByRole("textbox", { name: `Tapez ${RENAMED} pour confirmer` }).fill(RENAMED);
    await confirm.getByRole("button", { name: "Supprimer" }).click();
    // Deleted: the panel closes, the list loads again without it.
    await expect(page).not.toHaveURL(/row=/);
    await expect(page.locator("table[aria-busy=false]")).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: "v99.0.0" })).toHaveCount(0);
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
