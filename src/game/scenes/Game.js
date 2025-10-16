import { Scene } from "phaser";

// Importar las clases de los objetos del juego
import { Pala } from "../../objects/Pala";
import { Particula } from "../../objects/Particula";
import { BloqueGroup } from "../../objects/BloqueGroup";
import CampoEstabilizador from '../../objects/CampoEstabilizador.js';

// Utilidades para la UI y el sistema de entrada
import { UIManager } from "../utils/UIManager";
import InputSystem, { INPUT_ACTIONS } from "../utils/InputSystem";
import { ControlsStatusUI } from "../utils/ControlsStatusUI";


// La clase Game contiene toda la lógica de la escena principal
export class Game extends Scene {
  constructor() {
    super("Game");

    // Constantes de rotación (se pasarán a las instancias de las Palas)
    this.MAX_ROTATION_DEG = 55;
    this.DEAD_ZONE_DEG = 5;
    this.ROTATION_SPEED = 1.5;
    this.RETURN_SPEED = 0.8;
    this.CIRCLES_DENSITY = 15;

    // --- Mapeos de teclado para ambos jugadores ---
    this.keyMap1 = {
      [INPUT_ACTIONS.UP]: 'W',
      [INPUT_ACTIONS.DOWN]: 'S',
      [INPUT_ACTIONS.LEFT]: 'A',
      [INPUT_ACTIONS.RIGHT]: 'D',
      [INPUT_ACTIONS.NORTH]: 'SPACE', // △: Lanza la particula
      [INPUT_ACTIONS.SOUTH]: 'SHIFT', // ◯:
      [INPUT_ACTIONS.EAST]: 'E',      // ✕:
      [INPUT_ACTIONS.WEST]: 'Q',      // ▢:
    };

    this.keyMap2 = {
      [INPUT_ACTIONS.UP]: 'UP',
      [INPUT_ACTIONS.DOWN]: 'DOWN',
      [INPUT_ACTIONS.LEFT]: 'LEFT',
      [INPUT_ACTIONS.RIGHT]: 'RIGHT',
      [INPUT_ACTIONS.NORTH]: 'NUMPAD_ZERO', // △: Lanza la particula
      [INPUT_ACTIONS.SOUTH]: 'NUMPAD_ONE',  // ◯:
      [INPUT_ACTIONS.EAST]: 'NUMPAD_THREE', // ✕:
      [INPUT_ACTIONS.WEST]: 'NUMPAD_TWO',   // ▢:
    };
  }

  init({ jugadorParaServir }) {
    // --- Controles de teclado (MANEJADOS POR InputSystem) ---
    this.keyP = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    // --- Variables de Juego ---
    this.VelocidadPala = 900;
    this.VelocidadParticula = 900;
    this.jugadorParaServir = jugadorParaServir || 1; // Recibe al ganador o usa 1 por defecto
    this.puntuacionP1 = 0;
    this.puntuacionP2 = 0;

    this.sounds = {};

    // --- Estados del juego ---
    this.gameState = 'PLAYING'; // 'PLAYING', 'TUG_OF_WAR', 'PAUSED'
    this.contestedParticula = null;
    this.tugOfWarText = null;
  }

  create() {
    this.sounds.ParticulaRebota = this.sound.add("ParticulaRebota");
    this.sounds.ColisionObstaculo = this.sound.add("ColisionObstaculo");

    const gameWidth = this.sys.game.config.width;
    const gameHeight = this.sys.game.config.height;

    this.inputSystem = new InputSystem(this, this.keyMap1, this.keyMap2);
    this.uiManager = new UIManager(this);
    this.controlsUI = new ControlsStatusUI(this, this.inputSystem);
    this.controlsUI.setVisible(false);

    // Crear palas
    this.pala1 = new Pala(this, 100, gameHeight / 2, 'player1');
    this.pala2 = new Pala(this, gameWidth - 100, gameHeight / 2, 'player2');
    
    // Crear partícula
    const particulaConfig = {
      VelocidadParticula: this.VelocidadParticula,
      VelocidadPala: this.VelocidadPala,
      MAX_ROTATION_DEG: this.MAX_ROTATION_DEG
    };
    this.particula = new Particula(this, gameWidth/2, gameHeight/2, 35, particulaConfig);

    // Crear el resto de objetos del juego
    this.createGameObjects();
  }

