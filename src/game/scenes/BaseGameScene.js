import { Scene } from "phaser";

// Importar las clases de los objetos del juego
import { Pala } from "../../objects/Pala";
import { Particula, PARTICLE_STATE } from "../../objects/Particula";
import { BloqueGroup } from "../../objects/BloqueGroup";
import CampoEstabilizador from '../../objects/CampoEstabilizador.js';
import LineaControl from '../../objects/LineaControl.js';
import PowerUpPaleta from '../../objects/Paletapowerup.js';
import Escudospowerup from '../../objects/Escudospowerup.js';
import Hielopowerup from '../../objects/Hielopowerup.js';
import Caracolpowerup from '../../objects/Caracolpowerup.js';

// Utilidades para la UI y el sistema de entrada
import { UIManager } from "../utils/UIManager";
import InputSystem, { INPUT_ACTIONS } from "../utils/InputSystem";
import { ControlsStatusUI } from "../utils/ControlsStatusUI";

// Servicios de traducción
import keys from "../../enums/keys";
import { getTranslations, getPhrase } from "../../services/translations";

/*
    Clase base que contiene toda la lógica compartida entre VersusGame (VS) y CoopGame (COOP)
    Las subclases sobrescriben las funciones específicas para cada modo de juego
*/

export class BaseGameScene extends Scene {
  constructor(sceneName) {
    super(sceneName);

    const {Pulsa} = keys.Interfaz;
    this.Pulsa = Pulsa;

    // Constantes de rotación
    this.MAX_ROTATION_DEG = 55;
    this.DEAD_ZONE_DEG = 15;
    this.ROTATION_SPEED = 2.5;
    this.RETURN_SPEED = 0.8;
    this.CIRCLES_DENSITY = 20;
    
    // Límite de partículas pegadas
    this.MAX_PARTICLES_PEGADAS = 3;

    // Mapeos de teclado
    this.keyMap1 = {
      [INPUT_ACTIONS.UP]: 'W',
      [INPUT_ACTIONS.DOWN]: 'S',
      [INPUT_ACTIONS.LEFT]: 'A',
      [INPUT_ACTIONS.RIGHT]: 'D',
      [INPUT_ACTIONS.NORTH]: 'SPACE',
      [INPUT_ACTIONS.SOUTH]: 'SHIFT',
      [INPUT_ACTIONS.EAST]: 'E',
      [INPUT_ACTIONS.WEST]: 'Q',
    };

    this.keyMap2 = {
      [INPUT_ACTIONS.UP]: 'UP',
      [INPUT_ACTIONS.DOWN]: 'DOWN',
      [INPUT_ACTIONS.LEFT]: 'LEFT',
      [INPUT_ACTIONS.RIGHT]: 'RIGHT',
      [INPUT_ACTIONS.NORTH]: 'NUMPAD_ZERO',
      [INPUT_ACTIONS.SOUTH]: 'NUMPAD_ONE',
      [INPUT_ACTIONS.EAST]: 'NUMPAD_THREE',
      [INPUT_ACTIONS.WEST]: 'NUMPAD_TWO',
    };
  }

  init({ jugadorParaServir }) {
    this.keyP = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    this.VelocidadPala = 1200;
    this.VelocidadParticula = 1000;
    this.jugadorParaServir = jugadorParaServir || 1;
    this.juegoFinalizado = false;
    
    this.particlesOnP1 = [];
    this.particlesOnP2 = [];

    this.sounds = {};
    this.reclaimText = null;

    // Las subclases deben inicializar sus propias variables de puntuación
    this.initializeScores();
  }

  initializeScores() {
    // Sobrescribir en subclases
  }

  create() {
    // Configurar sonidos
    this.sounds.ParticulaRebota = this.sound.add("ParticulaRebota");
    this.sounds.ColisionObstaculo = this.sound.add("ColisionObstaculo");
    this.sounds.Ball = this.sound.add("Ball");
    this.sounds.BLockBreak = this.sound.add("BLockBreak");
    this.sounds.DestroyingParticle = this.sound.add("DestroyingParticle");
    this.sounds.NewParticle = this.sound.add("NewParticle");
    this.sounds.TouchingStabalizer = this.sound.add("TouchingStabalizer");
    this.sounds.TouchingStabalizer2 = this.sound.add("TouchingStabalizer2");

    this.sounds.ParticulaRebota.play();

    const gameWidth = this.sys.game.config.width;
    const gameHeight = this.sys.game.config.height;

    this.inputSystem = new InputSystem(this, this.keyMap1, this.keyMap2);
    this.uiManager = new UIManager(this);
    this.controlsUI = new ControlsStatusUI(this, this.inputSystem);
    this.controlsUI.setVisible(false);

    this.lineaControl = new LineaControl(this);

    // Crear palas
    this.pala1 = new Pala(this, 100, gameHeight / 2, 'player1');
    this.pala2 = new Pala(this, gameWidth - 100, gameHeight / 2, 'player2');

    // Crear grupo de Power Ups
    this.powerUps = this.add.group();
    
    // Crear grupo de partículas
    this.particulas = this.add.group({
      classType: Particula,
      runChildUpdate: true
    });

    // Colisiones de Power Ups y Partículas
    this.physics.add.overlap(
      this.particulas,
      this.powerUps,
      this.handlePowerUpCollision,
      null,
      this
    );

    this.events.on('particleHitBarrier', this.handleBarrierHit, this);

    // Crear el resto de objetos del juego
    this.createGameObjects();
  }

