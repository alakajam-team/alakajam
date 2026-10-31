import { Request } from "express";
import * as fs from "fs";
import multer from "multer";
import * as path from "path";
import * as randomKey from "random-key";
import * as configUtils from "./config";
import constants from "./constants";

export function initUploadMiddleware() {
  // Multipart form parser
  const uploadStorage = multer.diskStorage({
    destination(req, file, cb) {
      cb(null, configUtils.tmpPathAbsolute());
    },
    filename(req, file, cb) {
      file.filename = randomKey.generate() + "-" + file.originalname;
      // Uploads are only needed during the request: always remove the temp file once the response
      // is done, whether it succeeded, failed or was aborted (see issue #602)
      const tempFilePath = path.join(configUtils.tmpPathAbsolute(), file.filename);
      (req as Request).res?.once("close", () => {
        fs.unlink(tempFilePath, () => { /* already removed or never written */ });
      });
      cb(null, file.filename);
    },
  });
  return multer({
    storage: uploadStorage,
    limits: {
      fields: 1000,
      fileSize: constants.MAX_UPLOAD_SIZE,
      files: 20,
      parts: 2000,
    },
  });
}
