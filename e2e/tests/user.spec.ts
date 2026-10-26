import { clickAndWaitForLoad, loginAs, logout, restoreDB } from "../support/commands";
import { USER_DUMBLEDORE } from "../support/data";
import { expect, test } from "../support/test";

test.describe("Account management", () => {

  test.beforeEach(async ({ page }) => {
    await restoreDB(page.request);
  });

  test.afterAll(async ({ request }) => {
    await restoreDB(request);
  });

  test("supports registering, deleting a new account", async ({ registerPo, dashboardPo }) => {
    await registerPo.visit();

    await registerPo.name.fill("vivi");
    await registerPo.emailField.fill("vivi@example.com");
    await registerPo.password.fill("ffixrules");
    await registerPo.passwordBis.fill("ffixrules");
    await registerPo.timezoneSelect2Dropdown.choose("antarctica");
    await registerPo.termsAndConditions.click();
    await registerPo.rememberMe.click();
    await clickAndWaitForLoad(registerPo.submit);

    await dashboardPo.settings.visit();
    await clickAndWaitForLoad(dashboardPo.settings.deleteAccountButton);
  });

  test("supports changing our own user settings", async ({ page, dashboardPo, userProfilePo }) => {
    await loginAs(page, USER_DUMBLEDORE);
    await dashboardPo.settings.visit();

    await dashboardPo.settings.displayNameField.fill("WingardiumLeviosa");
    await dashboardPo.settings.bioEditor.clear();
    await dashboardPo.settings.bioEditor.type("magicStick.spawn('JAM_GAME')");
    await clickAndWaitForLoad(dashboardPo.settings.saveButton);
    await dashboardPo.sidebarAvatar.click();

    await expect(userProfilePo.userDisplayName).toContainText("WingardiumLeviosa");
    await expect(userProfilePo.userBio).toContainText("magicStick.spawn('JAM_GAME')");
  });

  test("supports changing our own password", async ({ page, dashboardPo, loginPo }) => {
    await loginAs(page, USER_DUMBLEDORE);
    await dashboardPo.changePassword.visit();

    await dashboardPo.changePassword.currentPasswordField.fill(USER_DUMBLEDORE);
    await dashboardPo.changePassword.newPasswordField.fill("123456");
    await dashboardPo.changePassword.newPasswordBisField.fill("123456");
    await clickAndWaitForLoad(dashboardPo.changePassword.saveButton);

    await logout(page);
    await loginPo.nameField.fill(USER_DUMBLEDORE);
    await loginPo.passwordField.fill("123456");
    await clickAndWaitForLoad(loginPo.submitButton);

    await dashboardPo.changePassword.visit();
  });

});
