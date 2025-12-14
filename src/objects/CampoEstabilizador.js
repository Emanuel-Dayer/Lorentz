import { Physics } from "phaser";

export default class CampoEstabilizador {
  /**
   * @param {Phaser.Scene} scene La escena de Phaser (Game).
   * @param {Phaser.GameObjects.Group} particulas El grupo de partículas.
   * @param {UIManager} uiManager El gestor de la interfaz.
   */
  constructor(scene, particulas, uiManager) {
    this.scene = scene;
    this.particulas = particulas;
    this.uiManager = uiManager;
    this.hitCount = 0;

    // Línea energética en la parte inferior
    this.barrier = scene.add.rectangle(
      scene.scale.width / 2,
      scene.scale.height - 42,
      scene.scale.width,
      20,
      0xffffff
    ).setDepth(1);
    scene.physics.add.existing(this.barrier, true);

    const blockWidth = 120;
    const blockHeight = 120;
    const offsetY = scene.scale.height - 40; // un poco más arriba que la barrera

    // Bloque izquierdo
    this.leftBlock = scene.add.rectangle(
      0 + blockWidth / 2,
      offsetY,
      blockWidth,
      blockHeight,
      0xffffff
    ).setDepth(0);
    scene.physics.add.existing(this.leftBlock, true);

    // Bloque derecho
    this.rightBlock = scene.add.rectangle(
      scene.scale.width - blockWidth / 2,
      offsetY,
      blockWidth,
      blockHeight,
      0xffffff
    ).setDepth(0);
    scene.physics.add.existing(this.rightBlock, true)

    // Colisión con los bloques de esquina (rebotan)
    scene.physics.add.collider(this.particulas, this.leftBlock);
    scene.physics.add.collider(this.particulas, this.rightBlock);

    // Colisión con la barrera inferior (dispara la lógica especial)
    scene.physics.add.collider(this.particulas, this.barrier, (particula, barrier) => {
      // Evitar múltiples colisiones en el mismo frame
      const now = scene.time.now;
      if (particula._lastBarrierHit && now - particula._lastBarrierHit < 100) {
        return;
      }
      particula._lastBarrierHit = now;

      // Si tiene escudo, simplemente rebota y pierde el escudo
      if (particula.escudoActivo) {
        if (particula.halo) {
          particula.halo.destroy();
          particula.halo = null;
        }
        particula.escudoActivo = false;
        particula.escudoColor = null;
        particula.escudoOwner = null;
        return;
      }

      // Solo manejamos la colisión si la partícula está en estado NORMAL
      if (particula.state === 'normal') {
        this.scene.events.emit('particleHitBarrier', particula);
      }
    }, null, this);
  }

}