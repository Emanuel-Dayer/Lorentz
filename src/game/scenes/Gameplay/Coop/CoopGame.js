import { BaseGameScene } from "../BaseGameScene/BaseGameScene";

/*
  Escena CoopGame: Modo Cooperativo
  Hereda de BaseGameScene y sobrescribe métodos específicos para el modo COOP
*/

export class CoopGame extends BaseGameScene {
  constructor() {
    super("CoopGame");
  }

  init({ jugadorParaServir, user }) {
    super.init({ jugadorParaServir });
    this.currentUser = user;
    // Escuchar pérdida de conexión para marcar usuario como offline y usar localStorage
    if (typeof window !== 'undefined') {
      window.addEventListener('offline', () => {
        if (this.currentUser && !this.currentUser.isLocalOffline) {
          const baseName = this.currentUser.displayName || this.currentUser.email || `Anon${(this.currentUser.uid || '').toString().substring(0,6)}`;
          const offlineName = baseName.endsWith('-Offline') ? baseName : `${baseName}-Offline`;
          this.currentUser.displayName = offlineName;
          this.currentUser.isLocalOffline = true;
          const localUserKey = `localUserData:${this.currentUser.uid || 'anon'}`;
          const existing = JSON.parse(localStorage.getItem(localUserKey) || '{}');
          existing.displayName = offlineName;
          localStorage.setItem(localUserKey, JSON.stringify(existing));
        }
      });
    }
  }

  initializeScores() {
    this.puntuacionTotal = 0;
  }

  updateUIDisplay() {
    this.uiManager.updateScores(this.puntuacionTotal);
  }

  handleHitParticle(particula) {
    particula.incrementHitCount();
    this.puntuacionTotal += 100;
    this.uiManager.updateScores(this.puntuacionTotal);

    if (particula.getHitCount() >= 9) {
      if (this.lineaControl) this.lineaControl.removeLinea(particula);
      this.particleFactory.release(particula);
      this.sounds.DestroyingParticle.play();
      this.uiManager.updateScores(this.puntuacionTotal);
      
      if (this.particulas.countActive(true) === 0) {
        this.MostrarMensajeVictoria();
      }
      
      return true; // Partícula fue destruida
    }
    
    return false; // Partícula sigue viva
  }

  handleBlockBreak() {
    this.puntuacionTotal += 50;
    this.uiManager.updateScores(this.puntuacionTotal);
  }

  ComprobarPunto(particula) {
    if (this.juegoFinalizado) return;

    const gameWidth = this.sys.game.config.width;
    const gameHeight = this.sys.game.config.height;
    const bound = 50;

    let outOfBounds = false;

    if (particula.x < -bound || particula.x > gameWidth + bound) {
      if (particula.escudoActivo) {
        particula.escudoActivo = false;
        if (particula.halo) particula.halo.destroy();
        particula.body.setVelocityX(particula.x < -bound ? this.VelocidadParticula : -this.VelocidadParticula);
        this.sounds.ParticulaRebota?.play();
        return;
      }
      outOfBounds = true;
    }

    if (particula.y < -bound || particula.y > gameHeight + bound) {
      outOfBounds = true;
    }

    if (outOfBounds) {
    if (this.lineaControl) this.lineaControl.removeLinea(particula);
    this.particleFactory.release(particula);
      this.uiManager.updateScores(this.puntuacionTotal);

      if (this.particulas.countActive(true) === 0) {
        this.MostrarMensajeVictoria();
      }
    }
  }

  handleBarrierHit(particula) {
    if (!particula.active || this.juegoFinalizado) return;

    const hitCount = particula.getHitCount();

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

    if (hitCount === 5) {
      this.puntuacionTotal += 1000;
    } else if (hitCount >= 6 && hitCount <= 8) {
      this.puntuacionTotal += 500;
    }

    this.uiManager.updateScores(this.puntuacionTotal);
    this.sounds.TouchingStabalizer2.play();

    if (this.lineaControl) this.lineaControl.removeLinea(particula);
    this.particleFactory.release(particula);

    if (this.particulas.countActive(true) === 0) {
      this.MostrarMensajeVictoria();
    }
  }

  handlePowerUpPickup(jugador) {
    this.puntuacionTotal += 20;
    this.uiManager.updateScores(this.puntuacionTotal);
  }

