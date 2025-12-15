import Phaser from "phaser";

/*
    Clase base para todos los power-ups del juego.
    Los subclases deben especificar:
    - assetKey: clave de la imagen del power-up
    - tipo: identificador del tipo (ej: 'hielo', 'caracol', 'paleta', 'escudo')
    - effectDuration: duración del efecto en ms (si aplica)
    - sobreescribir onCollected() para el comportamiento específico
 */
export default class BasePowerUp extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, assetKey, tipo, effectDuration = 0) {
    super(scene, x, y, assetKey);

    // Agregar a la escena y al sistema de físicas
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Configuración visual y física común
    this.body.setSize(this.width / 2, this.height / 2);
    this.setScale(0.25);
    this.setDepth(10);
    this.setVelocityY(100);
    this.body.allowGravity = false;
    this.body.setCollideWorldBounds(false);
    this.setImmovable(true);

    // Propiedades de control
    this.collected = false;
    this.tipo = tipo;
    this.activationDelayMs = 300; // Por defecto 300ms
    this.spawnTime = scene.time.now;
    this.effectDuration = effectDuration;
  }

  //destruir si sale de pantalla
  update() {
    if (this.y > this.scene.sys.game.config.height + 50) {
      // Desactivar para permitir reutilización vía PowerUpFactory
      this.deactivateForPool();
    }
  }

/*
   Verificar si el power-up está activo (pasó el delay)
   Las subclases pueden sobrescribir esto si necesitan otra lógica
*/
  isActive() {
    const now = this.scene.time.now;
    return now - this.spawnTime >= this.activationDelayMs;
  }

  /**
   * Método abstracto que debe ser sobrescrito por las subclases
   * Se llama cuando un jugador recoge el power-up
   * @param {string} jugador - 'player1' o 'player2'
   */

  onCollected(jugador) {
    // Sobrescribir en subclases
    this.deactivateForPool();
  }

  /**
   * Revive the power-up when reusing from a pool. Resetea flags y tiempos
   * para que el objeto vuelva a comportarse como recién creado.
   */
  reviveFromPool(x, y) {
    this.setPosition(x, y);
    this.setActive(true);
    this.setVisible(true);
    this.collected = false;
    this.spawnTime = this.scene.time.now;
    if (this.body) {
      this.body.enable = true;
      this.body.setVelocityY(100);
    }
  }

  /**
   * Desactiva el power-up para devolverlo al pool sin destruir.
   */
  deactivateForPool() {
    this.collected = true;
    this.setActive(false);
    this.setVisible(false);
    if (this.body) this.body.enable = false;
  }
}