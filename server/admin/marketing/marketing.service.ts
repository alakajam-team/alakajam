import { User } from "server/entity/user.entity";
import userService from "server/user/user.service";

export class MarketingService {

  public static readonly SENDGRID_CONTACT_LIMIT = 100;

  public async findNotifiableUsers(): Promise<User[]> {
    return userService.findUsers({
      userMarketingEnabled: true,
      withMarketing: true
    });
  }

  public getSendgridCSVPageCount(notifiableUsers: number): number {
    return Math.ceil(notifiableUsers / MarketingService.SENDGRID_CONTACT_LIMIT);
  }

  public async generateSendgridCSV(page: number): Promise<string> {
    const users = await this.findNotifiableUsers();
    const usersPage = users.slice(page * MarketingService.SENDGRID_CONTACT_LIMIT, (page + 1) * MarketingService.SENDGRID_CONTACT_LIMIT);
    return [
      "email,first_name,last_name,address_line_1,address_line_2,city," +
      "state_province_region,postal_code,country,phone_number_id, external_id, anonymous_id",
      ...usersPage.map(user => [
        user.email,
        user.name,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        user.id
      ].join(","))
    ].join("\n");
  }
}

export default new MarketingService();
