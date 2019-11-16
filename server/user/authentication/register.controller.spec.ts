// tslint:disable: no-unused-expression

import { expect } from "chai";
import "module-alias/register";
import { isAlertPresent } from "server/testing/assertions";
import { mockRequest, mockResponse } from "server/testing/mocks";
import { UserService } from "server/user/user.service";
import { createStubInstance } from "sinon";
import { UserTimeZoneService } from "../user-timezone.service";
import { RegisterController, TEMPLATE_REGISTER } from "./register.controller";

describe("Register controller", () => {

  const TIMEZONES = [];

  const userServiceStub = createStubInstance(UserService);
  const userTimeZoneServiceStub = createStubInstance(UserTimeZoneService);
  const registerController = new RegisterController(
    userServiceStub as any,
    userTimeZoneServiceStub as any);

  before(() => {
    userTimeZoneServiceStub.getAllTimeZones.returns(Promise.resolve(TIMEZONES));
  });

  it("should reject the form if the email is not filled", async () => {
    const req = mockRequest({ body: { email: undefined } });
    const res = mockResponse();

    await registerController.register(req, res);

    expect(isAlertPresent(res, { message: "Email is not set" })).to.be.true;
    expect(res.renderSpy.calledWith(TEMPLATE_REGISTER)).to.be.true;
  });

});
