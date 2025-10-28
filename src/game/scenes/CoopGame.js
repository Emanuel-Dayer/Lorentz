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

// La clase Game contiene toda la lógica de la escena principal
export class CoopGame extends Scene {
  constructor() {
    super("CoopGame");

    // Constantes de rotación (se pasarán a las instancias de las Palas)
    this.MAX_ROTATION_DEG = 55;
    this.DEAD_ZONE_DEG = 15;
    this.ROTATION_SPEED = 2.5;
    this.RETURN_SPEED = 0.8;
    this.CIRCLES_DENSITY = 20;
    
    // CONSTANTE: Límite de partículas que pueden estar pegadas a una pala
    this.MAX_PARTICLES_PEGADAS = 3; 

    // --- Mapeos de teclado para ambos jugadores ---
    this.keyMap1 = {
      [INPUT_ACTIONS.UP]: 'W',
      [INPUT_ACTIONS.DOWN]: 'S',
      [INPUT_ACTIONS.LEFT]: 'A',
      [INPUT_ACTIONS.RIGHT]: 'D',
      [INPUT_ACTIONS.NORTH]: 'SPACE', // △: Lanza la particula
      [INPUT_ACTIONS.SOUTH]: 'SHIFT', // ◯: Reclamar particula
      [INPUT_ACTIONS.EAST]: 'E',      // ✕: Crear una linea entre la paleta y las particulas
      [INPUT_ACTIONS.WEST]: 'Q',      // ▢:
    };

    this.keyMap2 = {
      [INPUT_ACTIONS.UP]: 'UP',
      [INPUT_ACTIONS.DOWN]: 'DOWN',
      [INPUT_ACTIONS.LEFT]: 'LEFT',
      [INPUT_ACTIONS.RIGHT]: 'RIGHT',
      [INPUT_ACTIONS.NORTH]: 'NUMPAD_ZERO', // △: Lanza la particula
      [INPUT_ACTIONS.SOUTH]: 'NUMPAD_ONE',  // ◯: Reclamar particula
      [INPUT_ACTIONS.EAST]: 'NUMPAD_THREE', // ✕: Crear una linea entre la paleta y las particulas
      [INPUT_ACTIONS.WEST]: 'NUMPAD_TWO',   // ▢:
    };
  }

  init({ jugadorParaServir }) {
    // --- Controles de teclado (MANEJADOS POR InputSystem) ---
    this.keyP = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    // --- Variables de Juego ---
    // AÑADIDO: Velocidad de la partícula ligeramente aumentada para el campo más grande
    this.VelocidadPala = 1200;
    this.VelocidadParticula = 1000; 
    this.jugadorParaServir = jugadorParaServir || 1; // Recibe al ganador o usa 1 por defecto
    this.puntuacionTotal = 0; // Puntuación compartida para modo cooperativo
    this.juegoFinalizado = false;
    
    // ARRAYS PARA SEGUIR LAS PARTÍCULAS PEGADAS
    this.particlesOnP1 = [];
    this.particlesOnP2 = [];

    this.sounds = {};
    this.reclaimText = null;
  }

  create() {
    // Configurar los sonidos
    this.sounds.ParticulaRebota = this.sound.add("ParticulaRebota");
    this.sounds.ColisionObstaculo = this.sound.add("ColisionObstaculo");
    this.sounds.Ball = this.sound.add("Ball");
    this.sounds.BLockBreak = this.sound.add("BLockBreak");
    this.sounds.DestroyingParticle = this.sound.add("DestroyingParticle");
    this.sounds.NewParticle = this.sound.add("NewParticle");
    this.sounds.TouchingStabalizer = this.sound.add("TouchingStabalizer");
    this.sounds.TouchingStabalizer2 = this.sound.add("TouchingStabalizer2");

    const gameWidth = this.sys.game.config.width;
    const gameHeight = this.sys.game.config.height;

    this.sounds.ParticulaRebota.play();

    this.inputSystem = new InputSystem(this, this.keyMap1, this.keyMap2);
    this.uiManager = new UIManager(this);
    this.controlsUI = new ControlsStatusUI(this, this.inputSystem);
    this.controlsUI.setVisible(false);

  // Controlador de líneas (bezier rectas) entre palas y partículas
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

    // Crear colisiones de Power Ups y Particulas

    this.physics.add.overlap(
    this.particulas,
    this.powerUps,
    this.handlePowerUpCollision,
    null,
    this
    );

    // Subscribirse al evento del CampoEstabilizador
    this.events.on('particleHitBarrier', this.handleBarrierHit, this);

    // Crear el resto de objetos del juego
    this.createGameObjects();
  }