  update(time, delta) {
    this.inputSystem.update();

    if (this.inputSystem.isJustPressed(INPUT_ACTIONS.EAST, 'player1')) {
      this.lineaControl.toggleForPlayer('player1');
    }
    if (this.inputSystem.isJustPressed(INPUT_ACTIONS.EAST, 'player2')) {
      this.lineaControl.toggleForPlayer('player2');
    }

    if (this.inputSystem.isSwapButtonPressed()) {
      this.inputSystem.swapPlayers();
    }

    this.pala1.update(delta);
    this.pala2.update(delta);

    if (this.juegoFinalizado) return;

    this.uiManager.updateDebugTexts(this.pala1, this.pala2, this.particulas.countActive(true));
    if (this.controlsUI && this.controlsUI.allUIElements[0]?.visible) {
      this.controlsUI.update();
    }
    
    this.particlesOnP1 = [];
    this.particlesOnP2 = [];

    this.particulas.getChildren().forEach(particula => {
      if (!particula.active || !particula.body) {
        particula.destroy();
        return;
      }
      
      particula.update();

      switch (particula.state) {
        case PARTICLE_STATE.PEGADA:
          this.updateAttachedParticle(particula);
          break;

        case PARTICLE_STATE.NORMAL:
          this.ComprobarPunto(particula);
          break;

        case PARTICLE_STATE.RECLAMABLE:
          break;
      }

      this.powerUps.getChildren().forEach(pu => pu.update());
    });
    
    this.handleClaimAttempt();
    this.lineaControl.update(delta);
    this.inputSystem.lateUpdate();
  }
  
//Actualiza la lógica de una partícula pegada a una pala
  updateAttachedParticle(particula) {
    if (particula.palaPegada === 1) {
      this.particlesOnP1.push(particula);
    } else {
      this.particlesOnP2.push(particula);
    }
    
    const palaActiva = (particula.palaPegada === 1) ? this.pala1 : this.pala2;
    const arrayPegada = (particula.palaPegada === 1) ? this.particlesOnP1 : this.particlesOnP2;
    const index = arrayPegada.indexOf(particula);
    
    particula.actualizarPosicionPegada(palaActiva, index);

    const playerKeyPegada = (palaActiva === this.pala1) ? 'player1' : 'player2';
    const colorPegada = (palaActiva === this.pala1) ? 0x0000FF : 0xFF0000;
    particula.setLastPlayerHit(playerKeyPegada, colorPegada);

    const playerKey = (palaActiva === this.pala1) ? 'player1' : 'player2';
    if (this.inputSystem.isJustPressed(INPUT_ACTIONS.NORTH, playerKey)) {
      const particleToLaunch = arrayPegada[0];
      if(particleToLaunch === particula) {
        particula.lanzar(palaActiva, (palaActiva === this.pala1) ? 1 : 2);
      }
    }
  }

  handleClaimAttempt() {
    if (this.juegoFinalizado) return;

    let playerClaiming = 0;
    
    if (this.inputSystem.isJustPressed(INPUT_ACTIONS.SOUTH, 'player1')) {
      playerClaiming = 1;
    } else if (this.inputSystem.isJustPressed(INPUT_ACTIONS.SOUTH, 'player2')) {
      playerClaiming = 2;
    }

    if (playerClaiming !== 0) {
      const arrayPegada = (playerClaiming === 1) ? this.particlesOnP1 : this.particlesOnP2;
      const reclamables = this.particulas.getChildren().filter(p => p.state === PARTICLE_STATE.RECLAMABLE);

      if (reclamables.length === 0) {
        return;
      }

      const espacioDisponible = this.MAX_PARTICLES_PEGADAS - arrayPegada.length;

      if (espacioDisponible > 0) {
        const countToClaim = Math.min(espacioDisponible, reclamables.length);
        
        for (let i = 0; i < countToClaim; i++) {
          const particulaAReclamar = reclamables[i];
          const pala = (playerClaiming === 1) ? this.pala1 : this.pala2;
          
          particulaAReclamar.reclamar(pala);
          particulaAReclamar.palaPegada = playerClaiming;
        }
        
        for (let i = countToClaim; i < reclamables.length; i++) {
          reclamables[i].destroy();
        }
        
        this.sounds.Ball.play();

      } else {
        reclamables.forEach(p => p.destroy());
        this.sounds.BLockBreak.play();
      }

      if (this.reclaimText) {
        this.reclaimText.destroy();
        this.reclaimText = null;
      }
    }
  }

