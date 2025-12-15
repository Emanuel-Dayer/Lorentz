import PowerUpPaleta from "./Paletapowerup.js";
import Escudospowerup from "./Escudospowerup.js";
import Hielopowerup from "./Hielopowerup.js";
import Caracolpowerup from "./Caracolpowerup.js";

/**
 * PowerUpFactory
 * Mantiene pools separados por tipo de power-up. Al `spawn` intenta
 * reusar una instancia inactiva; si no hay, crea una nueva.
 */
export default class PowerUpFactory {
  constructor(scene) {
    this.scene = scene;
    this.pools = {
      paleta: scene.add.group({ classType: PowerUpPaleta, runChildUpdate: true }),
      escudo: scene.add.group({ classType: Escudospowerup, runChildUpdate: true }),
      hielo: scene.add.group({ classType: Hielopowerup, runChildUpdate: true }),
      caracol: scene.add.group({ classType: Caracolpowerup, runChildUpdate: true }),
    };
    // Grupo maestro para mantener compatibilidad con el código que consulta `this.powerUps`
    this.masterGroup = scene.add.group();
  }

  getGroup() {
    return this.masterGroup;
  }

  /**
   * Spawn de power-up: devuelve una instancia ya añadida a escena y al pool.
   */
  spawn(tipo, x, y) {
    if (!this.pools[tipo]) return null;

    const pool = this.pools[tipo];
    // Intentar obtener una instancia inactiva
    let pu = pool.getFirstDead();
    if (pu) {
      // Reactivar: cada power-up implementa `reviveFromPool` para reinicializar
      if (typeof pu.reviveFromPool === 'function') {
        pu.reviveFromPool(x, y);
      } else {
        pu.setPosition(x, y);
        pu.setActive(true).setVisible(true);
        if (pu.body) pu.body.enable = true;
      }
    } else {
      // Crear nueva instancia; el constructor ya añade el sprite y física
      switch (tipo) {
        case 'paleta':
          pu = new PowerUpPaleta(this.scene, x, y);
          break;
        case 'escudo':
          pu = new Escudospowerup(this.scene, x, y);
          break;
        case 'hielo':
          pu = new Hielopowerup(this.scene, x, y);
          break;
        case 'caracol':
          pu = new Caracolpowerup(this.scene, x, y);
          break;
      }
    }

    if (!pu) return null;

    // Asegurar que el power-up está en el grupo maestro para compatibilidad
    if (!this.masterGroup.contains(pu)) {
      this.masterGroup.add(pu);
    }

    // Asegurar que también está en su pool (Phaser lo hace al crear, pero
    // cuando reusamos manualmente puede no estar). Si no está, añadir.
    if (!pool.contains(pu)) {
      pool.add(pu);
    }

    return pu;
  }

  /**
   * Desactiva un power-up para que pueda reutilizarse.
   */
  release(powerUp) {
    if (!powerUp) return;
    powerUp.setActive(false);
    powerUp.setVisible(false);
    if (powerUp.body) powerUp.body.enable = false;
  }
}
