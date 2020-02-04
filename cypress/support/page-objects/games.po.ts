import { GameSearchBlockPO } from "./games-search-block.po";

class GamesPO extends GameSearchBlockPO {

  public visit() {
    cy.visit("/games");
  }

}

export default new GamesPO();
