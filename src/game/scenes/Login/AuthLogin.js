import { Scene } from "phaser";
import InputSystem, { INPUT_ACTIONS } from "../../utils/InputSystem";

export class AuthLogin extends Scene {
  #selectedOption = 0; // 0: Google, 1: GitHub, 2: Anon
  #isAuthenticating = false;

  constructor() {
    super("AuthLogin");
    this.optionContainers = [];
    this.authOptions = [
      { key: "GoogleLogo", label: "Google" },
      { key: "githubLogo", label: "GitHub" },
      { key: "IncognitoLogo", label: "Anón" },
    ];

    this.inputSystem = null;
    this.processingOverlay = null;
    this.popupOverlay = null;
    this.authCheckInterval = null;
  }

  init() {
    // nothing for now
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(0x000000);

    this._setupAuthOptions();
    this._setupInputSystem();
    this._setupVisibilityListener();

    // highlight initial
    this.highlightOption(this.#selectedOption);
  }

  _setupAuthOptions() {
    const { width, height } = this.scale;
    const optionSize = 220;
    const spacing = optionSize + 120;
    const yPos = height / 2;
    const startX = width / 2 - spacing;

    // create containers horizontally
    this.optionContainers = [];
    this.authOptions.forEach((option, index) => {
      const xPos = startX + index * spacing;
      const container = this.add.container(xPos, yPos).setDepth(10);

      const logo = this.add
        .image(0, 0, option.key)
        .setOrigin(0.5)
        .setDisplaySize(optionSize, optionSize);

      // Border (similar al menú de idiomas)
      const border = this.add
        .rectangle(0, 0, optionSize + 20, optionSize + 20, 0x00ffff, 0)
        .setStrokeStyle(2, 0x00ffff)
        .setVisible(false);

      // Background con estilo similar al menú de idiomas
      const background = this.add
        .rectangle(0, 0, optionSize, optionSize, 0x666666, 0.3);

      // Relleno visual con estática que se anima en hover
      const staticFill = this.add
        .rectangle(0, 0, optionSize - 4, optionSize - 4, 0x44d27e, 0)
        .setStrokeStyle(1, 0x44d27e, 0.5);

      container.add([background, border, logo, staticFill]);
      container.border = border;
      container.background = background;
      container.staticFill = staticFill;
      container.isSelected = false;
      container.logo = logo;

      // Hacer interactivo solo la imagen (logo)
      logo.setInteractive();
      logo.on("pointerdown", () => {
        if (!this.#isAuthenticating) {
          this.#selectedOption = index;
          this.selectOption(index);
        }
      });

      logo.on("pointerover", () => {
        if (!this.#isAuthenticating) {
          this.#selectedOption = index;
          this.highlightOption(index);
        }
      });

      logo.on("pointerout", () => {
        if (!this.#isAuthenticating) {
          this.highlightOption(this.#selectedOption);
        }
      });

      this.optionContainers.push(container);
    });
  }

  _setupInputSystem() {
    const keyMap1 = {
      [INPUT_ACTIONS.UP]: "W",
      [INPUT_ACTIONS.DOWN]: "S",
      [INPUT_ACTIONS.LEFT]: "A",
      [INPUT_ACTIONS.RIGHT]: "D",
      [INPUT_ACTIONS.NORTH]: "SPACE",
    };

    const keyMap2 = {
      [INPUT_ACTIONS.UP]: "UP",
      [INPUT_ACTIONS.DOWN]: "DOWN",
      [INPUT_ACTIONS.LEFT]: "LEFT",
      [INPUT_ACTIONS.RIGHT]: "RIGHT",
      [INPUT_ACTIONS.NORTH]: "NUMPAD_ZERO",
    };

    this.inputSystem = new InputSystem(this, keyMap1, keyMap2);
  }

  _setupVisibilityListener() {
    // Escuchar cuando el popup se cierra (ventana vuelve a estar visible)
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && this.#isAuthenticating) {
        this._checkAuthStatus();
      }
    });

