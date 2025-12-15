import { Scene } from "phaser";
import { Pala } from "../Pala";

export const PARTICLE_STATE = {
  NORMAL: "normal",
  PEGADA: "pegada",
  RECLAMABLE: "reclamable",
};

// Configuración de estados de carga de la partícula
const CHARGE_STATES = [
  { color: 0x000000, scale: 1.0, speedMultiplier: 1.0, curveInfluence: 400 },  // 0: Negro (sin carga)
  { color: 0xABA244, scale: 1.1, speedMultiplier: 1.1, curveInfluence: 800 },  // 1: Dorado suave
  { color: 0x71B359, scale: 1.2, speedMultiplier: 1.2, curveInfluence: 1200 }, // 2: Verde
  { color: 0x77B8B0, scale: 1.3, speedMultiplier: 1.3, curveInfluence: 1600 }, // 3: Turquesa
  { color: 0xA9B2CF, scale: 1.4, speedMultiplier: 1.4, curveInfluence: 1800 }, // 4: Azul grisáceo
  { color: 0xFFFFFF, scale: 1.5, speedMultiplier: 1.5, curveInfluence: 2000 }, // 5: Blanco
  { color: 0xE8BEBE, scale: 1.6, speedMultiplier: 1.6, curveInfluence: 2200 }, // 6: Rosa claro
  { color: 0xD95F5F, scale: 1.7, speedMultiplier: 1.7, curveInfluence: 2400 }, // 7: Rojo medio
  { color: 0xFF0000, scale: 1.8, speedMultiplier: 1.8, curveInfluence: 2600 }, // 8: Rojo intenso
];

export class Particula extends Phaser.GameObjects.Arc {
  /**
   * @param {Scene} scene La escena de Phaser.
   * @param {number} x Posición X inicial.
   * @param {number} y Posición Y inicial.
   * @param {number} radius Radio del círculo.
   * @param {object} config Objeto con constantes de la escena (velocidad, rotación, etc.).
   */
  constructor(scene, x, y, radius, config) {
    // Llama al constructor de la clase base (Phaser.GameObjects.Arc)
    super(scene, x, y, radius, 0, 360, false, CHARGE_STATES[0].color, 1);
    this.setStrokeStyle(5, 0xffffff);
    
    // Establecer el límite de hits según config si se pasó explícitamente,
    // en caso contrario mantener la lógica histórica (fallback).
    // Usar `config.MAX_HITS` evita depender de `constructor.name`, que
    // puede cambiar/minificarse en builds de producción (p. ej. Vercel).
    this.MAX_HITS = (config && config.MAX_HITS) ? config.MAX_HITS : (scene.constructor.name === 'CoopGame' ? 9 : 5);
    
    // Guardamos el radio base para los cálculos de escala
    this.baseRadius = radius;
    
    // Añade este objeto a la escena y al sistema de físicas
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.config = config;
    this.state = PARTICLE_STATE.NORMAL; // Estado inicial
    this.velocidadVerticalPegada = 0;
    this.lastPlayerHit = null; // 'player1' o 'player2'
    this.hitCount = 0;
    this.radius = radius; // Guardamos el radio para cálculo de espaciado
    this.escudoActivo = false;
    this.escudoColor = null; // 0x0000FF para azul, 0xFF0000 para rojo
    this.escudoOwner = null; // 'player1' o 'player2'

    // Cooldown para evitar múltiples hits por las múltiples hitboxes de una pala
    // Guarda timestamps (ms) del último hit por cada jugador
    this._lastHitTime = {
      player1: 0,
      player2: 0
    };
    // Delay por defecto entre hits de la misma pala (ms)
    this.HIT_COOLDOWN_MS = 200;

    // Texto para el contador de toques (individual por partícula)
    this.hitCountText = scene.add.text(this.x, this.y, '0', {
        fontSize: '32px', // Más pequeño para que quepa bien dentro o sobre la partícula
        fill: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 6
    }).setOrigin(0.5).setDepth(9999); 
    
    // El texto solo es visible si el debug de la escena ya está activo.
    this.hitCountText.setVisible(scene.physics.world.drawDebug); 


    // Configuración del cuerpo físico
    this.body.setCircle(radius);
    this.body.setBounce(1, 1);
    this.body.setCollideWorldBounds(true);

    // --- Estado para control por linea ---
    this.lineActive = false;       // si la partícula está bajo control de una linea
    this.lineTension = 0;         // 1..0, decrementa con el tiempo para "enderezar" la linea
    this.lineCurvature = 0;       // curvatura actual (normalizada)
    this.lineTargetCurvature = 0; // objetivo de curvatura por frame
    this._maxLineVy = 1200;       // limite seguro para la velocidad vertical
  }

