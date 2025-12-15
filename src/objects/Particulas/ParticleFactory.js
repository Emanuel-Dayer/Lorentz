import { Particula, PARTICLE_STATE } from "./Particula.js";

/**
 * ParticleFactory
 * Encapsula un pool de partículas usando un Phaser Group.
 * Provee `spawn(x,y,state)` para obtener (o crear) una partícula y
 * `release(particle)` para devolverla al pool (desactivarla).
 */
export default class ParticleFactory {
  constructor(scene) {
    this.scene = scene;
    // Grupo que actuará como pool; `classType` permite que Phaser cree
    // instancias de `Particula` cuando sea necesario.
    this.group = scene.add.group({
      classType: Particula,
      runChildUpdate: true,
    });
  }

  getGroup() {
    return this.group;
  }

  /**
   * Obtiene una partícula del pool o crea una nueva si no hay inactivas.
   * `config` será pasado solo en la creación la primera vez; cuando se
   * reutiliza, re-inicializamos las propiedades relevantes.
   */
  spawn(x, y, state = PARTICLE_STATE.NORMAL) {
    const particulaConfig = {
      VelocidadParticula: this.scene.VelocidadParticula,
      VelocidadPala: this.scene.VelocidadPala,
      MAX_ROTATION_DEG: this.scene.MAX_ROTATION_DEG,
    };

    const radius = 20;
    
    // Obtener partícula del pool sin pasar parámetros (evita problemas de reposicionamiento)
    let p = this.group.getFirstDead();
    const isNewParticle = !p;
    
    if (!p) {
      // Si no hay partícula inactiva, crear una nueva
      p = new Particula(this.scene, x, y, radius, particulaConfig);
      this.group.add(p);
    }

    if (!p) return null;

    // Reactivar/normalizar la partícula para reutilización
    p.setActive(true);
    p.setVisible(true);
    
    // Restaurar propiedades visuales y físicas completamente de forma explícita
    p.setPosition(x, y);
    p.setRotation(0);
    p.setScale(1);
    
    if (p.body) {
      p.body.enable = true;
      p.body.setVelocity(0, 0);
    }

    // Solo restaurar el radio si es una partícula nueva
    // Para partículas reutilizadas, preservar el radio para evitar desplazamientos del body
    if (isNewParticle) {
      p.baseRadius = radius;
      try {
        p.setRadius(radius);
        if (p.body) {
          p.body.setCircle(radius);
        }
      } catch (e) {
        // ignore
      }
    }

    // Restaurar método `update` original del prototype para eliminar cualquier
    // override que pueda haber dejado un power-up (p. ej. hielo/escudo)
    if (Particula && Particula.prototype && Particula.prototype.update) {
      p.update = Particula.prototype.update;
    }

    // Limpiar estados que pueden haber sido mutados
    p.hitCount = 0;
    if (p.hitCountText) {
      p.hitCountText.setText(0);
      p.hitCountText.setPosition(x, y);  // Repositrlonar el texto a la posición correcta
      p.hitCountText.setVisible(this.scene.physics.world.drawDebug);
    }
    p.lastPlayerHit = null;
    p.escudoActivo = false;
    p.escudoColor = null;
    p.escudoOwner = null;
    if (p.halo && p.halo.destroy) {
      p.halo.destroy();
    }
    p.halo = null;

    p.velocidadVerticalPegada = 0;
    p.palaPegada = null;
    p.lineActive = false;
    p.lineTension = 0;
    p.lineCurvature = 0;
    p.lineTargetCurvature = 0;
    if (typeof p.disableLineControl === 'function') {
      p.disableLineControl();
    }

    // Reset cooldowns
    p._lastHitTime = { player1: 0, player2: 0 };

    // Restaurar visual física básica
    p.setStrokeStyle(5, 0xffffff);
    
    if (p.body && typeof p.body.setImmovable === 'function') {
      p.body.setImmovable(false);
    }

    p.state = state;
    p.setDebugVisibility(this.scene.physics.world.drawDebug);

    if (state === PARTICLE_STATE.RECLAMABLE) {
      this.scene.setupReclaimableParticle(p);
    }

    return p;
  }

  /**
   * Devuelve la partícula al pool sin destruirla físicamente.
   */
  release(particula) {
    if (!particula) return;

    // Limpiar efectos visuales ligados a la partícula
    if (particula.halo && particula.halo.destroy) {
      particula.halo.destroy();
      particula.halo = null;
    }
    // Limpiar iceEffect si está presente (del power-up de hielo)
    if (particula._iceEffect && particula._iceEffect.destroy) {
      particula._iceEffect.destroy();
      particula._iceEffect = null;
    }

    // Restaurar update original para eliminar closures que retengan referencias
    if (Particula && Particula.prototype && Particula.prototype.update) {
      particula.update = Particula.prototype.update;
    }

    // Remover listeners `destroy` u otros que puedan quedar pegados
    if (typeof particula.removeAllListeners === 'function') {
      try { particula.removeAllListeners('destroy'); } catch (e) {}
    }
    if (typeof particula.off === 'function') {
      try { particula.off('destroy'); } catch (e) {}
    }

    // Resetear estado interno
    particula.hitCount = 0;
    if (particula.hitCountText) {
      particula.hitCountText.setText(0);
      particula.hitCountText.setVisible(false);
    }
    particula.lastPlayerHit = null;
    particula.escudoActivo = false;
    particula.escudoColor = null;
    particula.escudoOwner = null;
    particula.velocidadVerticalPegada = 0;
    particula.palaPegada = null;
    particula.lineActive = false;
    particula.lineTension = 0;
    particula.lineCurvature = 0;
    particula.lineTargetCurvature = 0;
    particula._lastHitTime = { player1: 0, player2: 0 };

    // Detener físicas y dejar inactiva para reutilización
    try {
      particula.body.stop && particula.body.stop();
    } catch (e) {}
    if (particula.body) {
      particula.body.enable = false;
    }

    particula.setActive(false);
    particula.setVisible(false);
  }
}
