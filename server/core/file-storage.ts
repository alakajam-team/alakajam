
/**
 * File & folder manipulation, mostly for picture storage.
 */

import { BookshelfModel } from "bookshelf";
import * as fs from "fs-extra";
import * as mime from "mime-types";
import mkdirp from "mkdirp";
import * as path from "path";
import { User } from "server/entity/user.entity";
import * as url from "url";
import * as configUtils from "./config";
import constants from "./constants";
import { createLuxonDate } from "./formats";
import log from "./log";

let sharp = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  sharp = require("sharp");
} catch (e) {
  log.warn("Sharp dependency missing. Picture resizing disabled...");
}

// Leading bytes for common image formats.
// See https://stackoverflow.com/a/8475542/1213677 and https://github.com/sindresorhus/file-type/blob/master/index.js
const IMAGE_HEADER_MAGIC_TO_TYPE = {
  "ffd8ff": "jpg",
  "89504e470d0a1a0a": "png",
  "474946": "gif",
};

export type FileUploadResult =
  { deleted: true } |
  { error: string } |
  { uploaded: true; finalPath: string; width: number; height: number };

export interface ResizeOptions {
  format?: string;
  maxWidth?: number;
  maxHeight?: number;
  fit?: string;
  maxDiagonal?: number;
}

export class FileStorage {

  /**
   * Get the type of an image file.
   *
   * @param {string} filepath the absolute path to a file.
   * @returns {string} one of 'jpg', 'png' or 'gif' if valid; undefined if not.
   */
  private async getImageType(filepath: string): Promise<string> {
    // Read the first four bytes of the file to ensure it's an image. See
    // IMAGE_HEADER_MAGIC_TO_TYPE and the stackoverflow link there.
    const fileHandle = await fs.open(filepath, "r");
    const buf = Buffer.alloc(8);
    await fs.read(fileHandle, buf, 0, 8, 0);
    await fs.close(fileHandle);
    const leadingBytes = buf.toString("hex", 0, 8);

    for (const header in IMAGE_HEADER_MAGIC_TO_TYPE) {
      if (leadingBytes.startsWith(header)) {
        return IMAGE_HEADER_MAGIC_TO_TYPE[header];
      }
    }
  }

  /**
   * @param {string} path
   * @returns {bool} whather the specified path is a valid picture
   */
  public async isValidPicture(picturePath: string): Promise<boolean> {
    if (await this.exists(picturePath)) {
      return (await this.getImageType(picturePath)) !== undefined;
    } else {
      return false;
    }
  }

  /**
   * Saves a file upload on a model. The picture will be resized (if needed) & moved, but model.save() won't be called.
   * The file extension will be grabbed from the source path. If folders don't exist, they will be created.
   * If there was a pre-exiting picture, it will be deleted.
   * @param model
   * @param attribute
   * @param fileUpload The form field to save
   * @param deleteFile Whether to delete the picture
   * @param targetPathWithoutExtension The path to the destination, **relative to the uploads folder**
   * @param options (Optional) allowed: maxDiagonal
   * @returns result, with either "error" or "finalPath" set, or nothing if the picture was deleted
   */
  public async savePictureToModel(model: BookshelfModel | User, attribute: string, fileUpload: string | Express.Multer.File,
                                  deleteFile: boolean, targetPathWithoutExtension: string,
                                  options: ResizeOptions = {}): Promise<FileUploadResult> {
    if (deleteFile) {
      // Delete picture
      if (model.get(attribute)) {
        await this.remove(model.get(attribute));
      }
      model.set(attribute, null);
      return { deleted: true };
    } else if (fileUpload) {
      // Upload or replace picture
      const result = await this.savePictureUpload(fileUpload, targetPathWithoutExtension, options);
      if ("uploaded" in result) {
        const previousPath = model.get(attribute);
        if (previousPath && previousPath !== result.finalPath) {
          await this.remove(previousPath);
        }
        if (result.finalPath === previousPath) {
          // Make sure to change the last_updated date, because it is used
          // on picture URLs as a query string to clear the client cache
          model.set("updated_at", createLuxonDate().toJSDate());
        } else {
          model.set(attribute, result.finalPath);
        }
      }
      return result;
    } else {
      return { error: "Invalid upload" };
    }
  }