  ResetParticulaParaServir(jugador) {
    this._resetParticulasYTexto();

    for (let i = 0; i < 3; i++) {
      const particula1 = this.crearNuevaParticula(0, 0);
      if (particula1) {
        particula1.pegar(this.pala1);
        particula1.palaPegada = 1;
        // Actualizar posición inmediatamente para evitar que aparezca en (0,0)
        particula1.actualizarPosicionPegada(this.pala1, i);
      }

      const particula2 = this.crearNuevaParticula(0, 0);
      if (particula2) {
        particula2.pegar(this.pala2);
        particula2.palaPegada = 2;
        // Actualizar posición inmediatamente para evitar que aparezca en (0,0)
        particula2.actualizarPosicionPegada(this.pala2, i);
      }
    }
  }

  async MostrarMensajeVictoria() {
    this.cleanupForVictory();

    // Guardar score en Firebase
    if (this.currentUser) {
      try {
        await this.saveScore();
      } catch (error) {
        console.error('Error guardando score:', error);
      }
    }

    this.scene.start('RslGameResult', {
      modo: 'COOP',
      puntuacion: this.puntuacionTotal
    });
  }

  async saveScore() {
    try {
      // Si estamos en modo local-offline o no hay conexión, guardar en localStorage
      const offline = typeof navigator !== 'undefined' && !navigator.onLine;
      const isLocalOffline = this.currentUser?.isLocalOffline || false;

      // Determinar el nombre del usuario
      let userName = null;
      try {
        if (!isLocalOffline && !offline) {
          const userData = await this.firebase.loadGameData(this.currentUser.uid);
          if (userData && userData.displayName) userName = userData.displayName;
        }
      } catch (e) {
        // ignore, we'll fallback to other name sources
      }

      if (!userName) {
        if (this.currentUser?.displayName) userName = this.currentUser.displayName;
        else if (this.currentUser?.email) userName = this.currentUser.email;
        else userName = `Anon${(this.currentUser?.uid || '').toString().substring(0, 6)}`;
      }

      // Si estamos offline o modo Local-Offline, guardar localmente
      if (offline || isLocalOffline) {
        const localKey = 'localHighScores';
        const stored = JSON.parse(localStorage.getItem(localKey) || '[]');
        const nameWithOffline = userName.endsWith('-Offline') ? userName : `${userName}-Offline`;
          // ownerLocalId identifica el dispositivo/cliente que creó esta entrada local
          let ownerLocalId = localStorage.getItem('localClientId');
          if (!ownerLocalId) {
            ownerLocalId = `lc-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
            localStorage.setItem('localClientId', ownerLocalId);
          }
          stored.push({ name: nameWithOffline, score: this.puntuacionTotal, createdAt: new Date().toISOString(), uid: this.currentUser?.uid || null, isLocal: true, ownerLocalId });
        localStorage.setItem(localKey, JSON.stringify(stored));
        // También actualizar datos de usuario local para coopScore
        const localUserKey = `localUserData:${this.currentUser?.uid || 'anon'}`;
        const existing = JSON.parse(localStorage.getItem(localUserKey) || '{}');
        existing.displayName = nameWithOffline;
        existing.coopScore = Math.max(existing.coopScore || 0, this.puntuacionTotal);
        existing.lastCoopScore = this.puntuacionTotal;
        existing.lastCoopDate = new Date().toISOString();
        localStorage.setItem(localUserKey, JSON.stringify(existing));
        return;
      }

      // Guardar el score en la tabla high-scores remoto (incluir uid si existe)
      await this.firebase.addHighScore(userName, this.puntuacionTotal, this.currentUser?.uid);

      // Actualizar el mejor score cooperativo del usuario
      const userData = await this.firebase.loadGameData(this.currentUser.uid);
      const updatedData = {
        ...userData,
        displayName: userName,
        coopScore: Math.max(userData?.coopScore || 0, this.puntuacionTotal),
        lastCoopScore: this.puntuacionTotal,
        lastCoopDate: new Date()
      };

      await this.firebase.saveGameData(this.currentUser.uid, updatedData);
    } catch (error) {
      console.error('Error en saveScore:', error);
      throw error;
    }
  }
}