import { CommonLocals } from "server/common.middleware";
import { CustomRequest, CustomResponse } from "server/types";
import { spy } from "sinon";

export function mockRequest(partialReq: Partial<CustomRequest> = {}): CustomRequest {
  return {
    ...partialReq
  } as CustomRequest;
}

export function mockResponse<T extends CommonLocals>(partialRes: Partial<CustomResponse<T>> = {})
    : CustomResponse<T> & { renderSpy: sinon.SinonSpy } {
  const renderSpy = spy();
  return {
    locals: {
      alerts: []
    },
    render: renderSpy,
    renderSpy,
    ...partialRes
  } as any;
}
