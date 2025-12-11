import { Scene } from "phaser";
import { Pala } from "../../objects/Pala";

import keys from "../../enums/keys";
import { getTranslations, getPhrase } from "../../services/translations";

export class UIManager {
  /**
   * @param {Scene} scene La escena de Phaser.
   */
  constructor(scene) {

    const {COOPTextoParticulas, COOPTextoPuntos} = keys.Cooperativo; // lo que esta en llavas son las frases, y despues poner key. y la key
    this.COOPTextoParticulas = COOPTextoParticulas; // agragar referencia para los textos
    this.COOPTextoPuntos = COOPTextoPuntos;

    this.scene = scene;
    const gameWidth = scene.sys.game.config.width;
    const gameHeight = scene.sys.game.config.height;

    // Determinar el modo de juego basado en la key de la escena
    this.isCoopMode = scene.scene.key === 'CoopGame';

    if (this.isCoopMode) {
      // --- Textos de Puntuación para modo cooperativo ---
      this.scoreText = scene.add.text(gameWidth * 0.25, 50, `${getPhrase(this.COOPTextoPuntos)}: 0`, { fontSize: '70px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
      this.particlesRemainingText = scene.add.text(gameWidth * 0.75, 50, `${getPhrase(this.COOPTextoParticulas)}: 0`, { fontSize: '70px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
    } else {
      // --- Textos de Puntuación para modo versus ---
      this.scoreTextP1 = scene.add.text(gameWidth * 0.25, 50, 'P1: 0', { fontSize: '70px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
      this.scoreTextP2 = scene.add.text(gameWidth * 0.75, 50, 'P2: 0', { fontSize: '70px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
    }

    /*
    // --- Texto de Tutorial ---
    const tutorialBase = "P1: W/S (Mover), A/D (Rotar) | P2: Flechas (Mover/Rotar)";
    const tutorialModeText = this.isCoopMode ? 
      "¡Cooperen para mantener las partículas en juego!" :
      "¡Compitan por los puntos!";
    const controls = "ESPACIO para lanzar. P para Debug.";

    
    this.tutorialText = scene.add.text(gameWidth / 2, gameHeight - 200, 
      `${tutorialBase}\n${tutorialModeText}\n${controls}`,
      { fontSize: "30px", fill: "#fff", fontStyle: "bold", stroke: "#000", strokeThickness: 6 }
    ).setOrigin(0.5);
    */

    // --- Textos de Debug ---
    const debugStyle = { fontSize: '24px', fill: '#910290', fontStyle: 'bold' };
    this.debugTextP1 = scene.add.text(0, 0, '', debugStyle).setOrigin(0.5, 1).setVisible(false);
    this.debugTextP2 = scene.add.text(0, 0, '', debugStyle).setOrigin(0.5, 1).setVisible(false);
    this.particleCountText = scene.add.text(gameWidth / 2, 20, 'Partículas: 0', debugStyle).setOrigin(0.5).setVisible(false);
  }

  /**
   * Actualiza los marcadores de puntuación.
   * @param {number} score1 Puntuación del jugador 1.
   * @param {number} score2 Puntuación del jugador 2.
   */
  updateScores(score1, score2) {
    if (this.isCoopMode) {
      // Modo cooperativo: un solo contador de puntos y contador de partículas
      this.scoreText.setText(`${getPhrase(this.COOPTextoPuntos)}: ${score1}`);
      // Actualizar el contador de partículas con las partículas activas
      const particlesCount = this.scene.particulas ? this.scene.particulas.countActive(true) : 0;
      this.particlesRemainingText.setText(`${getPhrase(this.COOPTextoParticulas)}: ${particlesCount}`);
    } else {
      // Modo versus: dos contadores de puntos
      this.scoreTextP1.setText(`P1: ${score1}`);
      this.scoreTextP2.setText(`P2: ${score2}`);
    }
  }

  /**
   * Muestra u oculta los textos de depuración.
   * @param {boolean} isVisible
   */
  setDebugVisibility(isVisible) {
    this.debugTextP1.setVisible(isVisible);
    this.debugTextP2.setVisible(isVisible);
    this.particleCountText.setVisible(isVisible);
  }

  /**
   * Actualiza el contenido y la posición de los textos de depuración.
   * @param {Pala} pala1
   * @param {Pala} pala2
   * @param {number} particleCount
   */
  updateDebugTexts(pala1, pala2, particleCount) {
    if (!this.debugTextP1.visible) return;

    const palaVisual1 = pala1.getVisualObject();
    this.debugTextP1.setText(`Angulo: ${pala1.getLogicalRotation().toFixed(1)}°`);
    this.debugTextP1.setPosition(palaVisual1.x, palaVisual1.y - (palaVisual1.height / 2) - 20);

    const palaVisual2 = pala2.getVisualObject();
    this.debugTextP2.setText(`Angulo: ${pala2.getLogicalRotation().toFixed(1)}°`);
    this.debugTextP2.setPosition(palaVisual2.x, palaVisual2.y - (palaVisual2.height / 2) - 20);

    this.particleCountText.setText(`Partículas: ${particleCount}`);
  }

  /**
   * Actualiza el texto de conteo de toques.
   * @param {number} count
   */
  updateHitCount(count) {
    // Este método ya no es necesario, el conteo es individual por partícula.
    // Se mantiene por si se reutiliza en el futuro.
  }
}