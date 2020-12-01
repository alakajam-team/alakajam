import cache from "server/core/cache";
import { Platform } from "server/entity/platform.entity";
import platformRepositoryBookshelf from "./platform.repository";

/**
 * Service for manipulating game platforms
 */
export class PlatformService {

  /** Fetch all platform instances. */
  public async findAll(): Promise<Platform[]> {
    if (!cache.general.get("platforms")) {
      cache.general.set("platforms",
        await platformRepositoryBookshelf.findAll());
    }
    return cache.general.get<Platform[]>("platforms");
  }

  public async save(platform: Platform): Promise<Platform> {
    const savedPlatform = await platformRepositoryBookshelf.save(platform);
    cache.general.del("platforms");
    return savedPlatform;
  }

  public async delete(platformId: number): Promise<void> {
    await platformRepositoryBookshelf.delete(platformId);
    cache.general.del("platforms");
  }

}

export default new PlatformService();
