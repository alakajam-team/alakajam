import { invert } from "lodash";
import { ValueTransformer } from "typeorm";

export type UserMarketingSetting = "off" | "on";

export const OFF_VALUE = 0;
export const ON_VALUE = 1;


const VALUE_TO_SETTING: Record<number, UserMarketingSetting> = {
  [OFF_VALUE]: "off",
  [ON_VALUE]: "on"
};
const SETTING_TO_VALUE = invert(VALUE_TO_SETTING) as unknown as Record<UserMarketingSetting, number>;

export const USER_MARKETING_SETTINGS = Object.keys(SETTING_TO_VALUE) as UserMarketingSetting[];

const UserMarketingSettingTransformer: ValueTransformer = {

  to(state: UserMarketingSetting): number {
    return SETTING_TO_VALUE[state] || OFF_VALUE;
  },

  from(value: number): UserMarketingSetting {
    return VALUE_TO_SETTING[value] || "off";
  }

};

export default UserMarketingSettingTransformer;