  update(time, delta) {
    // Actualizar el sistema de entrada PRIMERO
    this.inputSystem.update();

    // Manejo del toggle EAST: cada jugador controla sus propias líneas
    if (this.inputSystem.isJustPressed(INPUT_ACTIONS.EAST, 'player1')) {
      this.lineaControl.toggleForPlayer('player1');
    }
    if (this.inputSystem.isJustPressed(INPUT_ACTIONS.EAST, 'player2')) {
      this.lineaControl.toggleForPlayer('player2');
    }

    /*
    // Comprobar si se ha pulsado el botón de intercambio de jugadores
    if (this.inputSystem.isSwapButtonPressed()) {
      this.inputSystem.swapPlayers();
    }

    // Comprobar teclas de debug/reinicio en cada frame
    if (Phaser.Input.Keyboard.JustDown(this.keyR)) this.scene.restart();
    if (Phaser.Input.Keyboard.JustDown(this.keyP)) this.toggleDebug();
    */

    // Actualizar las palas siempre (PERMITE QUE SE SIGAN MOVIENDO AUNQUE EL JUEGO HAYA TERMINADO)
    this.pala1.update(delta);
    this.pala2.update(delta);

    // === 1. Proteccion de Victoria (NUEVA POSICIÓN) ===
    // Si el juego está finalizado, solo se permite el movimiento de paletas, no la lógica de partículas o reclamación.
    if (this.juegoFinalizado) return; 

    // Actualizar la UI de debug si está visible
    this.uiManager.updateDebugTexts(this.pala1, this.pala2, this.particulas.countActive(true));
    if (this.controlsUI && this.controlsUI.allUIElements[0]?.visible) {
        this.controlsUI.update();
    }
    
    // Limpiar arrays de partículas pegadas antes de rellenarlas
    this.particlesOnP1 = [];
    this.particlesOnP2 = [];

    // Lógica principal del juego
    this.particulas.getChildren().forEach(particula => {
      // Si la partícula no tiene cuerpo de física (ej. si fue destruida pero sigue en el grupo
      // por alguna razón) o no está activa, la eliminamos del grupo inmediatamente.
      if (!particula.active || !particula.body) {
        particula.destroy();
        return;
      }
      
      // Llamar al update de la partícula para que el texto siga siempre
      particula.update();

      switch (particula.state) {
        case PARTICLE_STATE.PEGADA:
          // AÑADIR A LA LISTA DE PEGADAS
          if (particula.palaPegada === 1) {
              this.particlesOnP1.push(particula);
          } else {
              this.particlesOnP2.push(particula);
          }
          
          const palaActiva = (particula.palaPegada === 1) ? this.pala1 : this.pala2;
          
          // Pasar el índice de la partícula en la fila para el espaciado
          const arrayPegada = (particula.palaPegada === 1) ? this.particlesOnP1 : this.particlesOnP2;
          const index = arrayPegada.indexOf(particula);
          
          particula.actualizarPosicionPegada(palaActiva, index);

          // Asignar color y jugador al estar pegada
          const playerKeyPegada = (palaActiva === this.pala1) ? 'player1' : 'player2';
          const colorPegada = (palaActiva === this.pala1) ? 0x0000FF : 0xFF0000;
          particula.setLastPlayerHit(playerKeyPegada, colorPegada);

          const playerKey = (palaActiva === this.pala1) ? 'player1' : 'player2';
          if (this.inputSystem.isJustPressed(INPUT_ACTIONS.NORTH, playerKey)) {
            // Lanza la partícula que esté más cerca del centro (índice 0, o la primera en el array)
            const particleToLaunch = arrayPegada[0]; 
            
            // Si la partícula actual es la que debe lanzar, lanza. Si no, ignora (evita lanzar todo a la vez).
            if(particleToLaunch === particula) {
                particula.lanzar(palaActiva, (palaActiva === this.pala1) ? 1 : 2);
            }
          }
          break;

        case PARTICLE_STATE.NORMAL:
          this.ComprobarPunto(particula);
          break;

        case PARTICLE_STATE.RECLAMABLE:
          // Lógica de reclamación centralizada, no se hace aquí.
          break;
      }

      //Actualizar Power Ups
      this.powerUps.getChildren().forEach(pu => pu.update());

      // Nota: la gestión de creación/elim. de líneas se hace dentro de LineaControl.update
    });
    
    // Manejar la lógica de reclamación de forma centralizada.
    this.handleClaimAttempt();

  // Actualizar el sistema de dibujado de líneas (pasa delta para efectos físicos)
  this.lineaControl.update(delta);

    // Guardar el estado de entrada para el próximo fotograma
    this.inputSystem.lateUpdate();
  }