  createGameObjects() {
    const bloqueConfig = {
      FilasBloques: 6,
      ColumnasBloques: 6,
      EspaciadoBloques: 5,
      AnchoBloque: 100,
      AltoBloque: 30,
      ColorBloque: 0xffffff
    };
    this.bloques = new BloqueGroup(this, bloqueConfig);
    this.bloques.config = bloqueConfig;
    
    this.CampoEstabilizador = new CampoEstabilizador(this, this.particulas, this.uiManager);
    
    this.physics.world.setBoundsCollision(false, false, true, true);
    
    this.physics.world.on('worldbounds', (body, up, down, left, right) => {
      if (this.particulas.contains(body.gameObject) && (up || down)) {
        this.sounds.Ball.play();
      }
    });

    const processPalaCollision = (particula) => particula.state === PARTICLE_STATE.NORMAL;
    this.physics.add.collider(this.particulas, this.pala1.getHitboxGroup(), this.ReboteParticula, processPalaCollision, this);
    this.physics.add.collider(this.particulas, this.pala2.getHitboxGroup(), this.ReboteParticula, processPalaCollision, this);
    this.physics.add.collider(this.particulas, this.bloques, this.GolpeBloque, null, this);

    this.ResetParticulaParaServir(this.jugadorParaServir);
    this.updateUIDisplay();
  }

  //Actualizar la visualización de la UI (puntuaciones, etc)
  updateUIDisplay() {
    // Sobrescribir en subclases
  }

  crearNuevaParticula(x, y, state = PARTICLE_STATE.NORMAL) {
    if (this.juegoFinalizado) {
      if (this.reclaimText) {
        this.reclaimText.destroy();
        this.reclaimText = null;
      }
      return null;
    }
    
    if (this.reclaimText) {
      this.reclaimText.destroy();
      this.reclaimText = null;
    }
    
    const particulaConfig = {
      VelocidadParticula: this.VelocidadParticula,
      VelocidadPala: this.VelocidadPala,
      MAX_ROTATION_DEG: this.MAX_ROTATION_DEG
    };

    const particula = this.particulas.get(x, y, 20, particulaConfig);
    if (particula) {
      particula.setActive(true).setVisible(true);
      particula.state = state;
      particula.body.onWorldBounds = false;
      particula.setDebugVisibility(this.physics.world.drawDebug);

      if (state === PARTICLE_STATE.RECLAMABLE) {
        this.setupReclaimableParticle(particula);
      } else {
        particula.setStrokeStyle(5, 0xffffff);
        particula.body.setImmovable(false);
      }
    }
    return particula;
  }

  //Configurar una partícula reclamable
  setupReclaimableParticle(particula) {
    particula.body.setImmovable(true).setVelocity(0, 0);
    particula.setStrokeStyle(5, 0xffff00);
    this.sounds.NewParticle.play();

    const gameWidth = this.sys.game.config.width;
    const gameHeight = this.sys.game.config.height;

    const p1Count = this.particlesOnP1.length;
    const p2Count = this.particlesOnP2.length;
    
    const maxP1 = this.MAX_PARTICLES_PEGADAS - p1Count;
    const maxP2 = this.MAX_PARTICLES_PEGADAS - p2Count;
    
    this.reclaimText = this.add.text(gameWidth / 2, gameHeight / 2 - 100, 
      `${getPhrase(this.Pulsa)}
      (P1 máx: ${maxP1 > 0 ? maxP1 : 0}, P2 máx: ${maxP2 > 0 ? maxP2 : 0})`, {
        fontSize: '32px', fill: '#ffff00', fontStyle: 'bold', stroke: '#000', strokeThickness: 4, align: 'center'
      }).setOrigin(0.5);
  }

  _resetParticulasYTexto() {
    if (this.lineaControl) this.lineaControl.clearAll();
    this.particulas.getChildren().forEach(p => p.destroy());
    
    this.particlesOnP1 = [];
    this.particlesOnP2 = [];
    
    if (this.reclaimText) {
      this.reclaimText.destroy();
      this.reclaimText = null;
    }
  }