    // También escuchar focus event como alternativa
    window.addEventListener("focus", () => {
      if (this.#isAuthenticating) {
        this._checkAuthStatus();
      }
    });
  }

  _checkAuthStatus() {
    // Verificar cada 200ms si la autenticación se completó
    if (this.authCheckInterval) return;

    this.authCheckInterval = setInterval(async () => {
      try {
        const currentUser = this.firebase.getUser();
        if (currentUser) {
          // Si hay un usuario autenticado, significa que el popup se cerró y se autenticó
          clearInterval(this.authCheckInterval);
          this.authCheckInterval = null;
          // Dejar que el flujo normal continúe (el catch en selectOption manejará el próximo paso)
        }
      } catch (e) {
        // Si hay error, el popup fue cerrado sin autenticación exitosa
        clearInterval(this.authCheckInterval);
        this.authCheckInterval = null;
        this._onPopupClosed();
      }
    }, 200);

    // Seguridad: si después de 15 segundos aún no se detectó, asumir que se cerró
    this.time.delayedCall(15000, () => {
      if (this.authCheckInterval) {
        clearInterval(this.authCheckInterval);
        this.authCheckInterval = null;
        if (this.#isAuthenticating) {
          this._onPopupClosed();
        }
      }
    });
  }

  update() {
    if (!this.inputSystem) return;

    this.inputSystem.update();

    const leftP1 = this.inputSystem.isJustPressed(INPUT_ACTIONS.LEFT, "player1");
    const rightP1 = this.inputSystem.isJustPressed(INPUT_ACTIONS.RIGHT, "player1");
    const leftP2 = this.inputSystem.isJustPressed(INPUT_ACTIONS.LEFT, "player2");
    const rightP2 = this.inputSystem.isJustPressed(INPUT_ACTIONS.RIGHT, "player2");
    const northP1 = this.inputSystem.isJustPressed(INPUT_ACTIONS.NORTH, "player1");
    const northP2 = this.inputSystem.isJustPressed(INPUT_ACTIONS.NORTH, "player2");

    if (leftP1 || leftP2) {
      this.navigateOptions(-1);
    } else if (rightP1 || rightP2) {
      this.navigateOptions(1);
    }

    if (northP1 || northP2) {
      this.highlightOption(this.#selectedOption);
      this.selectOption(this.#selectedOption);
    }

    this.inputSystem.lateUpdate();
  }

  navigateOptions(direction) {
    this.#selectedOption = (this.#selectedOption + direction + this.authOptions.length) % this.authOptions.length;
    this.highlightOption(this.#selectedOption);
  }

  highlightOption(index) {
    this.optionContainers.forEach((c, i) => {
      if (i === index) {
        // Mostrar border y cambiar background
        c.border.setVisible(true);
        c.background.setFillStyle(0x44d27e);
        c.background.setAlpha(0.5);
        c.staticFill.setAlpha(0.6);

        // Animación del relleno estático (parpadeo del relleno)
        if (c.staticTween) c.staticTween.stop();
        c.staticTween = this.tweens.add({
          targets: c.staticFill,
          alpha: { from: 0.3, to: 0.8 },
          duration: 300,
          yoyo: true,
          repeat: 2,
        });

        c.setScale(1.1);
      } else {
        // Ocultar border y restaurar background
        c.border.setVisible(false);
        c.background.setFillStyle(0x666666);
        c.background.setAlpha(0.3);
        c.staticFill.setAlpha(0);

        c.setScale(1);
      }
    });
  }

  async selectOption(index) {
    // Permitir iniciar una nueva autenticación incluso si ya hay una en curso
    this.#isAuthenticating = true;

    // Mostrar círculito parpadeante (no deshabilitamos la selección según tu petición)
    this._showProcessingOverlay(index);
    // Crear overlay detector (permanece para detectar cierre), pero no bloquea interacción
    this._setupPopupCloseDetection();

    // Animar el parpadeo de la opción seleccionada
    const selectedContainer = this.optionContainers[index];
    selectedContainer.setScale(1.1);

    this.tweens.add({
      targets: selectedContainer,
      scale: { from: 1.1, to: 1.15 },
      alpha: { from: 1, to: 0.7 },
      duration: 150,
      yoyo: true,
      repeat: 3,
      onComplete: async () => {
        // Si no hay conexión, evitar llamar a Firebase y fallback inmediato
        const offline = typeof navigator !== 'undefined' && !navigator.onLine;
        if (offline) {
          this._hideProcessingOverlay();
          const localUser = {
            uid: `local-${Date.now()}`,
            displayName: 'Local-Offline',
            isLocalOffline: true,
          };
          this.#isAuthenticating = false;
          this.scene.start("Menu", { language: "es", user: localUser });
          return;
        }

        try {
          let user = null;
          switch (index) {
            case 0:
              user = await this.firebase.signInWithGoogle();
              await this.ensureUserData(user);
              break;
            case 1:
              user = await this.firebase.signInWithGithub();
              await this.ensureUserData(user);
              break;
            case 2:
              user = await this.signInAnonymously();
              break;
          }

          const currentUser = this.firebase.getUser();
          // Ocultar overlay y continuar al menú
          this._hideProcessingOverlay();
          this.scene.start("Menu", { language: "es", user: currentUser });
        } catch (err) {
          // Solo loguear errores si hay conexión; si no, ya manejamos fallback arriba
          const stillOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
          if (stillOnline) console.error("Error de autenticación:", err);
          this._hideProcessingOverlay();
          this.#isAuthenticating = false;
          this.optionContainers.forEach((c) => c.logo.setInteractive());
          this.highlightOption(this.#selectedOption);
        }
      },
    });
  }

  // Removed explicit cleanup of external auth windows per request

  async ensureUserData(user) {
    try {
      const existingData = await this.firebase.loadGameData(user.uid);
      if (!existingData) {
        // Prioridad: githubUsername > displayName > email (sin dominio) > "Usuario"
        let displayName = user.githubUsername || user.displayName;
        
        // Si no hay githubUsername ni displayName, extraer del email
        if (!displayName && user.email) {
          displayName = user.email.split('@')[0];
        }
        
        // Si aún así está vacío, usar fallback
        if (!displayName) {
          displayName = "Usuario";
        }

        await this.firebase.saveGameData(user.uid, {
          displayName,
          isAnonymous: false,
          coopScore: 0,
          createdAt: new Date(),
        });
      }
    } catch (e) {
      console.error("Error asegurando datos del usuario:", e);
    }
  }

  async signInAnonymously() {
    // Delegar la obtención del siguiente número anónimo al plugin para evitar depender de los highscores
    let nextAnonNumber = -1;
    try {
      nextAnonNumber = await this.firebase.getNextAnonNumber();
    } catch (e) {
      nextAnonNumber = -1;
    }

    const user = await this.firebase.signInAnonymously();

    // Si el plugin devolvió un número válido (>0) usamos Anon{n}, sino generamos un fallback localmente
    let anonName;
    if (typeof nextAnonNumber === 'number' && nextAnonNumber > 0) {
      anonName = `Anon${nextAnonNumber}`;
    } else {
      // Fallback: usar un id local único por cliente (localClientId) o UID corto para evitar colisiones
      let localClientId = null;
      try {
        localClientId = localStorage.getItem('localClientId');
        if (!localClientId) {
          localClientId = `lc-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
          localStorage.setItem('localClientId', localClientId);
        }
      } catch (e) {
        localClientId = null;
      }

      const uidPart = (user && user.uid) ? user.uid.toString().substring(0, 6) : '';
      const clientPart = localClientId ? localClientId.toString().slice(-4) : '';
      const timePart = Date.now().toString().slice(-4);
      anonName = `Anon${clientPart || uidPart || timePart}`;
    }

    await this.firebase.saveGameData(user.uid, {
      displayName: anonName,
      isAnonymous: true,
      coopScore: 0,
      createdAt: new Date(),
    });

    return user;
  }

  async getNextAnonNumber() {
    // Mantener método por compatibilidad; delega al plugin si está disponible
    try {
      if (this.firebase && typeof this.firebase.getNextAnonNumber === 'function') {
        return await this.firebase.getNextAnonNumber();
      }
    } catch (e) {
      console.warn('Fallo delegando getNextAnonNumber al plugin:', e?.message || e);
    }
    return 1;
  }

  _showProcessingOverlay() {
    if (this.processingOverlay) return;

    const selectedContainer = this.optionContainers[this.#selectedOption];
    const { x, y } = selectedContainer;

    // Círculo debajo de la imagen seleccionada
    const circle = this.add
      .circle(x, y + 200, 20, 0x00ffff)
      .setDepth(10000)
      .setAlpha(0.5);

    // Tween de parpadeo
    this.tweens.add({
      targets: circle,
      alpha: { from: 0.2, to: 1 },
      duration: 600,
      repeat: -1,
      yoyo: true,
    });

    this.processingOverlay = circle;
  }

  _hideProcessingOverlay() {
    if (!this.processingOverlay) return;
    this.processingOverlay.destroy();
    this.processingOverlay = null;
  }

  _setupPopupCloseDetection() {
    const { width, height } = this.scale;

    // Crear overlay invisible que cubre toda la pantalla
    if (!this.popupOverlay) {
      this.popupOverlay = this.add
        .rectangle(width / 2, height / 2, width, height, 0x000000, 0)
        .setDepth(9999)
        .setInteractive();

      // Detectar clic en el overlay: significa que se cerró el popup
      this.popupOverlay.on("pointerdown", () => {
        this._checkAuthStatus();
      });
    }
  }

  _onPopupClosed() {
    if (!this.#isAuthenticating) return;

    console.log("Popup fue cerrado sin autenticar");
    this.#isAuthenticating = false;

    // Destruir overlay
    if (this.popupOverlay) {
      this.popupOverlay.destroy();
      this.popupOverlay = null;
    }

    // Re-habilitar logos
    this.optionContainers.forEach((c) => {
      c.logo.setInteractive();
      c.setAlpha(1);
    });
    // Si estamos offline, entrar en modo Local-Offline automáticamente
    const offline = typeof navigator !== 'undefined' && !navigator.onLine;
    if (offline) {
      const localUser = {
        uid: `local-${Date.now()}`,
        displayName: 'Local-Offline',
        isLocalOffline: true,
      };
      this.scene.start("Menu", { language: "es", user: localUser });
      return;
    }

    this.highlightOption(this.#selectedOption);
  }
}