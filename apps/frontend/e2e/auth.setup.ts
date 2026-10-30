import { expect, test as setup } from "@playwright/test";

/** Signs in once as the admin test account of the dev database, for every test. */
setup("sign in as admin", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email" }).fill(process.env.E2E_ADMIN_EMAIL ?? "alice_martin@test.local");
  await page.getByRole("textbox", { name: /Mot de passe/ }).fill(process.env.E2E_ADMIN_PASSWORD ?? "Testpass123!");
  await page.getByRole("button", { name: "Se connecter" }).last().click();
  await expect(page).not.toHaveURL(/\/login/);
  await page.context().storageState({ path: "e2e/.auth/admin.json" });
});
