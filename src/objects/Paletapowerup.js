import Phaser from "phaser";

export default class PowerUpPaleta extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'Paletas');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Ajustar primero el hitbox al tamaño completo de la imagen
    this.body.setSize(this.width / 2, this.height / 2);
    // Luego aplicar la escala que afectará tanto al sprite como al hitbox
    this.setScale(0.25);
    this.setDepth(10);
    this.setVelocityY(100); // Velocidad de caída
    this.body.allowGravity = false;
    this.body.setCollideWorldBounds(false);
    this.setImmovable(true);

    this.collected = false;

    this.activationDelayMs = 2000; // o sea 2 segundos
    this.spawnTime = scene.time.now;
  }

  update() {
    // Si sale de la pantalla por abajo, destruir
    if (this.y > this.scene.sys.game.config.height + 50) {
      this.destroy();
    }
  }

onCollected(byPlayer) {
  const now = this.scene.time.now;
  if (now - this.spawnTime < this.activationDelayMs) {
    console.warn('PowerUpPaleta: aún no está activo');
    return;
  }

  if (this.collected) return;
  this.collected = true;

  const pala = (byPlayer === 'player1') ? this.scene.pala1 : this.scene.pala2;
  if (!pala) return;

  const visual = pala.getVisualObject();
  if (!visual || !visual.setScale) return;

  const originalCount = pala.getHitboxGroup().getChildren().length;

  const scene = this.scene; // ← capturás la escena antes de destruir

  // Escalado visual + expansión de hitboxes
  scene.tweens.add({
    targets: visual,
    scaleY: 1.5,
    duration: 2000,
    ease: 'Sine.easeInOut',
    onStart: () => pala.expandHitboxesGradualmente(4, 2000)
  });

  scene.sounds.Ball?.play();
  this.destroy(); // ← ahora es seguro

  // Reversión visual + eliminación de hitboxes extra
  scene.time.delayedCall(12000, () => {
    if (visual && visual.active) {
      scene.tweens.add({
        targets: visual,
        scaleY: 1,
        duration: 2000,
        ease: 'Sine.easeInOut',
        onStart: () => pala.retractHitboxesGradualmente(originalCount, 2000)
      });
    }
  });
}
}