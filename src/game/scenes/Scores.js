import Phaser from "phaser";

export default class Scores extends Phaser.Scene {
  constructor() {
    super("scores");
  }

  create() {
    // agregar los 10 mejores highscore
    this.firebase.getHighScores().then((scores) => {
      let scrollY = 200;
      scores.forEach((doc) => {
        this.add
          .text(400, scrollY, `${doc.name} - ${doc.score}`, {
            fontSize: 24,
          })
          .setOrigin(0.5);
        scrollY += 30;
      });
    });
  }
}