  /**
   * Gestiona el intento de reclamación de partículas.
   * Calcula el espacio disponible, reclama las necesarias y destruye el resto.
   */
  handleClaimAttempt() {
    // === 2. Proteccion de Victoria ===
    // Impide cualquier intento de reclamación si el juego ha terminado.
    if (this.juegoFinalizado) return; 

    let playerClaiming = 0;
    
    if (this.inputSystem.isJustPressed(INPUT_ACTIONS.SOUTH, 'player1')) {
        playerClaiming = 1;
    } else if (this.inputSystem.isJustPressed(INPUT_ACTIONS.SOUTH, 'player2')) {
        playerClaiming = 2;
    }

    if (playerClaiming !== 0) {
        const arrayPegada = (playerClaiming === 1) ? this.particlesOnP1 : this.particlesOnP2;
        // Obtenemos una lista de todas las partículas reclamables
        const reclamables = this.particulas.getChildren().filter(p => p.state === PARTICLE_STATE.RECLAMABLE);

        if (reclamables.length === 0) {
            // No hay partículas para reclamar, ignorar
            return;
        }

        const espacioDisponible = this.MAX_PARTICLES_PEGADAS - arrayPegada.length;

        if (espacioDisponible > 0) {
            // Calcula cuántas partículas reclamar (el mínimo entre el espacio y las reclamables)
            const countToClaim = Math.min(espacioDisponible, reclamables.length);
            
            // 1. Reclamar las partículas necesarias
            for (let i = 0; i < countToClaim; i++) {
                const particulaAReclamar = reclamables[i];
                const pala = (playerClaiming === 1) ? this.pala1 : this.pala2;
                
                // Reclamar y pegar la partícula
                particulaAReclamar.reclamar(pala);
                particulaAReclamar.palaPegada = playerClaiming;
            }
            
            // 2. Destruir el resto de partículas reclamables
            for (let i = countToClaim; i < reclamables.length; i++) {
                reclamables[i].destroy();
            }
            
            this.sounds.Ball.play(); // Sonido de éxito al reclamar

        } else {
            // Límite alcanzado (espacioDisponible <= 0). Destruir TODAS las reclamables.
            reclamables.forEach(p => p.destroy());
            this.sounds.BLockBreak.play(); // Sonido de pérdida/fallo
        }

        // Limpiar el texto de reclamación después del intento
        if (this.reclaimText) {
            this.reclaimText.destroy();
            this.reclaimText = null;
        }
    }
  }

  createGameObjects() {
    // Modificado: Configuración de los bloques más pequeña para más campo de juego
    const bloqueConfig = {
      FilasBloques: 6,      // Aumentado
      ColumnasBloques: 6,   // Aumentado
      EspaciadoBloques: 5,  // Reducido
      AnchoBloque: 100,     // Reducido
      AltoBloque: 30,       // Reducido
      ColorBloque: 0xffffff
    };
    this.bloques = new BloqueGroup(this, bloqueConfig);
    this.bloques.config = bloqueConfig; // Guardar config para referencia futura
    
    // Crear campo estabilizador
    this.CampoEstabilizador = new CampoEstabilizador(this, this.particulas, this.uiManager);
    
    // Configurar colisiones
    // Solo permitimos colisiones con límites Superior e Inferior
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

    // Pegar la partícula al ganador
    this.ResetParticulaParaServir(this.jugadorParaServir);
    
    // Mostrar puntuación inicial
    this.uiManager.updateScores(this.puntuacionTotal);
  }

