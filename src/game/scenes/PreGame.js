import { Scene } from "phaser";
import { Pala } from "../../objects/Pala";
import { Particula } from "../../objects/Particula";
import { UIManager } from "../utils/UIManager";
import InputSystem, { INPUT_ACTIONS } from "../utils/InputSystem";
import { ControlsStatusUI } from "../utils/ControlsStatusUI";

export class PreGame extends Scene {
  constructor() {
    super("PreGame");

    this.PULL_TARGET = 20;
    this.PULL_STEP = 1;
    this.pullProgress = 0;

    // --- Constantes para la clase Pala ---
    // Aunque no se usen para movimiento, son necesarias para la construcción del objeto.
    this.MAX_ROTATION_DEG = 55;
    this.DEAD_ZONE_DEG = 5;
    this.ROTATION_SPEED = 1.5;
    this.RETURN_SPEED = 0.8;
    this.CIRCLES_DENSITY = 15;
    this.VelocidadPala = 0; // No se mueven en esta escena

    // Mapeos de teclado (necesarios para el InputSystem)
    this.keyMap1 = {
      [INPUT_ACTIONS.SOUTH]: 'SHIFT',
    };
    this.keyMap2 = {
      [INPUT_ACTIONS.SOUTH]: 'NUMPAD_ONE',
    };
  }

  init() {
    this.pullProgress = 0;
    this.keyP = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
  }

  create() {
    const gameWidth = this.sys.game.config.width;
    const gameHeight = this.sys.game.config.height;

    this.inputSystem = new InputSystem(this, this.keyMap1, this.keyMap2);
    this.uiManager = new UIManager(this);
    
    // Ocultar UI no necesaria en esta escena
    this.uiManager.scoreTextP1.setVisible(false);
    this.uiManager.scoreTextP2.setVisible(false);
    this.uiManager.tutorialText.setVisible(false);

    this.controlsUI = new ControlsStatusUI(this, this.inputSystem);
    this.controlsUI.setVisible(false);

    // Crear palas y partícula (visuales/estáticas)
    this.pala1 = new Pala(this, 100, gameHeight / 2, 'player1');
    this.pala2 = new Pala(this, gameWidth - 100, gameHeight / 2, 'player2');
    this.particula = new Particula(this, gameWidth / 2, gameHeight / 2, 35, {});
    this.particula.body.setImmovable(true).setVelocity(0, 0);

    // Textos de la UI para esta fase
    this.add.text(gameWidth / 2, 120, '¡LUCHA POR LA PARTÍCULA!', {
      fontSize: '48px', fill: '#fff', fontStyle: 'bold', stroke: '#000', strokeThickness: 6
    }).setOrigin(0.5);

    this.add.text(gameWidth / 2, 180, `Pulsa repetidamente SHIFT/△ (J1) o NUM1/△ (J2)`, {
      fontSize: '32px', fill: '#ffff00'
    }).setOrigin(0.5);
  }

  update(time, delta) {
    this.inputSystem.update();

    // Lógica de debug y swap
    if (this.inputSystem.isSwapButtonPressed()) this.inputSystem.swapPlayers();
    if (Phaser.Input.Keyboard.JustDown(this.keyR)) this.scene.restart();
    if (Phaser.Input.Keyboard.JustDown(this.keyP)) this.toggleDebug();

    this.pala1.update(delta);
    this.pala2.update(delta);
    this.uiManager.updateDebugTexts(this.pala1, this.pala2);
    if (this.controlsUI && this.controlsUI.allUIElements[0]?.visible) {
        this.controlsUI.update();
    }

    // Lógica del "Tira y Afloje"
    if (this.inputSystem.isJustPressed(INPUT_ACTIONS.SOUTH, 'player1')) {
      this.pullProgress -= this.PULL_STEP;
    }
    if (this.inputSystem.isJustPressed(INPUT_ACTIONS.SOUTH, 'player2')) {
      this.pullProgress += this.PULL_STEP;
    }
    
    this.pullProgress = Phaser.Math.Clamp(this.pullProgress, -this.PULL_TARGET, this.PULL_TARGET);

    const progressRatio = this.pullProgress / this.PULL_TARGET;
    const newX = this.sys.game.config.width / 2 + (progressRatio * (this.sys.game.config.width / 3));
    this.particula.setPosition(newX, this.sys.game.config.height / 2);

    // Comprobar ganador y pasar a la siguiente escena
    if (Math.abs(this.pullProgress) >= this.PULL_TARGET) {
      const winner = this.pullProgress < 0 ? 1 : 2;
      this.scene.start("Game", { jugadorParaServir: winner });
    }

    this.inputSystem.lateUpdate();
  }

  toggleDebug() {
    this.physics.world.drawDebug = !this.physics.world.drawDebug;
    if (this.physics.world.drawDebug && !this.physics.world.debugGraphic) {
      this.physics.world.createDebugGraphic();
    }
    if (this.physics.world.debugGraphic) {
      this.physics.world.debugGraphic.clear();
    }
    this.uiManager.setDebugVisibility(this.physics.world.drawDebug);
    this.controlsUI.setVisible(this.physics.world.drawDebug);
  }
}