  /**
   * Lanza la partícula desde la pala.
   * @param {Pala} palaActiva La pala desde la que se lanza.
   * @param {number} jugadorParaServir El jugador que lanza (1 o 2).
   */
  lanzar(palaActiva, jugadorParaServir) {
    if (this.state !== PARTICLE_STATE.PEGADA) return;

    this.state = PARTICLE_STATE.NORMAL;
    const palaVisual = palaActiva.getVisualObject();
    const rotationLogica = palaActiva.getLogicalRotation();

    let direccionX = (jugadorParaServir === 1) ? 1 : -1;
    const anguloNormalizado = Phaser.Math.Clamp(rotationLogica / this.config.MAX_ROTATION_DEG, -1, 1);
    let direccionY = -anguloNormalizado * 0.8 + (this.velocidadVerticalPegada * 0.01);
    
    const palaVelY = palaVisual.body.velocity.y;
    const factorVelocidad = palaVelY / this.config.VelocidadPala * 0.5;
    direccionY += factorVelocidad;

    if (Math.abs(direccionY) < 0.2) {
      direccionY = (Phaser.Math.Between(0, 1) === 0 ? 0.3 : -0.3);
    }

    const magnitudVector = Math.sqrt(direccionX * direccionX + direccionY * direccionY);
    const velXNormalizada = (direccionX / magnitudVector) * this.config.VelocidadParticula;
    const velYNormalizada = (direccionY / magnitudVector) * this.config.VelocidadParticula;
    
    this.body.setVelocity(velXNormalizada, velYNormalizada);
    this.scene.sounds.Ball.play();
  }

  /**
   * Pega la partícula a una pala para el servicio.
   * @param {Pala} palaActiva La pala a la que se pega.
   */
  pegar(palaActiva) {
    this.state = PARTICLE_STATE.PEGADA;
    this.body.setVelocity(0, 0);
    this.velocidadVerticalPegada = 0;
    this.hitCount = 0; // Se resetea la carga al pegar
    this.hitCountText.setText(0);
    // Ya no se llama a actualizarPosicionPegada aquí, se llama en el update de Game
  }

  // --- Métodos para el control por línea ---
  enableLineControl(startTension = 1) {
    this.lineActive = true;
    this.lineTension = Phaser.Math.Clamp(startTension, 0, 1);
  }

  disableLineControl() {
    this.lineActive = false;
    this.lineTension = 0;
    this.lineCurvature = 0;
    this.lineTargetCurvature = 0;
  }

