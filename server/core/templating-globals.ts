import constants from "./constants";
import enums from "./enums";
import templatingFunctions from "./templating-functions";

export function configure({devMode, launchTime, nunjucksEnvironment}:
   {devMode: boolean, launchTime: number, nunjucksEnvironment: any}) {

  nunjucksEnvironment.addGlobal("browserRefreshUrl", process.env.BROWSER_REFRESH_URL);
  nunjucksEnvironment.addGlobal("constants", constants);
  nunjucksEnvironment.addGlobal("enums", enums);
  nunjucksEnvironment.addGlobal("devMode", devMode);
  nunjucksEnvironment.addGlobal("launchTime", launchTime);
  nunjucksEnvironment.addGlobal("context", function() {
    // lets devs display the whole templating context with
    // {{ context() | prettyDump | safe }}
    this.ctx.constants = constants;
    this.ctx.enums = enums;
    this.ctx.devMode = devMode;
    this.ctx.launchTime = launchTime;
    return this.ctx;
  });

  Object.keys(templatingFunctions).forEach((functionName) => {
    nunjucksEnvironment.addGlobal(functionName, templatingFunctions[functionName]);
  });
}
