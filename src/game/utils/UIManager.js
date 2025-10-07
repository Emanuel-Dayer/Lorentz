import { Scene } from "phaser";
import { Pala } from "../../objects/Pala";

export class UIManager {
  /**
   * @param {Scene} scene La escena de Phaser.
   */
  constructor(scene) {
    this.scene = scene;
    const gameWidth = scene.sys.game.config.width;
    const gameHeight = scene.sys.game.config.height;

    // --- Textos de Puntuación ---
    this.scoreTextP1 = scene.add.text(gameWidth * 0.25, 50, 'P1: 0', { fontSize: '70px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
    this.scoreTextP2 = scene.add.text(gameWidth * 0.75, 50, 'P2: 0', { fontSize: '70px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5);

    // --- Texto de Tutorial ---
    this.tutorialText = scene.add.text(gameWidth / 2, gameHeight - 200, "P1: W/S (Mover), A/D (Rotar) | P2: Flechas (Mover/Rotar). ESPACIO para lanzar. P para Debug.",
      { fontSize: "30px", fill: "#fff", fontStyle: "bold", stroke: "#000", strokeThickness: 6 }
    ).setOrigin(0.5);

    // --- Textos de Debug ---
    const debugStyle = { fontSize: '24px', fill: '#910290', fontStyle: 'bold' };
    this.debugTextP1 = scene.add.text(0, 0, '', debugStyle).setOrigin(0.5, 1).setVisible(false);
    this.debugTextP2 = scene.add.text(0, 0, '', debugStyle).setOrigin(0.5, 1).setVisible(false);
    this.hitCountText = scene.add.text(gameWidth / 2, 100, 'Toques: 0', debugStyle).setOrigin(0.5).setVisible(false);
  }

  /**
   * Actualiza los marcadores de puntuación.
   * @param {number} score1 Puntuación del jugador 1.
   * @param {number} score2 Puntuación del jugador 2.
   */
  updateScores(score1, score2) {
    this.scoreTextP1.setText(`P1: ${score1}`);
    this.scoreTextP2.setText(`P2: ${score2}`);
  }

  /**
   * Muestra u oculta los textos de depuración.
   * @param {boolean} isVisible
   */
  setDebugVisibility(isVisible) {
    this.debugTextP1.setVisible(isVisible);
    this.debugTextP2.setVisible(isVisible);
    this.hitCountText.setVisible(isVisible);
  }

  /**
   * Actualiza el contenido y la posición de los textos de depuración.
   * @param {Pala} pala1
   * @param {Pala} pala2
   */
  updateDebugTexts(pala1, pala2) {
    if (!this.debugTextP1.visible) return;

    const palaVisual1 = pala1.getVisualObject();
    this.debugTextP1.setText(`Angulo: ${pala1.getLogicalRotation().toFixed(1)}°`);
    this.debugTextP1.setPosition(palaVisual1.x, palaVisual1.y - (palaVisual1.height / 2) - 20);

    const palaVisual2 = pala2.getVisualObject();
    this.debugTextP2.setText(`Angulo: ${pala2.getLogicalRotation().toFixed(1)}°`);
    this.debugTextP2.setPosition(palaVisual2.x, palaVisual2.y - (palaVisual2.height / 2) - 20);
  }

  /**
   * Actualiza el texto de conteo de toques.
   * @param {number} count
   */
  updateHitCount(count) {
    this.hitCountText.setText('Toques: ' + count);
  }
}