  /**
   * Saves an upload to the specified path, resizing it if needed in the process.
   * The file extension will be grabbed from the source path. If folders don't exist, they will be created.
   * @param {string} fileUploadOrPath The form field to save, or the file path if this is not a form upload
   * @param {object|string} targetPathWithoutExtension The path to the destination, **relative to the uploads folder**
   * @param {object} options (Optional) allowed: maxDiagonal / maxWidth / maxHeight / fit / suffix / format).
   *                         See presets: constants.PICTURE_OPTIONS_*
   * @throws if the source path is not a valid picture
   * @returns {string} the URL to that path
   */
  public async savePictureUpload(
    fileUploadOrPath: string | Express.Multer.File,
    targetPathWithoutExtension: string,
    options: { suffix?: string } & ResizeOptions = { maxDiagonal: 2000 }): Promise<FileUploadResult> {
    const filePath = (typeof fileUploadOrPath === "string") ? fileUploadOrPath : fileUploadOrPath.path;
    const mimetype = (typeof fileUploadOrPath === "string") ? mime.lookup(fileUploadOrPath) : fileUploadOrPath.mimetype;
    const fileExtension = mime.extension(mimetype);

    if (!(await this.isValidPicture(filePath))) {
      return { error: "Invalid picture type (allowed: PNG GIF JPG)" };
    }
    let actualTargetPath = path.join(configUtils.uploadsPathAbsolute(),
      targetPathWithoutExtension.replace(/^[\\/]/, "")); // remove leading slash
    actualTargetPath += (options.suffix || "");
    const absoluteTargetPath = this.toAbsolutePath(actualTargetPath);

    await this.createFolderIfMissing(path.dirname(absoluteTargetPath));

    let res;
    try {
      res = await this.resize(filePath, absoluteTargetPath, fileExtension, options);
    } catch (e) {
      if (e.message?.includes("Input image exceeds pixel limit")) {
        return { error: e.message };
      } else {
        throw e;
      }
    }

    const finalPath = url.resolve(constants.UPLOADS_WEB_PATH,
      path.relative(configUtils.uploadsPathAbsolute(), absoluteTargetPath + "." + res.format));

    return {
      ...res,
      finalPath
    };
  }


  private async resize(sourcePath: string, targetPathWithoutExtension: string, fileExtension: string,
                       options: ResizeOptions = {}) {
    let res = { format: fileExtension };
    // Sharp is an optional dependency
    if (sharp) {
      // Disable thumbnail resizing for gifs (unsupported by sharp for now)
      // https://github.com/lovell/sharp/issues/1372
      if ((await this.getImageType(sourcePath) === "gif")) {
        options.format = "png";
        if (options.maxWidth >= constants.PICTURE_OPTIONS_THUMB.maxWidth) {
          delete options.maxWidth;
          delete options.maxHeight;
        }
      }

      // Prevent file from staying open after resize
      sharp.cache(false);

      // Check whether image is too big
      const source = sharp(sourcePath, { limitInputPixels: constants.MAX_UPLOAD_PIXELS });
      const meta = await source.metadata();
      let resizeOptions;
      if (options.maxWidth || options.maxHeight) {
        if ((options.maxWidth && meta.width > options.maxWidth)
          || (options.maxHeight && meta.height > options.maxHeight)) {
          resizeOptions = {
            width: options.maxWidth,
            height: options.maxHeight,
            fit: options.fit || "inside",
            withoutEnlargement: false,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          };
        }
      } else {
        const maxDiagonal = options.maxDiagonal || 2000;
        const diagonalSq = meta.width * meta.width + meta.height * meta.height;
        if (diagonalSq > maxDiagonal * maxDiagonal) {
          const diagonal = Math.max(Math.sqrt(diagonalSq));
          resizeOptions = {
            width: Math.ceil(meta.width * maxDiagonal / diagonal),
            height: Math.ceil(meta.height * maxDiagonal / diagonal),
          };
        }
      }
      if (resizeOptions) {
        let resized = source.resize(resizeOptions);
        if (options.format) {
          fileExtension = options.format;
          resized = resized.toFormat(options.format);
        }
        return resized.toFile(targetPathWithoutExtension + "." + fileExtension);
      } else {
        res = meta;
      }
    }

    // Copy the image if small enough (or sharp is missing)
    await fs.copyFile(sourcePath, targetPathWithoutExtension + "." + fileExtension);
    return res;
  }

  public async exists(documentPath: string): Promise<boolean> {
    const absolutePath = this.toAbsolutePath(documentPath);
    try {
      await fs.access(absolutePath, fs.constants.R_OK);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * [read description]
   * @param  {string}  documentPath
   * @return {string} the file contents as a string. Caller must parse JSON himself if needed.
   */
  public async read(documentPath: string): Promise<string> {
    const absolutePath = this.toAbsolutePath(documentPath);
    const fileBuffer = await fs.readFile(absolutePath);
    return fileBuffer.toString();
  }

  /**
   * Writes data to a file
   * @param  {string} documentPath Destination file
   * @param  {string} data Contents to write. If a function, will be evaluated. If an object/array, will be stringified.
   */
  public async write(documentPath: string, data: string | (() => string) | unknown): Promise<void> {
    if (typeof data === "function") {
      data = data();
    }
    if (typeof data === "object") {
      data = JSON.stringify(data);
    }

    const absolutePath = this.toAbsolutePath(documentPath);
    await this.createFolderIfMissing(path.dirname(documentPath));
    await fs.writeFile(absolutePath, data);
  }

  public async remove(documentPath: string): Promise<void> {
    const absolutePath = this.toAbsolutePath(documentPath);
    if (await this.exists(documentPath)) {
      await fs.unlink(absolutePath);
    }
  }

  private toAbsolutePath(anyPath: string): string {
    if (anyPath.startsWith(constants.UPLOADS_WEB_PATH)) {
      return path.join(configUtils.uploadsPathAbsolute(), path.relative(constants.UPLOADS_WEB_PATH, anyPath));
    } else {
      return path.resolve(constants.ROOT_PATH, anyPath);
    }
  }

  /**
   * Creates a folder. No-op if the folder exists.
   * Does *not* make the folder relative to the file storage root.
   */
  public async createFolderIfMissing(folderPath: string): Promise<void> {
    if (!await this.exists(folderPath)) {
      await mkdirp(folderPath);
    }
  }

}

export default new FileStorage();
