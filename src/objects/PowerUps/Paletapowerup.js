import BasePowerUp from "./BasePowerUp";

export default class PowerUpPaleta extends BasePowerUp {
  constructor(scene, x, y) {
    super(scene, x, y, 'Paletas', 'paleta', 12000);

    this.activationDelayMs = 2000;
  }

onCollected(byPlayer) {
  if (!this.isActive()) {
    return;
  }

  if (this.collected) return;
  this.collected = true;

  const pala = (byPlayer === 'player1') ? this.scene.pala1 : this.scene.pala2;
  if (!pala) return;

  const visual = pala.getVisualObject();
  if (!visual || !visual.setScale) return;

  const originalCount = pala.getHitboxGroup().getChildren().length;

  const scene = this.scene; // capturár la escena antes de destruir

  // Escalado visual + expansión de hitboxes
  scene.tweens.add({
    targets: visual,
    scaleY: 1.5,
    duration: 2000,
    ease: 'Sine.easeInOut',
    onStart: () => pala.expandHitboxesGradualmente(4, 2000)
  });

  scene.sounds.Ball?.play();
  this.deactivateForPool();

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