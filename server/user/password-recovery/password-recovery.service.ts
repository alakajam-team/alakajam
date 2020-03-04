
import { Application } from "express";
import * as path from "path";
import * as randomKey from "random-key";
import * as configUtils from "server/core/config";
import constants from "server/core/constants";
import fileStorage from "server/core/file-storage";
import { createLuxonDate } from "server/core/formats";
import mailer from "server/core/mailer";
import * as models from "server/core/models";
import userService from "../user.service";

const PASSWORD_RECOVERY_TOKENS_PATH = path.join(configUtils.dataPathAbsolute(), "password-recovery.json");

export class PasswordRecoveryService {

  public async sendPasswordRecoveryEmail(app: Application, userEmail: string) {
    // Make sure the user exists
    const user = await models.User.where("email", userEmail).fetch();

    if (user) {
      // Routine work: clear expired tokens
      const passwordRecoveryTokens = app.locals.passwordRecoveryTokens;
      const now = createLuxonDate().toMillis();
      for (const key in passwordRecoveryTokens) {
        if (passwordRecoveryTokens[key].expires < now) {
          delete passwordRecoveryTokens[key];
        }
      }

      // Create token
      const token = randomKey.generate(32);
      passwordRecoveryTokens[token] = {
        userId: user.get("id"),
        expires: createLuxonDate().toMillis() + constants.PASSWORD_RECOVERY_LINK_MAX_AGE,
      };
      fileStorage.write(PASSWORD_RECOVERY_TOKENS_PATH, passwordRecoveryTokens);

      // Send email
      const context = {
        user,
        token,
      };
      await mailer.sendMail(app, user, "Your password recovery link", "email-password-recovery", context);
    }
  }

  public async loadPasswordRecoveryCache(app: Application) {
    if (await fileStorage.exists(PASSWORD_RECOVERY_TOKENS_PATH)) {
      const rawFile = await fileStorage.read(PASSWORD_RECOVERY_TOKENS_PATH);
      app.locals.passwordRecoveryTokens = JSON.parse(rawFile);
    } else {
      app.locals.passwordRecoveryTokens = {};
    }
  }

  /**
   *
   * @param {App} app
   * @param {string} token
   * @param {string} newPassword
   * @returns {boolean|string} true or an error message
   */
  public async recoverPasswordUsingToken(app: Application, token: string, newPassword: string) {
    if (this.validatePasswordRecoveryToken(app, token)) {
      const userId = app.locals.passwordRecoveryTokens[token].userId;
      const user = await userService.findById(userId);
      if (user) {
        const success = userService.setPassword(user, newPassword);
        if (success) {
          await user.save();
          delete app.locals.passwordRecoveryTokens[token];
          fileStorage.write(PASSWORD_RECOVERY_TOKENS_PATH, app.locals.passwordRecoveryTokens);
        }
        return success;
      } else {
        return "This user does not exist";
      }
    } else {
      return "Invalid password recovery token";
    }
  }

  public validatePasswordRecoveryToken(app: Application, token: string) {
    return app.locals.passwordRecoveryTokens[token] &&
      app.locals.passwordRecoveryTokens[token].expires > Date.now();
  }

}

export default new PasswordRecoveryService();
