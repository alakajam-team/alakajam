// tslint:disable: no-unused-expression

import { expect } from "chai";
import { isAlertPresent } from "server/testing/testing-assertions";
import { mockRequest, mockResponse } from "server/testing/testing-mocks";
import { UserService } from "server/user/user.service";
import { createStubInstance } from "sinon";
import { RegisterController, TEMPLATE_REGISTER } from "./register.controller";

describe("Register controller", () => {

  const userServiceStub = createStubInstance(UserService);
  const registerController = new RegisterController(userServiceStub as any);

  it("should reject the form if the email is not filled", async () => {
    const req = mockRequest({ body: { email: undefined } });
    const res = mockResponse();

    await registerController.register(req, res);

    expect(isAlertPresent(res, { message: "Email is not set" })).to.be.true;
    expect(res.renderSpy.calledWith(TEMPLATE_REGISTER, req.body)).to.be.true;
  });

});