  /**
   * Aplica el efecto de curvatura desde la línea sobre la partícula.
   * curvature: valor -1..1 que indica dirección/intensidad base
   * delta: tiempo en ms desde el último frame
   */
  applyLineEffect(curvature, delta) {
    const dt = Math.max(0, delta) / 1000; // segundos

    // Suavizamos la curvatura hacia la target
    this.lineTargetCurvature = curvature || 0;
    const smooth = Math.min(1, dt * 10);
    this.lineCurvature += (this.lineTargetCurvature - this.lineCurvature) * smooth;

    if (!this.lineActive || this.lineTension <= 0) return;

    // Aplicar modificación a la velocidad vertical según curvatura y tensión
    // Obtener la influencia de curvatura según el nivel de carga
    const chargeState = CHARGE_STATES[this.hitCount];
    const maxCurvatureSpeed = chargeState ? chargeState.curveInfluence : CHARGE_STATES[0].curveInfluence;
    const vyAdd = this.lineCurvature * maxCurvatureSpeed * this.lineTension * dt;

    const newVy = Phaser.Math.Clamp(this.body.velocity.y + vyAdd, -this._maxLineVy, this._maxLineVy);
    this.body.setVelocityY(newVy);

    // La tensión decae con el tiempo (la linea "se endereza")
    const decayPerSec = 0.25; // dura ~4s por defecto (ajustable)
    this.lineTension = Math.max(0, this.lineTension - decayPerSec * dt);
    if (this.lineTension === 0) this.lineActive = false;
  }

  /**
   * Actualiza la posición de la partícula cuando está pegada a una pala.
   * @param {Pala} palaActiva La pala que está siguiendo.
   * @param {number} index El índice de la partícula en el stack (0, 1, 2...).
   */
  actualizarPosicionPegada(palaActiva, index) {
    if (this.state !== PARTICLE_STATE.PEGADA) return;

    const palaVisual = palaActiva.getVisualObject();
    
    // --- Lógica de Espaciado Vertical ---
    // Posiciona la partícula por debajo o por encima del centro de la pala.
    // Index 0 (la primera) está en el centro.
    // Index 1 está a 2*radio + 10px arriba.
    // Index 2 está a 2*radio + 10px abajo.
    const separation = (this.radius * 2) + 30;
    let targetYOffset = 0;

    if (index === 1) {
        targetYOffset = -separation;
    } else if (index === 2) {
        targetYOffset = separation;
    }
    // Si hay más de 3, las que pasen el límite (pero deberían ser destruidas antes) se apilan en el centro
    
    // Simula un efecto de resorte/gravedad hacia la posición objetivo de la pala
    const atraccionHaciaCentroPala = (palaVisual.y + targetYOffset - this.y) * 0.05;
    const friccion = this.velocidadVerticalPegada * 0.2;
    this.velocidadVerticalPegada += atraccionHaciaCentroPala - friccion;

    // Limita el movimiento vertical de la particula a lo largo de la pala
    const limitY = palaVisual.height / 2 - this.radius - 10;
    // La velocidad vertical solo debe controlar el "tambaleo" y no la posición
    // La posición final Y será calculada por la palaVisual.y + targetYOffset

    // Calcula la posición relativa a la pala, teniendo en cuenta la rotación
    const offsetHorizontal = palaVisual.width / 2 + this.radius + 30;
    const dirFactor = palaActiva.isP1 ? 1 : -1;
    const localAnchorX = offsetHorizontal * dirFactor;
    // Usa la posición vertical que sigue la pala + el offset de apilamiento
    const localAnchorY = targetYOffset;
    
    const anguloVisualRad = palaVisual.angle * Phaser.Math.DEG_TO_RAD;
    const deltaX = localAnchorX * Math.cos(anguloVisualRad) - localAnchorY * Math.sin(anguloVisualRad);
    const deltaY = localAnchorX * Math.sin(anguloVisualRad) + localAnchorY * Math.cos(anguloVisualRad);
    
    this.x = palaVisual.x + deltaX;
    this.y = palaVisual.y + deltaY;
  }

  reclamar(pala) {
    if (this.state !== PARTICLE_STATE.RECLAMABLE) return;
    
    // Restaurar propiedades visuales y físicas
    this.setStrokeStyle(5, 0xffffff); // Color de borde normal
    if (this.body) {
      this.body.enable = true;
      this.body.setImmovable(false);
    }

    this.pegar(pala);
    this.setDebugVisibility(this.scene.physics.world.drawDebug);
  }

  // --- Métodos para la nueva lógica ---

