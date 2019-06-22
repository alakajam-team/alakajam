/**
 * IRC / Discord Chat
 */
export async function chat(req, res) {
  res.locals.pageTitle = "Chat";

  res.render("explore/chat");
}
