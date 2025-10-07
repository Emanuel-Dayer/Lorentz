import { Physics } from "phaser";

export default class CampoEstabilizador {
  constructor(scene, Particula, uiManager) {
    this.scene = scene;
    this.Particula = Particula;
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

    scene.physics.add.collider(Particula, this.leftBlock);
    scene.physics.add.collider(Particula, this.rightBlock);

    // Colisión con la barrera energética
    scene.physics.add.collider(Particula, this.barrier, () => {
      if (this.hitCount >= 5) {
        console.log('Bola no es destruida');
      } else {
        Particula.destroy();
        console.log('Bola es destruida');
      }
    });
}

  registerHit() {
    this.hitCount++;
    this.uiManager.updateHitCount(this.hitCount);
  }
}