  update(time, delta) {
    // Actualizar el sistema de entrada PRIMERO
    this.inputSystem.update();

    // Comprobar si se ha pulsado el botón de intercambio de jugadores
    if (this.inputSystem.isSwapButtonPressed()) {
      this.inputSystem.swapPlayers();
    }

    // Comprobar teclas de debug/reinicio en cada frame
    if (Phaser.Input.Keyboard.JustDown(this.keyR)) this.scene.restart();
    if (Phaser.Input.Keyboard.JustDown(this.keyP)) this.toggleDebug();

    // Actualizar las palas siempre, para que el debug de ángulo funcione
    this.pala1.update(delta);
    this.pala2.update(delta);

    // Actualizar la UI de debug si está visible
    this.uiManager.updateDebugTexts(this.pala1, this.pala2);
    if (this.controlsUI && this.controlsUI.allUIElements[0]?.visible) {
        this.controlsUI.update();
    }

    // Lógica principal del juego
    if (this.gameState === 'PLAYING') {
      if (this.particula.isPegada) {
        const palaActiva = (this.jugadorParaServir === 1) ? this.pala1 : this.pala2;
        this.particula.actualizarPosicionPegada(palaActiva);

        const playerKey = this.jugadorParaServir === 1 ? 'player1' : 'player2';
        if (this.inputSystem.isJustPressed(INPUT_ACTIONS.NORTH, playerKey)) {
          this.particula.lanzar(palaActiva, this.jugadorParaServir);
        }
      } else {
        this.ComprobarPunto();
      }
    } else if (this.gameState === 'TUG_OF_WAR') {
      this.updateTugOfWarState();
    }

    // Actualizar el estado 'TUG_OF_WAR' si es necesario
    if (this.gameState === 'TUG_OF_WAR') {
      this.updateTugOfWarState();
    }

    // Guardar el estado de entrada para el próximo fotograma
    this.inputSystem.lateUpdate();
  }

  createGameObjects() {
    // Crear los objetos del juego normal
    const bloqueConfig = {
      FilasBloques: 4,
      ColumnasBloques: 4,
      EspaciadoBloques: 10,
      AnchoBloque: 200,
      AltoBloque: 50,
      ColorBloque: 0xffffff
    };
    this.bloques = new BloqueGroup(this, bloqueConfig);
    this.bloques.config = bloqueConfig; // Guardar config para referencia futura
    
    // Crear campo estabilizador
    this.CampoEstabilizador = new CampoEstabilizador(this, this.particula, this.uiManager);
    
    // Configurar colisiones
    this.physics.world.setBoundsCollision(false, false, true, true);
    this.particula.body.onWorldBounds = true;
    this.physics.world.on('worldbounds', (body, up, down, left, right) => {
        if (body.gameObject === this.particula && (up || down)) {
            this.sounds.ParticulaRebota.play();
        }
    });

    const processPalaCollision = () => !this.particula.isPegada;
    this.physics.add.collider(this.particula, this.pala1.getHitboxGroup(), this.ReboteParticula, processPalaCollision, this);
    this.physics.add.collider(this.particula, this.pala2.getHitboxGroup(), this.ReboteParticula, processPalaCollision, this);
    this.physics.add.collider(this.particula, this.bloques, this.GolpeBloque, null, this);

    // Pegar la partícula al ganador
    this.ResetParticulaParaServir(this.jugadorParaServir);
    
    // Mostrar puntuaciones y tutorial
    this.uiManager.updateScores(this.puntuacionP1, this.puntuacionP2);
  }

  // =================================================================
  // LÓGICA DE ESTADO TUG_OF_WAR
  // =================================================================

