// tslint:disable: no-unused-expression

import { expect } from "chai";
import { CommonLocals } from "server/common.middleware";
import { CustomRequest, CustomResponse } from "server/types";
import { UserService } from "server/user/user.service";
import * as sinon from "sinon";
import { RegisterController } from "./register.controller";

describe("Register Controller", () => {

  const userServiceStub = sinon.createStubInstance(UserService);
  const registerController = new RegisterController(userServiceStub as any);

  it("should reject the form if the email is not filled", async () => {
    const req = mockReq({ body: { email: undefined } });
    const res = mockRes();

    await registerController.register(req, res);

    expect(res.locals.alerts.some((alert) => alert.message === "Email is not set")).to.be.true;
    expect((res.render as sinon.SinonSpy).calledWith("user/authentication/register", req.body)).to.be.true;
  });

});

function mockReq(partialReq: Partial<CustomRequest>): CustomRequest {
  return {
    ...partialReq
  } as CustomRequest;
}

function mockRes<T extends CommonLocals>(partialRes: Partial<CustomResponse<T>> = {}): CustomResponse<T> {
  return {
    locals: {
      alerts: []
    },
    render: sinon.spy(),
    ...partialRes
  } as CustomResponse<T>;
}
