import Phaser from "phaser";
import { DE, EN, ES, PT } from "../../enums/languages";
import { FETCHED, FETCHING, READY, TODO } from "../../enums/status";
import { getTranslations, getPhrase } from "../../services/translations";
import keys from "../../enums/keys";
import InputSystem, { INPUT_ACTIONS } from "../utils/InputSystem";

// Estados del menú
const MENU_STATES = {
    CENTRAL: 'CENTRAL',
    VERSUS: 'VERSUS',
    COOP: 'COOP',
    LANGUAGES: 'LANGUAGES',
    LEADERBOARD: 'LEADERBOARD'
};

export default class MainMenu extends Phaser.Scene {
    constructor() {
        super("Menu");
        
        // Referencias a textos clave
        const {Idiomas} = keys.MenuInicial;
        this.Idiomas = Idiomas;
        
        // Estado del menú
        this.currentState = MENU_STATES.CENTRAL;
        this.wasChangedLanguage = TODO;
        this.isTransitioning = false;
        this.isChangingLanguage = false;
        
        // Configuración de navegación
        this.navigationArrows = {
            up: null,
            down: null,
            left: null,
            right: null
        };

        // Configuración visual
        this.palaBaseWidth = 50;
        this.palaExpandedWidth = 300;
        this.particleRadius = 35;
        this.particleTrailAlpha = 0.5;
        this.particleTrailScale = 0.8;

        // Mapeo de controles para ambos jugadores
        this.keyMap1 = {
            [INPUT_ACTIONS.UP]: 'W',
            [INPUT_ACTIONS.DOWN]: 'S',
            [INPUT_ACTIONS.LEFT]: 'A',
            [INPUT_ACTIONS.RIGHT]: 'D',
            [INPUT_ACTIONS.NORTH]: 'SPACE',
            [INPUT_ACTIONS.SOUTH]: 'SHIFT',
            [INPUT_ACTIONS.EAST]: 'E',
            [INPUT_ACTIONS.WEST]: 'Q'
        };

        this.keyMap2 = {
            [INPUT_ACTIONS.UP]: 'UP',
            [INPUT_ACTIONS.DOWN]: 'DOWN',
            [INPUT_ACTIONS.LEFT]: 'LEFT',
            [INPUT_ACTIONS.RIGHT]: 'RIGHT',
            [INPUT_ACTIONS.NORTH]: 'NUMPAD_ZERO',
            [INPUT_ACTIONS.SOUTH]: 'NUMPAD_ONE',
            [INPUT_ACTIONS.EAST]: 'NUMPAD_THREE',
            [INPUT_ACTIONS.WEST]: 'NUMPAD_TWO'
        };

        // Configuración de sliders
        this.sliders = [];
        this.activeSlider = 0;
    }

    init({ language, user }) {
        this.language = language || ES;
        this.currentUser = user;
        // Identificador único por cliente para marcar scores locales pertenecientes a este dispositivo
        this.localClientId = localStorage.getItem('localClientId');
        if (!this.localClientId) {
            this.localClientId = `lc-${Date.now()}-${Math.floor(Math.random()*100000)}`;
            localStorage.setItem('localClientId', this.localClientId);
        }

        // Migración: si existen scores locales antiguos sin ownerLocalId, asignarlos a este cliente
        try {
            const localStored = JSON.parse(localStorage.getItem('localHighScores') || '[]');
            let changed = false;
            if (Array.isArray(localStored)) {
                localStored.forEach(entry => {
                    if (entry && entry.isLocal && !entry.ownerLocalId) {
                        entry.ownerLocalId = this.localClientId;
                        changed = true;
                    }
                });
                if (changed) localStorage.setItem('localHighScores', JSON.stringify(localStored));
            }
        } catch (e) {
            // ignore malformed localStorage
        }
    }

    create() {
        const { width, height } = this.scale;
        
        // Configuración de cámara
        this.cameras.main.setBackgroundColor(0x000000);
        this.camera = this.cameras.main;

        // Crear contenedor principal
        this.mainContainer = this.add.container(0, 0);

        // Crear el logo
        this.logoLorentz = this.add.image(width/2, height/2 - 900, 'logoLorentz')
            .setOrigin(0.5)
            .setDepth(15)
            .setAlpha(0)
            .setScale(0.6); // Ajusta este valor según el tamaño que necesites

        // Crear elementos UI base
        this.createPalas();
        this.createParticle();
        this.createMenuTexts();
        this.createLanguageBlocks();
        this.createLeaderboard();
        this.createNavigationIndicators();
        this.setupInputSystem();
        this.setupMusic();

        // Estado inicial
        this.transitionToState(MENU_STATES.CENTRAL);
    }

    createPalas() {
        const { width, height } = this.scale;

        // Pala P1 (izquierda, azul)
        this.palaP1 = this.add.rectangle(0, height/2, this.palaBaseWidth, height, 0x0066ff)
            .setOrigin(0, 0.5)
            .setDepth(10);

        // Pala P2 (derecha, roja)
        this.palaP2 = this.add.rectangle(width, height/2, this.palaBaseWidth, height, 0xff0000)
            .setOrigin(1, 0.5)
            .setDepth(10);

        this.mainContainer.add([this.palaP1, this.palaP2]);
    }

