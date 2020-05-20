import { getManager, ObjectType, getRepository, getConnection } from "typeorm";
import { BookshelfModel } from "bookshelf";

export interface DependentEntity {
  entity: ObjectType<any>;
  foreignKey: string;
}

export abstract class BookshelfCompatibleEntity {

  public get(key: string): any {
    return this[key];
  }

  public set(keyOrObject: string | { [key: string]: any }, value?: any): void {
    if (typeof keyOrObject === "object") {
      for (const key of Object.keys(keyOrObject)) {
        this.set(key, keyOrObject[key]);
      }
    } else {
      this[keyOrObject] = value;
    }
  }

  public related<T extends BookshelfModel>(relation: string): T {
    return this[relation];
  }

  protected async loadOneToOne<T extends Function, U extends Function>(currentType: T, fieldName: string, fieldType: U) {
    if (!getRepository(fieldType).hasId(this[fieldName])) {
      this[fieldName] = await getConnection()
        .createQueryBuilder()
        .relation(currentType, fieldName)
        .of(this)
        .loadOne();
    }
  }

  public async destroy(): Promise<any> {
    const entityManager = getManager();
    for (const dependent of this.dependents()) {
      if (this[dependent]) {
        await entityManager.remove(this[dependent]);
      }
    }
    return entityManager.remove(this);
  }

  /**
   * Specifies which other entities depend on this one.
   * This adds support for manual cascade deletion like the bookshelf-cascade-delete plugin does.
   * NB. Be careful of destroy failures due to unsatisfied table constraints if this list is incomplete.
   */
  public abstract dependents(): Array<keyof this>;

}