  crearNuevaParticula(x, y, state = PARTICLE_STATE.NORMAL) {
    // AÑADIDO: Si el juego ha finalizado, no creamos partículas ni texto de reclamación.
    if (this.juegoFinalizado) {
        // Asegurarse de que si el juego terminó, cualquier texto de reclamación pendiente se destruya.
        if (this.reclaimText) {
            this.reclaimText.destroy();
            this.reclaimText = null;
        }
        return null;
    }
    
    // === 3. Limpiar texto de reclamación antes de crear/reclamar una nueva ===
    if (this.reclaimText) {
        this.reclaimText.destroy();
        this.reclaimText = null;
    }
    
    const particulaConfig = {
      VelocidadParticula: this.VelocidadParticula,
      VelocidadPala: this.VelocidadPala,
      MAX_ROTATION_DEG: this.MAX_ROTATION_DEG
    };
    // Modificado: Partícula más pequeña (radio 20)
    const particula = this.particulas.get(x, y, 20, particulaConfig);
    if (particula) {
      particula.setActive(true).setVisible(true);
      particula.state = state;
      // Desactivamos la colisión de límites para que el chequeo de punto sea manual en ComprobarPunto
      particula.body.onWorldBounds = false; 
      
      // Pasar el estado actual del debug al crear la partícula para que el texto sea visible si corresponde.
      particula.setDebugVisibility(this.physics.world.drawDebug); 

      
      if (state === PARTICLE_STATE.RECLAMABLE) {
        particula.body.setImmovable(true).setVelocity(0, 0);
        particula.setStrokeStyle(5, 0xffff00); // Color amarillo para indicar que es reclamable

        this.sounds.NewParticle.play();
        
        const gameWidth = this.sys.game.config.width;
        const gameHeight = this.sys.game.config.height;
        // Muestra cuántas puede reclamar el jugador
        const p1Count = this.particlesOnP1.length;
        const p2Count = this.particlesOnP2.length;
        
        const maxP1 = this.MAX_PARTICLES_PEGADAS - p1Count;
        const maxP2 = this.MAX_PARTICLES_PEGADAS - p2Count;
        
        this.reclaimText = this.add.text(gameWidth / 2, gameHeight / 2 - 100, 
            `¡PULSA ACCIÓN PARA RECLAMAR PARTÍCULA(S)! 
            (P1 máx: ${maxP1 > 0 ? maxP1 : 0}, P2 máx: ${maxP2 > 0 ? maxP2 : 0})`, {
          fontSize: '32px', fill: '#ffff00', fontStyle: 'bold', stroke: '#000', strokeThickness: 4, align: 'center'
        }).setOrigin(0.5);

      } else {
        particula.setStrokeStyle(5, 0xffffff); // Color normal
        particula.body.setImmovable(false);
      }
    }
    return particula;
  }


