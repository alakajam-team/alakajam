import { User } from "server/entity/user.entity";
import userService from "server/user/user.service";

export class MarketingService {

  public async findNotifiableUsers(): Promise<User[]> {
    return userService.findUsers({
      userMarketingEnabled: true,
      withMarketing: true
    });
  }

  public async generateSendgridCSV(): Promise<string> {
    const users = await this.findNotifiableUsers();
    return [
      "email,first_name,last_name,address_line_1,address_line_2,city," +
      "state_province_region,postal_code,country,phone_number_id, external_id, anonymous_id",
      ...users.map(user => [
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
