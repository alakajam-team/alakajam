/**
 * Logout
 */
export async function logout(req, res) {
  res.locals.pageTitle = "Login";

  await req.session.regeneratePromisified();
  res.locals.user = null;
  res.render("user/authentication/login", {
    infoMessage: "Logout successful.",
  });
}
