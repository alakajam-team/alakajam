import {
  EntryBookshelfModel
} from "bookshelf";
import constants from "server/core/constants";
import fileStorage, { FileUploadResult } from "server/core/file-storage";
import { createLuxonDate } from "server/core/formats";

export class EntryPicturesService {

  /**
   * Sets the entry picture and generates its thumbnails
   * @param {Entry} entry
   * @param {object|string} file The form upload
   */
  public async setEntryPicture(entry: EntryBookshelfModel, file: Express.Multer.File | string): Promise<FileUploadResult> {
    const picturePath = "/entry/" + entry.get("id");
    const result = await fileStorage.savePictureUpload(file, picturePath, constants.PICTURE_OPTIONS_DEFAULT);
    if (!("error" in result)) {
      entry.set("updated_at", createLuxonDate().toJSDate());
      // Thumbnails creation
      let resultThumbnail: FileUploadResult;
      if (result && result.width >= result.height * 1.1) {
        resultThumbnail = await fileStorage.savePictureUpload(file, picturePath, constants.PICTURE_OPTIONS_THUMB);
      } else {
        resultThumbnail = await fileStorage.savePictureUpload(file, picturePath,
          constants.PICTURE_OPTIONS_THUMB_PORTRAIT);
      }
      const resultIcon = await fileStorage.savePictureUpload(file, picturePath, constants.PICTURE_OPTIONS_ICON);

      if ("error" in resultThumbnail) {
        return resultThumbnail;
      }
      if ("error" in resultIcon) {
        return resultIcon;
      }

      // Delete previous pictures (in case of a different extension)
      if (entry.picturePreviews().length > 0 && result.finalPath !== entry.picturePreviews()[0]) {
        await fileStorage.remove(entry.picturePreviews()[0]);
      }
      if (entry.pictureThumbnail() && resultThumbnail.finalPath !== entry.pictureThumbnail()) {
        await fileStorage.remove(entry.pictureThumbnail());
      }
      if (entry.pictureIcon() && resultIcon.finalPath !== entry.pictureIcon()) {
        await fileStorage.remove(entry.pictureIcon());
      }

      entry.set("pictures", {
        previews: [result.finalPath],
        thumbnail: resultThumbnail.finalPath,
        icon: resultIcon.finalPath
      });
    }
    return result;
  }

}

export default new EntryPicturesService();