  ReboteParticula(particula, circulo) {
    const palaVisual = circulo.parentPala;
    const isP1 = circulo.isP1;
    const pala = isP1 ? this.pala1 : this.pala2;
    const rotationLogica = pala.getLogicalRotation();

    // Asignar el último jugador que tocó y el color
    const playerKey = isP1 ? 'player1' : 'player2';
    const color = isP1 ? 0x0000FF : 0xFF0000; // Azul para P1, Rojo para P2
    const now = this.time.now || Date.now();

    // Evitar múltiples hits por las múltiples hitboxes: comprobar cooldown
    if (!particula.canAcceptHit(playerKey, now)) {
      return; // ignorar este hit
    }

    // Registrar hit y añadir puntos por golpear la partícula
    particula.recordHitTime(playerKey, now);
    particula.setLastPlayerHit(playerKey, color);
    
    // Incrementar contador y puntos
    particula.incrementHitCount();
    this.puntuacionTotal += 100; // 100 puntos por cada golpe
    this.uiManager.updateScores(this.puntuacionTotal); // Actualizar la puntuación mostrada

    // Si llega a 9 cargas, la partícula se destruye
    if (particula.getHitCount() >= 9) {
      if (this.lineaControl) this.lineaControl.removeLinea(particula);
      particula.destroy();
      this.uiManager.updateScores(this.puntuacionTotal);
      
      if (this.particulas.countActive(true) === 0) {
        this.MostrarMensajeVictoria();
      }
      return;
    }
    
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

  GolpeBloque(particula, bloque) {
  this.sounds.BLockBreak.play();
  const rowIndex = bloque.rowIndex;
  const { x, y } = bloque;
  bloque.destroy();

  // Añadir 50 puntos por romper el bloque
  this.puntuacionTotal += 50;
  this.uiManager.updateScores(this.puntuacionTotal);

  // Chance de 10% de soltar un Power Up
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

  ComprobarPunto(particula) {
  if (this.juegoFinalizado) return;

  const gameWidth = this.sys.game.config.width;
  const gameHeight = this.sys.game.config.height;
  const bound = 50;

  let outOfBounds = false;

  // Fondo izquierdo o derecho
  if (particula.x < -bound || particula.x > gameWidth + bound) {
    if (particula.escudoActivo) {
      particula.escudoActivo = false;
      if (particula.halo) particula.halo.destroy();
      particula.body.setVelocityX(particula.x < -bound ? this.VelocidadParticula : -this.VelocidadParticula);
      this.sounds.ParticulaRebota?.play();
      return;
    }
    outOfBounds = true;
  }

  // Fuera de límites verticales
  if (particula.y < -bound || particula.y > gameHeight + bound) {
    outOfBounds = true;
  }

  if (outOfBounds) {
    if (this.lineaControl) this.lineaControl.removeLinea(particula);
    particula.destroy();
    this.uiManager.updateScores(this.puntuacionTotal);

    // Verificar si se quedaron sin partículas
    if (this.particulas.countActive(true) === 0) {
      this.MostrarMensajeVictoria();
    }
  }
}

  /**
   * Maneja la colisión de una partícula con la barrera inferior (Campo Estabilizador).
   * @param {Particula} particula La instancia de la partícula que colisionó.
   */
handleBarrierHit(particula) {
  if (!particula.active || this.juegoFinalizado) return;

  const hitCount = particula.getHitCount();

  // Si tiene escudo activo, rebota y se consume
  if (particula.escudoActivo) {
    particula.escudoActivo = false;
    if (particula.halo) {
      particula.halo.destroy();
      particula.halo = null;
    }

    particula.body.setVelocityY(-Math.max(600, this.VelocidadParticula * 0.5));
    if (this.lineaControl) this.lineaControl.removeLinea(particula);
    this.sounds.ParticulaRebota?.play();
    return;
  }

  // Añadir puntos según la cantidad de cargas solo si tiene 5 o más
  if (hitCount === 5) {
    this.puntuacionTotal += 1000; // 1000 puntos por 5 cargas
  } else if (hitCount >= 6 && hitCount <= 8) {
    this.puntuacionTotal += 500; // 500 puntos por 6, 7 u 8 cargas
  }

  // Actualizar UI y reproducir sonido
  this.uiManager.updateScores(this.puntuacionTotal);
  this.sounds.TouchingStabalizer2.play();

  // Destruir la partícula
  if (this.lineaControl) this.lineaControl.removeLinea(particula);
  particula.destroy();

  // Verificar si nos quedamos sin partículas
  if (this.particulas.countActive(true) === 0) {
    this.MostrarMensajeVictoria();
  }
}

handlePowerUpCollision(particula, powerUp) {
  if (!particula || !powerUp || !particula.active || !powerUp.active) return;

  const jugador = particula.lastPlayerHit;

  if (jugador === 'player1' || jugador === 'player2') {
    // Verificar si el powerUp es de tipo escudo
    if (powerUp.tipo === 'escudo') {
      if (particula.escudoActivo) {
        // Ya tiene escudo, no aplicar otro
        powerUp.destroy(); // Evita duplicado visual y lógico
        return;
      }
    }

    // Añadir 20 puntos por recoger power up
    this.puntuacionTotal += 20;
    this.uiManager.updateScores(this.puntuacionTotal);

    powerUp.onCollected(jugador);
  } else {
    console.warn('PowerUp no pudo determinar el jugador que lo recogió.');
    powerUp.destroy(); // evita que quede flotando
  }
}

  ResetParticulaParaServir(jugador) {
    // Destruye TODAS las partículas activas antes de crear las nuevas
    // Si existe lineaControl, limpiar todas las lineas primero
    if (this.lineaControl) this.lineaControl.clearAll();
    this.particulas.getChildren().forEach(p => p.destroy());
    
    // Limpiar las partículas pegadas, ya que se destruyeron
    this.particlesOnP1 = [];
    this.particlesOnP2 = [];
    
    // También limpiamos el texto de reclamación si existe, por si acaso.
    if (this.reclaimText) {
        this.reclaimText.destroy();
        this.reclaimText = null;
    }

    // Crear 3 partículas para cada jugador
    for (let i = 0; i < 3; i++) {
      // Partículas para jugador 1
      const particula1 = this.crearNuevaParticula(0, 0);
      if (particula1) {
        particula1.pegar(this.pala1);
        particula1.palaPegada = 1;
      }

      // Partículas para jugador 2
      const particula2 = this.crearNuevaParticula(0, 0);
      if (particula2) {
        particula2.pegar(this.pala2);
        particula2.palaPegada = 2;
      }
    }
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
    // Esto asegura que el texto del contador de hits de cada partícula se muestre/oculte correctamente
    this.particulas.getChildren().forEach(p => p.setDebugVisibility(this.physics.world.drawDebug)); 
    // Y también de la UI de controles
    this.controlsUI.setVisible(this.physics.world.drawDebug);
  }

  MostrarMensajeVictoria() {
  this.juegoFinalizado = true;

  // Limpieza visual
  if (this.lineaControl) this.lineaControl.clearAll();
  this.particulas.getChildren().forEach(p => p.destroy());
  if (this.reclaimText) {
    this.reclaimText.destroy();
    this.reclaimText = null;
  }

  // Transición a escena de resultado
  this.scene.start('RslGameResult', {
    modo: 'COOP',
    puntuacion: this.puntuacionTotal
  });
}
}
