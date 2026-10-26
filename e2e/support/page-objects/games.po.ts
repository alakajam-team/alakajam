import GameSearchBlockPO from "./games-search-block.po";

export default class GamesPO extends GameSearchBlockPO {

  public async visit() {
    await this.page.goto("/explore/games");
  }

}
