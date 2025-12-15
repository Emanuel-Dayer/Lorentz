import BasePowerUp from "./BasePowerUp";

export default class Escudospowerup extends BasePowerUp {
  constructor(scene, x, y) {
    super(scene, x, y, 'Escudo', 'escudo', 0);

    this.activationDelayMs = 2000;
  }

onCollected(jugador, targetParticula) {
  if (!this.isActive()) {
    return;
  }

  if (this.collected) return;
  this.collected = true;

  // Preferir la partícula concreta pasada por el handler de colisión
  let particula = targetParticula && targetParticula.active ? targetParticula : null;
  if (!particula) {
    particula = this.scene.particulas.getChildren().find(p => p.active && p.lastPlayerHit === jugador);
  }

    if (particula) {
    if (particula.escudoActivo) {
      // Ya tiene escudo, no aplicar otro
      this.deactivateForPool();
      return;
    }

    // Establecer el escudo y su dueño
    particula.escudoActivo = true;
    particula.escudoColor = (jugador === 'player1') ? 0x0000FF : 0xFF0000;
    particula.escudoOwner = jugador;
    particula.lastPlayerHit = jugador; // Forzar el último toque al dueño del escudo

    // Crear el halo visual
    const halo = this.scene.add.circle(particula.x, particula.y, 40, particula.escudoColor, 0.3);
    halo.setDepth(5);
    particula.halo = halo;

    // Actualizar la posición del halo junto con la partícula
    particula.update = (function (originalUpdate) {
      return function () {
        originalUpdate.call(this);
        if (this.halo && this.active) {
          this.halo.setPosition(this.x, this.y);
        }
      };
    })(particula.update);


    // Asegurar limpieza del efecto si la partícula se destruye (al llegar a los toques maximos)
    particula.once('destroy', function() {
      if (halo && halo.active) {
        halo.destroy();
        }
      });
  }

    this.deactivateForPool();
}
}