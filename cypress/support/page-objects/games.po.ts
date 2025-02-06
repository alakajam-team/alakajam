import { GameSearchBlockPO } from "./games-search-block.po";

class GamesPO extends GameSearchBlockPO {

  public visit() {
    cy.visit("/explore/games");
  }

}

export default new GamesPO();
