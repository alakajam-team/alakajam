export abstract class BookshelfCompatible {

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

  public related(relation: string): any {
    return this[relation];
  }

}
