import { BaseGameScene } from "./BaseGameScene";

/*
  Escena Game: Modo Versus (1v1)
  Hereda de BaseGameScene y sobrescribe métodos específicos para el modo VS
*/

export class VersusGame extends BaseGameScene {
  constructor() {
    super("VersusGame");
  }

  initializeScores() {
    this.puntuacionP1 = 0;
    this.puntuacionP2 = 0;
    this.PUNTOS_PARA_GANAR = 5;
  }

  updateUIDisplay() {
    this.uiManager.updateScores(this.puntuacionP1, this.puntuacionP2);
  }

  handleHitParticle(particula) {
    particula.incrementHitCount();
  }

  ComprobarPunto(particula) {
    if (this.juegoFinalizado) return;

    const gameWidth = this.sys.game.config.width;
    const gameHeight = this.sys.game.config.height;
    const bound = 50;

    let scored = false;
    let outOfBounds = false;

    if (particula.x < -bound) {
      if (particula.escudoActivo && particula.lastPlayerHit === 'player2') {
        particula.escudoActivo = false;
        if (particula.halo) particula.halo.destroy();
        particula.body.setVelocityX(this.VelocidadParticula);
        this.sounds.ParticulaRebota?.play();
        return;
      }

      this.puntuacionP2++;
      this.jugadorParaServir = 1;
      scored = true;

    } else if (particula.x > gameWidth + bound) {
      if (particula.escudoActivo && particula.lastPlayerHit === 'player1') {
        particula.escudoActivo = false;
        if (particula.halo) particula.halo.destroy();
        particula.body.setVelocityX(-this.VelocidadParticula);
        this.sounds.ParticulaRebota?.play();
        return;
      }

      this.puntuacionP1++;
      this.jugadorParaServir = 2;
      scored = true;
    }

    if (particula.y < -bound || particula.y > gameHeight + bound) {
      outOfBounds = true;
    }

    if (scored || outOfBounds) {
      if (this.lineaControl) this.lineaControl.removeLinea(particula);
      particula.destroy();

      if (scored) {
        this.uiManager.updateScores(this.puntuacionP1, this.puntuacionP2);

        if (this.puntuacionP1 >= this.PUNTOS_PARA_GANAR) {
          this.MostrarMensajeVictoria(1);
        } else if (this.puntuacionP2 >= this.PUNTOS_PARA_GANAR) {
          this.MostrarMensajeVictoria(2);
        } else {
          if (this.particulas.countActive(true) === 0) {
            this.ResetParticulaParaServir(this.jugadorParaServir);
          }
        }
      } else if (outOfBounds) {
        if (this.particulas.countActive(true) === 0) {
          this.ResetParticulaParaServir(this.jugadorParaServir);
        }
      }
    }
  }

  handleBarrierHit(particula) {
    if (!particula.active || this.juegoFinalizado) return;

    const lastHitPlayerKey = particula.lastPlayerHit;

    if (!lastHitPlayerKey) {
      if (particula.escudoActivo) {
        particula.escudoActivo = false;
        if (particula.halo) {
          particula.halo.destroy();
          particula.halo = null;
        }

        particula.body.setVelocityY(-Math.max(600, this.VelocidadParticula * 0.5));
        if (this.lineaControl) this.lineaControl.removeLinea(particula);
        this.sounds.ParticulaRebota?.play();
        return;
      }

      particula.destroy();
      if (this.particulas.countActive(true) === 0) {
        this.ResetParticulaParaServir(this.jugadorParaServir);
      }
      return;
    }

    if (particula.escudoActivo) {
      particula.escudoActivo = false;
      if (particula.halo) {
        particula.halo.destroy();
        particula.halo = null;
      }

      particula.body.setVelocityY(-Math.max(600, this.VelocidadParticula * 0.5));
      if (this.lineaControl) this.lineaControl.removeLinea(particula);
      this.sounds.ParticulaRebota?.play();

      return;
    }

    const lastHitPlayer = (lastHitPlayerKey === 'player1') ? 1 : 2;
    const opponentPlayer = (lastHitPlayer === 1) ? 2 : 1;
    const isCharged = particula.getHitCount() >= 5;

    if (isCharged) {
      particula.body.setVelocityY(-Math.max(600, this.VelocidadParticula * 0.5));
      if (this.lineaControl) this.lineaControl.removeLinea(particula);

      if (lastHitPlayer === 1 && this.puntuacionP1 > 0) this.puntuacionP1--;
      if (lastHitPlayer === 2 && this.puntuacionP2 > 0) this.puntuacionP2--;

      particula.decrementHitCount();
      this.sounds.TouchingStabalizer2.play();

    } else {
      if (this.lineaControl) this.lineaControl.removeLinea(particula);
      particula.destroy();

      if (opponentPlayer === 1) this.puntuacionP1++;
      else this.puntuacionP2++;

      if (lastHitPlayer === 1 && this.puntuacionP1 > 0) this.puntuacionP1--;
      if (lastHitPlayer === 2 && this.puntuacionP2 > 0) this.puntuacionP2--;

      this.sounds.DestroyingParticle.play();
      this.jugadorParaServir = opponentPlayer;

      if (this.particulas.countActive(true) === 0) {
        this.ResetParticulaParaServir(this.jugadorParaServir);
      }
    }

    this.uiManager.updateScores(this.puntuacionP1, this.puntuacionP2);
    this.ComprobarVictoria(this.puntuacionP1, this.puntuacionP2);
  }

  ComprobarVictoria(p1Score, p2Score) {
    if (p1Score >= this.PUNTOS_PARA_GANAR) {
      this.MostrarMensajeVictoria(1);
    } else if (p2Score >= this.PUNTOS_PARA_GANAR) {
      this.MostrarMensajeVictoria(2);
    }
  }

  ResetParticulaParaServir(jugador) {
    this._resetParticulasYTexto();

    const palaActiva = (jugador === 1) ? this.pala1 : this.pala2;
    const particula = this.crearNuevaParticula(0, 0);
    if (particula) {
      particula.pegar(palaActiva);
      particula.palaPegada = jugador;
      // Actualizar posición inmediatamente para evitar que aparezca en (0,0)
      particula.actualizarPosicionPegada(palaActiva, 0);
    }
  }

  MostrarMensajeVictoria(jugadorGanador) {
    this.cleanupForVictory();

    this.scene.start('RslGameResult', {
      modo: 'VS',
      ganador: jugadorGanador
    });
  }
}
