import { Scene } from "phaser";
import { Pala } from "./Pala";

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
    super(scene, x, y, radius, 0, 360, false, 0x000000, 1);
    this.setStrokeStyle(5, 0xffffff);

    // Añade este objeto a la escena y al sistema de físicas
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.config = config;
    this.isPegada = false;
    this.velocidadVerticalPegada = 0;

    // Configuración del cuerpo físico
    this.body.setCircle(radius);
    this.body.setBounce(1, 1);
    this.body.setCollideWorldBounds(true);
  }

  /**
   * Lanza la partícula desde la pala.
   * @param {Pala} palaActiva La pala desde la que se lanza.
   * @param {number} jugadorParaServir El jugador que lanza (1 o 2).
   */
  lanzar(palaActiva, jugadorParaServir) {
    if (!this.isPegada) return;

    this.isPegada = false;
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
    this.scene.sounds.ParticulaRebota.play();
  }

  /**
   * Pega la partícula a una pala para el servicio.
   * @param {Pala} palaActiva La pala a la que se pega.
   */
  pegar(palaActiva) {
    this.isPegada = true;
    this.body.setVelocity(0, 0);
    this.velocidadVerticalPegada = 0;
    this.actualizarPosicionPegada(palaActiva); // Posiciona la bola inmediatamente
  }

  /**
   * Actualiza la posición de la partícula cuando está pegada a una pala.
   * @param {Pala} palaActiva La pala que está siguiendo.
   */
  actualizarPosicionPegada(palaActiva) {
    if (!this.isPegada) return;

    const palaVisual = palaActiva.getVisualObject();
    
    // Simula un efecto de resorte/gravedad hacia el centro de la pala
    const atraccionHaciaCentroPala = (palaVisual.y - this.y) * 0.05;
    const friccion = this.velocidadVerticalPegada * 0.2;
    this.velocidadVerticalPegada += atraccionHaciaCentroPala - friccion;

    // Limita el movimiento vertical de la particula a lo largo de la pala
    const limitY = palaVisual.height / 2 - this.radius - 10;
    this.velocidadVerticalPegada = Phaser.Math.Clamp(this.velocidadVerticalPegada, -limitY, limitY);

    // Calcula la posición relativa a la pala, teniendo en cuenta la rotación
    const offsetHorizontal = palaVisual.width / 2 + this.radius + 30;
    const dirFactor = palaActiva.isP1 ? 1 : -1;
    const localAnchorX = offsetHorizontal * dirFactor;
    const localAnchorY = this.velocidadVerticalPegada;
    
    const anguloVisualRad = palaVisual.angle * Phaser.Math.DEG_TO_RAD;
    const deltaX = localAnchorX * Math.cos(anguloVisualRad) - localAnchorY * Math.sin(anguloVisualRad);
    const deltaY = localAnchorX * Math.sin(anguloVisualRad) + localAnchorY * Math.cos(anguloVisualRad);
    
    this.x = palaVisual.x + deltaX;
    this.y = palaVisual.y + deltaY;
  }
}