    createParticle() {
        const { width, height } = this.scale;
        
        this.particula = this.add.circle(width/2, height/2, this.particleRadius, 0xffffff)
            .setDepth(20);
        this.particleTrail = this.add.graphics()
            .setDepth(15);
        
        this.mainContainer.add([this.particula, this.particleTrail]);
        this.particula.setVisible(false);
    }

    createMenuTexts() {
        const { width, height } = this.scale;
        const textConfig = {
            fontSize: '48px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6
        };

        this.texts = {
            versus: this.add.text(width * 0.75 + 580, height/2, "VERSUS", textConfig)
                .setOrigin(0.5)
                .setDepth(15),
            coop: this.add.text(width * 0.25 - 580, height/2, "CO-OP", textConfig)
                .setOrigin(0.5)
                .setDepth(15)
        };

        // Textos de bienvenida con el estilo original
        const welcomeTextConfig = {
            color: "#ffffff",
            fontSize: '42px',
            align: 'center'
        };

        this.idiomastext = this.add.text(
            width/2, 
            height * 0.15 + 200,
            getPhrase(this.Idiomas),
            welcomeTextConfig
        ).setOrigin(0.5).setDepth(15);

        // Textos del usuario y puntuación (mostrados en estado CENTRAL)
        const userTextConfig = {
            color: "#ffffff",
            fontSize: '32px',
            align: 'center',
            fontStyle: 'bold'
        };

        this.userNameText = this.add.text(
            width/2,
            height * 0.2 + 800,
            '',
            userTextConfig
        ).setOrigin(0.5).setDepth(15);

        this.userScoreText = this.add.text(
            width/2,
            height * 0.27 + 750,
            '',
            { ...userTextConfig, fontSize: '28px' }
        ).setOrigin(0.5).setDepth(15);

        Object.values(this.texts).forEach(text => text.setVisible(false));
        this.idiomastext.setVisible(false);
        this.userNameText.setVisible(false);
        this.userScoreText.setVisible(false);

        this.mainContainer.add([...Object.values(this.texts), this.idiomastext, this.userNameText, this.userScoreText]);
    }

   
    createLanguageBlocks() {
        const { width, height } = this.scale;
        const languages = [
            { code: ES, flag: 'flag_es', text: 'Español' },
            { code: DE, flag: 'flag_de', text: 'Deutsch' },
            { code: EN, flag: 'flag_en', text: 'English' },
            { code: PT, flag: 'flag_pt', text: 'Português' }
        ];

        // Usar el mismo sistema de espaciado que el menú original
        const yPos = height * 0.5; // Centrado verticalmente
        const blockSize = 220; // Tamaño original del contenedor
        const spacing = width / 5; // Espacio entre cada bloque

        this.languageBlocks = [];

        languages.forEach((lang, index) => {
            const x = spacing * (index + 1); // Usar el espaciado directamente
            const y = yPos;
            
            const container = this.add.container(x, y);
            
            // Background con el fondo gris por defecto
            const background = this.add.rectangle(0, 0, blockSize, blockSize, 0x666666, 0.3)
                .setData('isBackground', true);
            
            // Delineado como en el original
            const outline = this.add.rectangle(0, 0, blockSize + 4, blockSize + 4, 0x000000, 0)
                .setStrokeStyle(4, 0xffffff, 1)
                .setVisible(false)
                .setData('isOutline', true);
            
            // Bandera con las dimensiones originales
            const flag = this.add.image(0, -30, lang.flag)
                .setDisplaySize(135, 90)
                .setOrigin(0.5);
            
            // Texto con el estilo original
            const text = this.add.text(0, 50, lang.text, {
                fontSize: '24px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4
            }).setOrigin(0.5);

            container.add([outline, background, flag, text]);
            container.setVisible(false);
            container.setDepth(15);
            
            // Configurar interactividad como en el original
            container.setSize(blockSize, blockSize)
                .setInteractive({ useHandCursor: true })
                .on('pointerover', () => {
                    if (!this.isChangingLanguage) {
                        container.scale = 1.1; // Hacer el contenedor más grande
                        outline.setVisible(true); // Mostrar el contorno blanco
                        background.setAlpha(0.5); // Hacer el fondo más visible
                    }
                })
                .on('pointerout', () => {
                    if (!this.isChangingLanguage) {
                        container.scale = 1.0; // Restaurar tamaño original
                        outline.setVisible(false); // Ocultar el contorno
                        background.setAlpha(0.3); // Restaurar alpha original del fondo
                    }
                });

            this.languageBlocks.push({
                container,
                background,
                outline,
                flag,
                text: text,
                code: lang.code,
                isActive: lang.code === this.language
            });

            if (lang.code === this.language) {
                background.setFillStyle(0x44d27e);
                background.setAlpha(0.5);
                container.scale = 1.1;
                outline.setVisible(true);
                this.selectedLanguageBlock = this.languageBlocks[this.languageBlocks.length - 1];
            }

            this.mainContainer.add(container);
        });
    }