  enterTugOfWarState() {
    this.gameState = 'TUG_OF_WAR';

    // Pausar la partícula principal
    this.particula.body.stop();
    this.particula.setVisible(false);

    const gameWidth = this.sys.game.config.width;
    const gameHeight = this.sys.game.config.height;

    // Crear la partícula disputada
    this.contestedParticula = new Particula(this, gameWidth / 2, gameHeight / 2, 35, {});
    this.contestedParticula.body.setImmovable(true).setVelocity(0, 0);

    // Mostrar texto de 'Tira y Afloja'
    this.tugOfWarText = this.add.text(gameWidth / 2, gameHeight / 2 - 100, '¡PULSA ACCIÓN PARA RECLAMAR LA PARTÍCULA!', {
      fontSize: '32px', fill: '#ffff00', fontStyle: 'bold', stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5);
  }

  updateTugOfWarState() {
    let winner = null;
    if (this.inputSystem.isJustPressed(INPUT_ACTIONS.SOUTH, 'player1')) {
      winner = 1;
    } else if (this.inputSystem.isJustPressed(INPUT_ACTIONS.SOUTH, 'player2')) {
      winner = 2;
    }

    if (winner) {
      this.exitTugOfWarState(winner);
    }
  }

  exitTugOfWarState(winner) {
    this.gameState = 'PLAYING';
    this.jugadorParaServir = winner;

    // La partícula disputada se convierte en la principal
    const newParticulaPos = this.contestedParticula.getCenter();
    this.particula.setPosition(newParticulaPos.x, newParticulaPos.y);
    this.particula.setVisible(true);

    // Limpiar los objetos del estado 'Tira y Afloja'
    this.contestedParticula.destroy();
    this.contestedParticula = null;
    this.tugOfWarText.destroy();
    this.tugOfWarText = null;

    // Pegar la nueva partícula al ganador
    this.ResetParticulaParaServir(winner);
  }


  ReboteParticula(particula, circulo) {
    const palaVisual = circulo.parentPala;
    const isP1 = circulo.isP1;
    const pala = isP1 ? this.pala1 : this.pala2;
    const rotationLogica = pala.getLogicalRotation();

    const maxDif = palaVisual.height / 2;
    const factorPosicionY = Phaser.Math.Clamp(circulo.localYOffset / maxDif, -1, 1);
    const anguloNormalizado = Phaser.Math.Clamp(rotationLogica / this.MAX_ROTATION_DEG, -1, 1);
    const factorAngulo = -anguloNormalizado;
    let direccionY = (factorPosicionY * 0.5) + (factorAngulo * 0.5);
    direccionY = Phaser.Math.Clamp(direccionY, -0.95, 0.95);
    let direccionX = isP1 ? 1 : -1;

    const magnitudVector = Math.sqrt(direccionX * direccionX + direccionY * direccionY);
    const velXNormalizada = (direccionX / magnitudVector) * this.VelocidadParticula;
    const velYNormalizada = (direccionY / magnitudVector) * this.VelocidadParticula;
    this.particula.body.setVelocity(velXNormalizada, velYNormalizada);
    this.sounds.ParticulaRebota.play();

    if (this.CampoEstabilizador) {
      this.CampoEstabilizador.registerHit();
    }
  }

  GolpeBloque(particula, bloque) {
    this.sounds.ColisionObstaculo.play();
    const rowIndex = bloque.rowIndex;
    bloque.destroy();

    if (this.bloques.checkAndHandleCompletedRow(rowIndex)) {
      this.enterTugOfWarState();
    }
  }

  ComprobarPunto() {
    const gameWidth = this.sys.game.config.width;
    let scored = false;
    if (this.particula.x < -100) {
      this.puntuacionP2++;
      this.jugadorParaServir = 1;
      scored = true;
    } else if (this.particula.x > gameWidth + 100) {
      this.puntuacionP1++;
      this.jugadorParaServir = 2;
      scored = true;
    }

    if (scored) {
      this.uiManager.updateScores(this.puntuacionP1, this.puntuacionP2);
      this.ResetParticulaParaServir(this.jugadorParaServir);
    }
  }

  ResetParticulaParaServir(jugador) {
    const palaActiva = (jugador === 1) ? this.pala1 : this.pala2;
    this.particula.pegar(palaActiva);
  }

  toggleDebug() {
    // Invertimos el estado del debug
    this.physics.world.drawDebug = !this.physics.world.drawDebug;

    if (this.physics.world.drawDebug) {
      // Si queremos dibujarlo, pero el lienzo de depuración no existe, lo creamos
      if (!this.physics.world.debugGraphic) {
        this.physics.world.createDebugGraphic();
      }
    }

    // Si el lienzo de depuración ya existe, al desactivar el debug, lo limpiamos.
    if (this.physics.world.debugGraphic && !this.physics.world.drawDebug) {
      this.physics.world.debugGraphic.clear();
    }

    // Actualizamos la visibilidad de los textos de la UI en cualquier caso.
    this.uiManager.setDebugVisibility(this.physics.world.drawDebug);
    // Y también de la UI de controles
    this.controlsUI.setVisible(this.physics.world.drawDebug);
  }
}