  ReboteParticula(particula, circulo) {
    const palaVisual = circulo.parentPala;
    const isP1 = circulo.isP1;
    const pala = isP1 ? this.pala1 : this.pala2;
    const rotationLogica = pala.getLogicalRotation();

    const playerKey = isP1 ? 'player1' : 'player2';
    const color = isP1 ? 0x0000FF : 0xFF0000;
    const now = this.time.now || Date.now();

    if (!particula.canAcceptHit(playerKey, now)) {
      return;
    }

    particula.recordHitTime(playerKey, now);
    particula.setLastPlayerHit(playerKey, color);

    //procesar el hit según el modo
    this.handleHitParticle(particula);
    
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
    particula.body.setVelocity(velXNormalizada, velYNormalizada);
    this.sounds.Ball.play();
  }

  //Procesar el hit de una partícula
  handleHitParticle(particula) {
    // Sobrescribir en subclases
    particula.incrementHitCount();
  }

  GolpeBloque(particula, bloque) {
    this.sounds.BLockBreak.play();
    const rowIndex = bloque.rowIndex;
    const { x, y } = bloque;
    bloque.destroy();

    // Procesar puntos del bloque
    this.handleBlockBreak();

    // Chance de soltar Power Up
    if (Phaser.Math.Between(1, 100) <= 20) {
      const tipo = Phaser.Math.RND.pick(['paleta', 'escudo', 'hielo', 'caracol']);
      let powerUp;

      switch (tipo) {
        case 'paleta':
          powerUp = new PowerUpPaleta(this, x, y);
          break;
        case 'escudo':
          powerUp = new Escudospowerup(this, x, y);
          break;
        case 'hielo':
          powerUp = new Hielopowerup(this, x, y);
          break;
        case 'caracol':
          powerUp = new Caracolpowerup(this, x, y);
          break;
      }

      if (powerUp) {
        this.add.existing(powerUp);
        this.physics.add.existing(powerUp);
        this.powerUps.add(powerUp);
      }
    }

    if (this.bloques.checkAndHandleCompletedRow(rowIndex)) {
      const gameWidth = this.sys.game.config.width;
      const gameHeight = this.sys.game.config.height;
      this.crearNuevaParticula(gameWidth / 2, gameHeight / 2, PARTICLE_STATE.RECLAMABLE);
    }
  }

  //Procesar romper un bloque
  handleBlockBreak() {
    // Sobrescribir en subclases
  }

  //Comprobar punto
  ComprobarPunto(particula) {
    // Sobrescribir en subclases
  }

  //Manejar colisión con barrera
  handleBarrierHit(particula) {
    // Sobrescribir en subclases
  }

  handlePowerUpCollision(particula, powerUp) {
    if (!particula || !powerUp || !particula.active || !powerUp.active) return;

    const jugador = particula.lastPlayerHit;

    if (jugador === 'player1' || jugador === 'player2') {
      if (powerUp.tipo === 'escudo') {
        if (particula.escudoActivo) {
          powerUp.destroy();
          return;
        }
      }

      // Procesar recogida de power up
      this.handlePowerUpPickup(jugador);

      powerUp.onCollected(jugador);
    } else {
      powerUp.destroy();
    }
  }

  //Procesar recogida de power up
  handlePowerUpPickup(jugador) {
    // Sobrescribir en subclases si es necesario procesar puntos
  }

  //Reiniciar partícula para servir
  ResetParticulaParaServir(jugador) {
    // Sobrescribir en subclases
  }

  toggleDebug() {
    this.physics.world.drawDebug = !this.physics.world.drawDebug;

    if (this.physics.world.drawDebug) {
      if (!this.physics.world.debugGraphic) {
        this.physics.world.createDebugGraphic();
      }
    }

    if (this.physics.world.debugGraphic && !this.physics.world.drawDebug) {
      this.physics.world.debugGraphic.clear();
    }

    this.uiManager.setDebugVisibility(this.physics.world.drawDebug);
    this.particulas.getChildren().forEach(p => p.setDebugVisibility(this.physics.world.drawDebug));
    this.controlsUI.setVisible(this.physics.world.drawDebug);
  }

  //Mostrar mensaje de victoria
  MostrarMensajeVictoria() {
    // Sobrescribir en subclases
  }

  //Limpieza de victoria
  cleanupForVictory() {
    this.juegoFinalizado = true;

    if (this.lineaControl) this.lineaControl.clearAll();
    this.particulas.getChildren().forEach(p => p.destroy());
    if (this.reclaimText) {
      this.reclaimText.destroy();
      this.reclaimText = null;
    }
  }
}