    createNavigationIndicators() {
        const { width, height } = this.scale;
        const arrowConfig = {
            fontSize: '32px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        };

        // Crear un contenedor específico para las flechas que no se verá afectado por el zoom
        this.arrowsContainer = this.add.container(0, 0);
        this.arrowsContainer.setDepth(100); // Asegurarnos que esté por encima de todo

        // Crear flechas de navegación
        this.navigationArrows = {
            up: this.add.text(width/2, height/2 - 150, '▲', arrowConfig).setOrigin(0.5).setAlpha(0.4),
            down: this.add.text(width/2, height/2 + 150, '▼', arrowConfig).setOrigin(0.5).setAlpha(0.4),
            left: this.add.text(width/2 - 150, height/2, '◄', arrowConfig).setOrigin(0.5).setAlpha(0.4),
            right: this.add.text(width/2 + 150, height/2, '►', arrowConfig).setOrigin(0.5).setAlpha(0.4)
        };

        // Añadir tweens pulsantes para las flechas
        Object.values(this.navigationArrows).forEach(arrow => {
            this.tweens.add({
                targets: arrow,
                scale: { from: 0.9, to: 1.1 },
                alpha: { from: 0.4, to: 0.8 },
                duration: 2000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
            arrow.setDepth(100);
            this.arrowsContainer.add(arrow);
        });
    }

    createLeaderboard() {
        const { width, height } = this.scale;
        // Contenedor del leaderboard
        this.leaderboardContainer = this.add.container(width / 2, height / 2 + 250).setDepth(15).setVisible(false);

        // Fondo del leaderboard
        this.leaderboardBg = this.add.rectangle(
            0,
            0,
            width * 0.48,
            height * 0.66,
            0x101216
        ).setStrokeStyle(2, 0x00ffff, 0.6).setOrigin(0.5);

        this.leaderboardContainer.add(this.leaderboardBg);

        // Almacenar referencias a las entradas con más estructura
        this.scoreEntries = [];

        // Crear 10 espacios para los scores (con estilo)
        const startY = -height * 0.26;
        const spacing = height * 0.056;
        const entryWidth = width * 0.42;
        const entryHeight = Math.min(56, Math.floor(spacing * 0.9));

        const topColors = [0xffd700, 0xc0c0c0, 0xcd7f32]; // Oro, Plata, Bronce

        for (let i = 0; i < 10; i++) {
            const y = startY + (i * spacing);

            const entryContainer = this.add.container(0, y).setAlpha(0);

            const bg = this.add.rectangle(0, 0, entryWidth, entryHeight, 0x1b1f2a)
                .setOrigin(0.5)
                .setStrokeStyle(2, 0x2b303b, 0.9)
                .setAlpha(0.95);

            // Glow overlay para efecto de pulso en cian (alpha animado)
            const glow = this.add.rectangle(0, 0, entryWidth, entryHeight, 0x00ffff, 0.2)
                .setOrigin(0.5)
                .setAlpha(0)
                .setDepth(1)
                .setBlendMode(Phaser.BlendModes.ADD);

            const badgeX = -entryWidth / 2 + 30;
            const badge = this.add.circle(badgeX, 0, 18, 0x333844).setStrokeStyle(2, 0x000000);
            const rankText = this.add.text(badgeX, 0, `${i + 1}`, {
                fontSize: '16px',
                color: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            const nameText = this.add.text(badgeX + 28, 0, '', {
                fontSize: '18px',
                color: '#e6eef8',
                stroke: '#071228',
                strokeThickness: 2
            }).setOrigin(0, 0.5);

            const scoreText = this.add.text(entryWidth / 2 - 28, 0, '', {
                fontSize: '18px',
                color: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(1, 0.5);

            entryContainer.add([bg, glow, badge, rankText, nameText, scoreText]);
            this.leaderboardContainer.add(entryContainer);
            this.scoreEntries.push({ entryContainer, bg, glow, badge, rankText, nameText, scoreText });
        }
    }

    async loadLeaderboard() {
        try {
            const topColors = [0xffd700, 0xc0c0c0, 0xcd7f32];

            // Obtener scores remotos solo si hay conexión
            let remoteScores = [];
            if (typeof navigator !== 'undefined' && navigator.onLine) {
                try {
                    remoteScores = await this.firebase.getHighScores();
                } catch (e) {
                    remoteScores = [];
                }
            }

            // Scores locales guardados en localStorage (no se suben automáticamente)
            const localStored = JSON.parse(localStorage.getItem('localHighScores') || '[]');

            // Combinar y ordenar
            const combined = [...remoteScores, ...localStored]
                .filter(s => s && typeof s.score === 'number')
                .sort((a, b) => b.score - a.score)
                .slice(0, 10);

            // Determinar nombre/uid del usuario actual
            let currentUserName = null;
            let currentUid = null;
            if (this.currentUser) {
                currentUid = this.currentUser.uid || null;
                const localUserData = JSON.parse(localStorage.getItem(`localUserData:${currentUid}`) || 'null');
                currentUserName = localUserData?.displayName || this.currentUser.displayName || this.currentUser.email || null;
            }

            this.scoreEntries.forEach((entry, index) => {
                const data = combined[index] || null;

                    // Resetar cualquier tween/estado previo en esta fila para evitar pulso residual
                    try {
                        this.tweens.killTweensOf(entry.glow);
                        this.tweens.killTweensOf(entry.entryContainer);
                    } catch (e) {
                        // ignore
                    }
                    entry.glow.setAlpha(0);
                    entry.entryContainer.setScale(1);

                    if (data) {
                        entry.nameText.setText(data.name || '---');
                        entry.scoreText.setText(String(data.score || 0));

                        // Considerar usuario actual: cualquier entrada local almacenada debe mostrarse como nuestra;
                        // si existe uid, también usarlo como coincidencia primaria
                        const isLocalEntry = !!data.isLocal;
                        const ownerMatches = isLocalEntry && data.ownerLocalId && this.localClientId && data.ownerLocalId === this.localClientId;
                        const uidMatches = currentUid && data.uid && data.uid === currentUid;
                        const isCurrentUser = uidMatches || ownerMatches;

                        // Resaltar top 3
                        if (index < 3) {
                            entry.badge.setFillStyle(topColors[index]);
                            entry.rankText.setColor('#071228');
                            entry.bg.setFillStyle(0x2b2f39);
                            entry.entryContainer.setScale(1.02);
                        } else {
                            entry.badge.setFillStyle(0x333844);
                            entry.rankText.setColor('#ffffff');
                            entry.bg.setFillStyle(0x1b1f2a);
                            entry.entryContainer.setScale(1);
                        }

                        // Animación de aparición con pequeño retardo por fila
                        this.tweens.add({
                            targets: entry.entryContainer,
                            alpha: { from: 0, to: 1 },
                            y: entry.entryContainer.y,
                            duration: 400,
                            delay: index * 60,
                            ease: 'Power2'
                        });

                        // Parpadeo suave (palpitante) solo para nuestro nombre: color cian y escala sutil
                        if (isCurrentUser) {
                            this.time.delayedCall(400 + index * 60, () => {
                                // Pulso suave: aumentar alpha del glow y escala muy sutil
                                this.tweens.add({
                                    targets: entry.glow,
                                    alpha: { from: 0, to: 0.8 },
                                    duration: 2200,
                                    yoyo: true,
                                    repeat: -1,
                                    ease: 'Sine.easeInOut'
                                });

                                this.tweens.add({
                                    targets: entry.entryContainer,
                                    scale: { from: 1.02, to: 1.04 },
                                    duration: 2200,
                                    yoyo: true,
                                    repeat: -1,
                                    ease: 'Sine.easeInOut'
                                });
                            });
                        }
                    } else {
                        entry.nameText.setText('');
                        entry.scoreText.setText('');
                        entry.badge.setFillStyle(0x22252c);
                        entry.entryContainer.setAlpha(0);
                    }
            });
        } catch (error) {
            console.error('Error cargando leaderboard:', error);
        }
    }

    setupInputSystem() {
        this.inputSystem = new InputSystem(this, this.keyMap1, this.keyMap2);
    }

    setupMusic() {
        this.menuMusic = this.sound.add('menuMusic', { loop: true });
        this.menuMusic.play();
    }

    transitionToState(newState, isCancelled = false) {
        if (!isCancelled && (this.isTransitioning || (this.isChangingLanguage && newState !== MENU_STATES.CENTRAL))) {
            return;
        }

        const { width, height } = this.scale;
        const duration = isCancelled ? 500 : 1000;
        const ease = isCancelled ? 'Power1' : 'Power2';

        this.isTransitioning = true;
        this.currentState = newState;

        // Si estamos cancelando una transición, detener todos los tweens activos
        if (isCancelled) {
            this.tweens.killAll();
        }

        // Ocultar todos los elementos
        this.hideAllElements(isCancelled);

        // Resetear posición de palas (separar las operaciones)
        this.palaP1.setPosition(0, height/2);
        this.palaP1.width = this.palaBaseWidth;
        
        this.palaP2.setPosition(width, height/2);
        this.palaP2.width = this.palaBaseWidth;        switch(newState) {
            case MENU_STATES.CENTRAL:
                this.transitionToCentral(duration, ease);
                break;
            case MENU_STATES.VERSUS:
                this.transitionToVersus(duration, ease);
                break;
            case MENU_STATES.COOP:
                this.transitionToCoop(duration, ease);
                break;
            case MENU_STATES.LANGUAGES:
                this.transitionToLanguages(duration, ease);
                break;
            case MENU_STATES.LEADERBOARD:
                this.transitionToLeaderboard(duration, ease);
                break;
        }

        // Finalizar transición
        this.time.delayedCall(duration, () => {
            this.isTransitioning = false;
        });
    }

    transitionToCentral(duration, ease) {
        const { width, height } = this.scale;

        // Mostrar información del usuario
        if (this.currentUser) {
            this.loadUserInfo();
        }

        // Animar cámara al centro
        this.camera.pan(width/2, height/2, duration, ease);
        this.camera.zoomTo(1, duration, ease);

        // Restaurar palas con una transición suave
        this.tweens.add({
            targets: [this.palaP1, this.palaP2],
            width: this.palaBaseWidth,
            y: height/2,
            x: {
                targets: this.palaP1,
                value: 0
            },
            duration,
            ease
        });

        this.tweens.add({
            targets: this.palaP2,
            x: width,
            duration,
            ease
        });

        // Mostrar el logo con una animación suave
        this.tweens.add({
            targets: this.logoLorentz,
            alpha: 1,
            y: height/2 - 350,
            duration: duration * 0.8,
            ease: 'Power2'
        });

        // Animar partícula al centro con efecto de rebote
        this.particula.setVisible(true);
        this.tweens.add({
            targets: this.particula,
            x: width/2,
            y: height/2,
            scale: { from: 0.8, to: 1 },
            alpha: { from: 0.5, to: 1 },
            duration: duration * 0.8,
            ease: 'Bounce.easeOut'
        });

        // Mostrar y animar los indicadores de navegación
        Object.values(this.navigationArrows).forEach(arrow => {
            arrow.setVisible(true);
            arrow.setAlpha(0.4);
            this.tweens.add({
                targets: arrow,
                scale: { from: 0.9, to: 1.1 },
                alpha: { from: 0.4, to: 0.8 },
                duration: 2000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        });
    }

    async loadUserInfo() {
        try {
            const offline = typeof navigator !== 'undefined' && !navigator.onLine;
            let userData = null;

            if (!offline && !this.currentUser?.isLocalOffline) {
                try {
                    userData = await this.firebase.loadGameData(this.currentUser.uid);
                } catch (e) {
                    userData = null;
                }
            }

            // Intentar datos locales si no hay datos remotos
            if (!userData && this.currentUser) {
                const localUser = JSON.parse(localStorage.getItem(`localUserData:${this.currentUser.uid}`) || 'null');
                userData = localUser || null;
            }

            // Determinar displayName y coopScore usando remoto, localUserData o this.currentUser
            const displayName = (userData && userData.displayName) || this.currentUser?.displayName || this.currentUser?.email || null;
            let coopScore = null;

            if (userData && typeof userData.coopScore === 'number') coopScore = userData.coopScore;
            else if (this.currentUser) {
                const localUser = JSON.parse(localStorage.getItem(`localUserData:${this.currentUser.uid}`) || 'null');
                if (localUser && typeof localUser.coopScore === 'number') coopScore = localUser.coopScore;
            }

            // Mostrar nombre si sabemos uno
            if (displayName) {
                this.userNameText.setText(displayName);
                this.userNameText.setVisible(true);
            }

            // Si no hay score remoto/local, intentar obtener el mejor score local guardado
            if (coopScore === null) {
                try {
                    const localStored = JSON.parse(localStorage.getItem('localHighScores') || '[]');
                    if (Array.isArray(localStored) && localStored.length > 0) {
                        // tomar el máximo entre las entradas locales
                        const maxLocal = localStored.reduce((m, s) => (s && typeof s.score === 'number' && s.score > m ? s.score : m), 0);
                        if (maxLocal > 0) coopScore = maxLocal;
                    }
                } catch (e) {
                    // ignore
                }
            }

            const scoreToShow = (typeof coopScore === 'number') ? coopScore : 0;
            this.userScoreText.setText(`CO-OP: ${scoreToShow}`);
            this.userScoreText.setVisible(true);
        } catch (error) {
            console.error('Error cargando información del usuario:', error);
        }
    }

     transitionToVersus(duration, ease) {
        const { width, height } = this.scale;
        const margin = 100; // Margen desde el borde para la partícula

        // Expandir pala derecha
        this.tweens.add({
            targets: this.palaP2,
            width: this.palaExpandedWidth,
            duration,
            ease
        });

        // Ocultar pala izquierda
        this.tweens.add({
            targets: this.palaP1,
            x: -this.palaBaseWidth,
            duration,
            ease
        });

        // Mostrar texto
        this.texts.versus.setVisible(true);

        // Animar cámara
        this.camera.pan(width - 400, height/2, duration, ease);
        this.camera.zoomTo(1.5, duration, ease);

        // Animar partícula hacia la pala derecha
        this.animateParticle(width/2, width - this.palaExpandedWidth - margin, duration);
    }

    transitionToCoop(duration, ease) {
        const { width, height } = this.scale;
        const margin = 100; // Margen desde el borde para la partícula

        // Expandir pala izquierda
        this.tweens.add({
            targets: this.palaP1,
            width: this.palaExpandedWidth,
            x: -250,
            duration,
            ease
        });

        // Ocultar pala derecha, la roja
        this.tweens.add({
            targets: this.palaP2,
            x: width + this.palaBaseWidth,
            duration,
            ease
        });

        // Mostrar texto
        this.texts.coop.setVisible(true);

        // Animar cámara
        this.camera.pan(400, height/2, duration, ease);
        this.camera.zoomTo(1.5, duration, ease);

        // Animar partícula hacia la pala izquierda
        this.animateParticle(width/2, this.palaExpandedWidth + margin, duration);
    }

    transitionToLanguages(duration, ease) {
        const { width, height } = this.scale;

        // Ocultar palas hacia arriba
        this.tweens.add({
            targets: [this.palaP1, this.palaP2],
            y: -height,
            duration,
            ease
        });

        // Mostrar bloques de idioma
        this.languageBlocks.forEach(block => {
            block.container.setVisible(true);
        });

        // Mostrar textos
        this.idiomastext.setVisible(true);

        // Animar cámara
        this.camera.pan(width/2, height * 0.5, duration, ease);
        this.camera.zoomTo(1.2, duration, ease);

        // Animar partícula verticalmente hacia arriba
        this.animateParticle(width/2, height/2, duration, 'vertical', true);
    }

    transitionToLeaderboard(duration, ease) {
        const { width, height } = this.scale;

        // Ocultar palas hacia abajo
        this.tweens.add({
            targets: [this.palaP1, this.palaP2],
            y: height * 2,
            duration,
            ease
        });

        // Mostrar leaderboard
        this.leaderboardContainer.setVisible(true);
        this.loadLeaderboard();

        // Animar cámara
        this.camera.pan(width/2, height * 0.7, duration, ease);
        this.camera.zoomTo(1.2, duration, ease);

        // Animar partícula verticalmente hacia abajo
        this.animateParticle(width/2, height/2, duration, 'vertical', false);
    }

    showParticleInCenter() {
        const { width, height } = this.scale;
        this.particula.setPosition(width/2, height/2).setVisible(true);
    }

    animateParticle(startX, endXorY, duration, direction = 'horizontal', goUp = true) {
        this.particula.setVisible(true);
        const startY = this.scale.height/2;
        this.particula.setPosition(startX, startY);

        let endX = startX;
        let endY = startY;
        let recoilX = startX;
        let recoilY = startY;

        if (direction === 'vertical') {
            endY = goUp ? this.scale.height * 0.2 : this.scale.height * 0.8;
            recoilY = goUp ? this.scale.height * 0.6 : this.scale.height * 0.4;
        } else {
            endX = endXorY;
            recoilX = startX + (startX - endXorY) * 0.2; // Recoil del 20% en dirección opuesta
        }

        // Crear línea de trayectoria con efecto
        const drawTrail = (fromX, fromY, toX, toY, alpha) => {
            this.particleTrail.clear();
            
            // Determinar el color según el estado al que vamos
            let trailColor = 0xffffff;
            if (direction === 'horizontal') {
                if (endX < startX) { // Va hacia la izquierda (COOP)
                    trailColor = 0x0066ff; // Color azul de palaP1
                } else { // Va hacia la derecha (VERSUS)
                    trailColor = 0xff0000; // Color rojo de palaP2
                }
            }
            
            this.particleTrail.lineStyle(2, trailColor, alpha);
            this.particleTrail.beginPath();
            this.particleTrail.moveTo(fromX, fromY);
            this.particleTrail.lineTo(toX, toY);
            this.particleTrail.strokePath();
        };

        // Secuencia de animación: recoil -> movimiento final
        this.tweens.add({
            targets: this.particula,
            x: recoilX,
            y: recoilY,
            duration: duration * 0.2,
            ease: 'Cubic.easeOut',
            onUpdate: (tween) => {
                const currentX = this.particula.x;
                const currentY = this.particula.y;
                drawTrail(startX, startY, currentX, currentY, 0.3);
            },
            onComplete: () => {
                // Movimiento principal
                this.tweens.add({
                    targets: this.particula,
                    x: endX,
                    y: endY,
                    duration: duration * 0.8,
                    ease: 'Cubic.easeIn',
                    onUpdate: (tween) => {
                        const currentX = this.particula.x;
                        const currentY = this.particula.y;
                        drawTrail(currentX, currentY, endX, endY, 0.5);
                    },
                    onComplete: () => {
                        this.particleTrail.clear();
                    }
                });
            }
        });
    }

    hideAllElements(isCancelled = false) {
        Object.values(this.texts).forEach(text => text.setVisible(false));
        this.idiomastext?.setVisible(false);
        this.userNameText?.setVisible(false);
        this.userScoreText?.setVisible(false);
        this.languageBlocks.forEach(block => block.container.setVisible(false));
        this.leaderboardContainer?.setVisible(false);

        // Ocultar el logo con una animación suave cuando no estamos en el menú central
        if (this.currentState !== MENU_STATES.CENTRAL) {
            this.tweens.add({
                targets: this.logoLorentz,
                alpha: 0,
                duration: 300,
                ease: 'Power2'
            });
        }

        // Primero ocultamos todas las flechas
        Object.values(this.navigationArrows).forEach(arrow => {
            arrow.setVisible(false);
            this.tweens.killTweensOf(arrow);
        });

        // Mostrar las flechas según el estado
        if (this.currentState === MENU_STATES.CENTRAL) {
            // En el menú central, mostrar todas las flechas
            Object.values(this.navigationArrows).forEach(arrow => {
                arrow.setVisible(true);
                arrow.setAlpha(0.4);
                this.tweens.add({
                    targets: arrow,
                    scale: { from: 0.9, to: 1.1 },
                    alpha: { from: 0.4, to: 0.8 },
                    duration: 2000,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            });
        } else {
            // En otros menús, mostrar solo la flecha de retorno
            const returnArrow = this.getReturnArrow();
            if (returnArrow) {
                returnArrow.setVisible(true);
                returnArrow.setAlpha(0.4);
                this.tweens.add({
                    targets: returnArrow,
                    scale: { from: 0.9, to: 1.1 },
                    alpha: { from: 0.4, to: 0.8 },
                    duration: 2000,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }
        }

        // Limpiar el rastro de la partícula
        this.particleTrail.clear();
    }

    getReturnArrow() {
        switch(this.currentState) {
            case MENU_STATES.VERSUS:
                return this.navigationArrows.left;
            case MENU_STATES.COOP:
                return this.navigationArrows.right;
            case MENU_STATES.LANGUAGES:
                return this.navigationArrows.down;
            case MENU_STATES.LEADERBOARD:
                return this.navigationArrows.up;
            default:
                return null;
        }
    }

    async selectLanguage() {
        if (!this.selectedLanguageBlock || this.isChangingLanguage) return;

        this.isChangingLanguage = true;
        this.wasChangedLanguage = FETCHING;

        // Desactivar bloques durante la carga
        this.languageBlocks.forEach(block => {
            block.container.setAlpha(0.5);
        });

        // Iniciar parpadeo en textos
        this.startFlicker(this.idiomastext);

        try {
            await getTranslations(this.selectedLanguageBlock.code);
            this.language = this.selectedLanguageBlock.code;
            
            // Actualizar textos
            this.idiomastext.setText(getPhrase(this.Idiomas));
            
            // Restaurar estado visual
            this.stopFlicker(this.idiomastext);
            this.languageBlocks.forEach(block => {
                block.container.setAlpha(1);
            });

            this.wasChangedLanguage = FETCHED;
        } catch (error) {
            /*
            console.error('Error al cambiar el idioma:', error);
            */
        } finally {
            this.isChangingLanguage = false;
        }
    }

    startFlicker(target) {
        this.tweens.add({
            targets: target,
            alpha: 0.2,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    stopFlicker(target) {
        this.tweens.killTweensOf(target);
        target.setAlpha(1);
    }

    navigateLanguageBlocks(direction) {
        if (this.isChangingLanguage) return;

        let currentIndex = this.selectedLanguageBlock ? 
            this.languageBlocks.indexOf(this.selectedLanguageBlock) : 0;
        
        currentIndex = (currentIndex + direction + this.languageBlocks.length) % this.languageBlocks.length;
        
        // Restaurar estado visual del bloque anterior
        if (this.selectedLanguageBlock) {
            this.selectedLanguageBlock.background.setFillStyle(0x666666);
            this.selectedLanguageBlock.background.setAlpha(0.3);
            this.selectedLanguageBlock.container.scale = 1.0;
            this.selectedLanguageBlock.outline.setVisible(false);
        }
        
        this.selectedLanguageBlock = this.languageBlocks[currentIndex];
        
        // Aplicar efectos visuales al nuevo bloque seleccionado
        this.selectedLanguageBlock.background.setFillStyle(0x44d27e);
        this.selectedLanguageBlock.background.setAlpha(0.5);
        this.selectedLanguageBlock.container.scale = 1.1;
        this.selectedLanguageBlock.outline.setVisible(true);
    }

    update() {
        if (!this.inputSystem) return;

        this.inputSystem.update();

        if (!this.isTransitioning) {
            this.handleMenuInput();
        }

        // Actualizar la posición de las flechas según la cámara
        this.updateArrowsPosition();

        this.inputSystem.lateUpdate();
    }

    handleMenuInput() {
        // Si estamos cambiando el idioma, solo permitir la navegación en LANGUAGES
        if (this.isChangingLanguage && this.currentState !== MENU_STATES.LANGUAGES) {
            return;
        }

        const { width, height } = this.scale;
        
        // Inputs jugador 1
        const isP1North = this.inputSystem.isJustPressed(INPUT_ACTIONS.NORTH, 'player1');
        const isP1Left = this.inputSystem.isJustPressed(INPUT_ACTIONS.LEFT, 'player1');
        const isP1Right = this.inputSystem.isJustPressed(INPUT_ACTIONS.RIGHT, 'player1');
        const isP1Up = this.inputSystem.isJustPressed(INPUT_ACTIONS.UP, 'player1');
        const isP1Down = this.inputSystem.isJustPressed(INPUT_ACTIONS.DOWN, 'player1');

        // Inputs jugador 2
        const isP2North = this.inputSystem.isJustPressed(INPUT_ACTIONS.NORTH, 'player2');
        const isP2Left = this.inputSystem.isJustPressed(INPUT_ACTIONS.LEFT, 'player2');
        const isP2Right = this.inputSystem.isJustPressed(INPUT_ACTIONS.RIGHT, 'player2');
        const isP2Up = this.inputSystem.isJustPressed(INPUT_ACTIONS.UP, 'player2');
        const isP2Down = this.inputSystem.isJustPressed(INPUT_ACTIONS.DOWN, 'player2');

        // Combinar inputs de ambos jugadores
        const isLeft = isP1Left || isP2Left;
        const isRight = isP1Right || isP2Right;
        const isUp = isP1Up || isP2Up;
        const isDown = isP1Down || isP2Down;
        const isNorth = isP1North || isP2North;
        
        // Posición actual de la partícula para efectos
        const particleX = this.particula.x;
        const particleY = this.particula.y;

        // Manejo de estados
        switch(this.currentState) {
            case MENU_STATES.CENTRAL:
                if (isLeft) {
                    this.transitionToState(MENU_STATES.COOP);
                } else if (isRight) {
                    this.transitionToState(MENU_STATES.VERSUS);
                } else if (isUp) {
                    this.transitionToState(MENU_STATES.LANGUAGES);
                } else if (isDown) {
                    this.transitionToState(MENU_STATES.LEADERBOARD);
                }
                break;

            case MENU_STATES.VERSUS:
                if (isLeft) {
                    this.transitionToState(MENU_STATES.CENTRAL);
                } else if (isNorth) {
                    if (this.menuMusic?.isPlaying) {
                        this.menuMusic.stop();
                    }
                    this.scene.start("VersusPreGame", { language: this.language, user: this.currentUser });
                }
                break;

            case MENU_STATES.COOP:
                if (isRight) {
                    this.transitionToState(MENU_STATES.CENTRAL);
                } else if (isNorth) {
                    if (this.menuMusic?.isPlaying) {
                        this.menuMusic.stop();
                    }
                    this.scene.start("CoopGame", { language: this.language, user: this.currentUser });
                }
                break;

            case MENU_STATES.LANGUAGES:
                if (isDown) {
                    this.transitionToState(MENU_STATES.CENTRAL);
                } else if (isLeft) {
                    this.navigateLanguageBlocks(-1);
                } else if (isRight) {
                    this.navigateLanguageBlocks(1);
                } else if (isNorth && !this.isChangingLanguage) {
                    this.selectLanguage();
                }
                break;

            case MENU_STATES.LEADERBOARD:
                if (isUp) {
                    this.transitionToState(MENU_STATES.CENTRAL);
                }
                break;
        }
    }

    updateArrowsPosition() {
        if (!this.navigationArrows) return;

        const { width, height } = this.scale;
        const camera = this.cameras.main;
        const zoom = camera.zoom;
        const centerX = camera.scrollX + width / 2;
        const centerY = camera.scrollY + height / 2;

        // Calcular el espaciado basado en el zoom
        const centralSpacing = 150 / zoom;
        const borderSpacing = 50 / zoom; // Espacio más cercano al borde para estados no centrales

        if (this.currentState === MENU_STATES.CENTRAL) {
            // En el estado central, todas las flechas alrededor del centro
            Object.values(this.navigationArrows).forEach(arrow => {
                if (arrow?.visible) {
                    arrow.setScale(1 / zoom);
                }
            });

            this.navigationArrows.up?.setPosition(centerX, centerY - centralSpacing);
            this.navigationArrows.down?.setPosition(centerX, centerY + centralSpacing);
            this.navigationArrows.left?.setPosition(centerX - centralSpacing, centerY);
            this.navigationArrows.right?.setPosition(centerX + centralSpacing, centerY);
        } else {
            // En otros estados, colocar la flecha cerca del borde correspondiente
            const returnArrow = this.getReturnArrow();
            if (returnArrow?.visible) {
                returnArrow.setScale(1.2 / zoom); // Hacer la flecha de retorno un poco más grande

                switch (this.currentState) {
                    case MENU_STATES.VERSUS:
                        returnArrow.setPosition(camera.scrollX + borderSpacing * 12, centerY);
                        break;
                    case MENU_STATES.COOP:
                        returnArrow.setPosition(camera.scrollX + width - borderSpacing * 12, centerY);
                        break;
                    case MENU_STATES.LANGUAGES:
                        returnArrow.setPosition(centerX, camera.scrollY + height - borderSpacing * 4.5);
                        break;
                    case MENU_STATES.SETTINGS:
                        returnArrow.setPosition(centerX, camera.scrollY + borderSpacing * 4.5);
                        break;
                }
            }
        }
    }
}