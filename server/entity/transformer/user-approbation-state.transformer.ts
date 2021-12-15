import { invert } from "lodash";
import { ValueTransformer } from "typeorm";

export type UserApprobationState = "pending" | "approved";

export const USER_PENDING_VALUE = 0;
export const USER_APPROVED_VALUE = 1;


const VALUE_TO_STATE: Record<number, UserApprobationState> = {
  [USER_PENDING_VALUE]: "pending",
  [USER_APPROVED_VALUE]: "approved"
};
const STATE_TO_VALUE = invert(VALUE_TO_STATE) as unknown as Record<UserApprobationState, number>;

export const USER_APPROVATION_STATES = Object.keys(STATE_TO_VALUE) as UserApprobationState[];

const UserApprobationStateTransformer: ValueTransformer = {

  to(state: UserApprobationState): number {
    return STATE_TO_VALUE[state] || USER_PENDING_VALUE;
  },

  from(value: number): UserApprobationState {
    return VALUE_TO_STATE[value] || "pending";
  }

};

export default UserApprobationStateTransformer;