  update() {
    // Mantiene el texto del contador sobre la partícula SIEMPRE
    this.hitCountText.setPosition(this.x, this.y);
    this.hitCountText.setDepth(9999); 
    // Aseguramos que el texto refleje el conteo
    this.hitCountText.setText(this.hitCount);
    
    // Actualizar estado visual según la carga
    const chargeState = CHARGE_STATES[this.hitCount];
    if (chargeState) {
      // Actualizar color de relleno
      this.fillColor = chargeState.color;
      
      // Actualizar tamaño visual y físico
      const newRadius = this.baseRadius * chargeState.scale;
      
      // Guardar posición antes de cambiar radio para restaurarla después
      const currentX = this.x;
      const currentY = this.y;
      
      this.setRadius(newRadius);
      
      // Restaurar posición después de cambiar radius
      this.setPosition(currentX, currentY);
      
      // Actualizar el círculo del body sin mover
      if (this.body) {
        this.body.setCircle(newRadius);
        // Restaurar posición nuevamente después de cambiar el body circle
        this.setPosition(currentX, currentY);
      }
      
      // Actualizar velocidad si está en movimiento
      if (this.body.velocity.x !== 0 || this.body.velocity.y !== 0) {
        const currentVel = new Phaser.Math.Vector2(this.body.velocity.x, this.body.velocity.y);
        const speed = currentVel.length();
        const baseSpeed = this.config.VelocidadParticula;
        const targetSpeed = baseSpeed * chargeState.speedMultiplier;
        currentVel.normalize().scale(targetSpeed);
        this.body.setVelocity(currentVel.x, currentVel.y);
      }
    }
  }

  setLastPlayerHit(playerKey, color) {
    // Si hay un escudo activo, solo permitimos que el dueño del escudo controle la partícula
    if (this.escudoActivo) {
      // Mantener el último jugador que tocó como el dueño del escudo
      this.lastPlayerHit = this.escudoOwner;
      return; // No cambiar el color cuando hay escudo activo
    }

    this.lastPlayerHit = playerKey;
    this.setStrokeStyle(5, color);
    // Usamos el color hexadecimal para el texto también
    this.hitCountText.setColor(`#${color.toString(16).padStart(6, '0')}`);
  }

  /**
   * Comprueba si la partícula puede registrar un nuevo hit desde `playerKey` según cooldown.
   * @param {string} playerKey 'player1'|'player2'
   * @param {number} now timestamp en ms (ej: this.scene.time.now)
   */
  canAcceptHit(playerKey, now) {
    if (!playerKey) return true;
    const last = this._lastHitTime[playerKey] || 0;
    return (now - last) >= this.HIT_COOLDOWN_MS;
  }

  /**
   * Registra el timestamp del último hit para `playerKey`.
   * @param {string} playerKey
   * @param {number} now timestamp en ms
   */
  recordHitTime(playerKey, now) {
    if (!playerKey) return;
    this._lastHitTime[playerKey] = now;
  }

  incrementHitCount() {
    // Incrementamos el contador hasta el límite máximo del modo actual
    if (this.hitCount < this.MAX_HITS) {
        this.hitCount++;
        this.hitCountText.setText(this.hitCount);
    }
    // Retornamos el nuevo conteo para que la clase Game pueda tomar decisiones
    return this.hitCount;
  }
  
  decrementHitCount() {
    // Nueva función para descargar la partícula
    if (this.hitCount > 0) {
      this.hitCount--;
    }
    this.hitCountText.setText(this.hitCount);
    return this.hitCount;
  }

  getHitCount() {
    return this.hitCount;
  }
  
  setDebugVisibility(isVisible) {
    // Controla la visibilidad del texto basado en el estado de debug
    this.hitCountText.setVisible(isVisible);
  }

  destroy(fromScene) {
    // Asegurarse de que el texto también se destruya
    if (this.hitCountText) this.hitCountText.destroy();
    super.destroy(fromScene);
  }
}