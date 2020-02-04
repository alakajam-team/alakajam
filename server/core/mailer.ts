import { BookshelfModel } from "bookshelf";
import { Application } from "express";
import * as nodemailer from "nodemailer";
import * as MailTransport from "nodemailer/lib/mailer";
import config from "server/core/config";
import forms from "server/core/forms";
import log from "server/core/log";

export class Mailer {

  private mailTransport: MailTransport;

  public constructor() {
    if (!config.DEBUG_TEST_MAILER) {
      this.mailTransport = nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: true,
        auth: {
          user: config.SMTP_USERNAME,
          pass: config.SMTP_PASSWORD,
        },
      });

      this.mailTransport.verify((err) => {
        if (err) {
          log.error("Failed to initialize SMTP mailer: " + err.message);
        } else {
          log.info("SMTP mailer initialized");
        }
      });
    } else {
      nodemailer.createTestAccount((err, account) => {
        if (!err) {
          this.mailTransport = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false,
            tls: { rejectUnauthorized: false },
            auth: {
              user: account.user, // generated ethereal user
              pass: account.pass, // generated ethereal password
            },
          });
        } else {
          log.warn("Failed to inizialize fake nodemailer account. Their service might be temporarily down.",
            err.message);
        }
      });
    }

  }

  /**
   * Sends an email
   * @param  {App} app
   * @param  {User} user mail recipient
   * @param  {string} subject mail subject
   * @param  {string} templateName mail template name
   * @param  {object} context data to be included while rendering the template (optional)
   * @return {void}
   */
  public async sendMail(
    app: Application,
    user: BookshelfModel,
    subject: string,
    templateName: string,
    context: Record<string, any> = {}): Promise<void> {
    const result = new Promise<void>((resolve, reject) => {
      if (this.mailTransport === null) {
        reject(new Error("Mail transporter is not correctly configured. "
          + "Please [contact](/article/docs) the administrators."));
      }

      const mergedContext = Object.assign({ rootUrl: config.ROOT_URL }, context);

      app.render("user/mail/" + templateName, mergedContext, (err, html) => {
        if (!err) {
          const textVersion = forms.htmlToText(html);

          const mailOptions = {
            from: "contact@alakajam.com",
            to: user.get("email"),
            subject: "[Alakajam!] " + subject,
            html,
            text: textVersion,
          };

          this.mailTransport.sendMail(mailOptions, (err2) => {
            if (!err2) {
              if (config.DEBUG_TEST_MAILER) {
                log.info("===============");
                log.info("mail sent");
                log.info("to: " + (user.get("title") || user.get("name")));
                log.info("subject: " + subject);
                log.info("body: \n" + textVersion);
                log.info("===============");
              }
              resolve();
            } else {
              reject(new Error("Failed to send mail: " + err2.message));
            }
          });
        } else {
          reject(new Error("Failed to render mail: " + err.message));
        }
      });
    });

    result.catch((err) => {
      log.warn(err.message);
    });

    return result;
  }

}

export default new Mailer();
