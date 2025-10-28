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
    SETTINGS: 'SETTINGS'
};

export default class MainMenu extends Phaser.Scene {
    constructor() {
        super("Menu");
        
        // Referencias a textos clave
        const { next, hello, howAreU } = keys.sceneInitialMenu;
        this.updatedString = next;
        this.helloKey = hello;
        this.howAreUKey = howAreU;
        
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

        // Sistema de partículas
        this.transitionParticles = null;

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

    init({ language }) {
        this.language = language || ES;
    }

    create() {
        const { width, height } = this.scale;
        
        // Configuración de cámara
        this.cameras.main.setBackgroundColor(0x000000);
        this.camera = this.cameras.main;

        // Crear contenedor principal
        this.mainContainer = this.add.container(0, 0);

        // Crear sistema de partículas para transiciones
        this.createTransitionParticles();

        // Crear elementos UI base
        this.createPalas();
        this.createParticle();
        this.createMenuTexts();
        this.createLanguageBlocks();
        this.createSettingsMenu();
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
            coop: this.add.text(width * 0.25 - 325, height/2, "CO-OP", textConfig)
                .setOrigin(0.5)
                .setDepth(15),
            languages: this.add.text(width/2, height * 0.15 + 200, "IDIOMAS", textConfig)
                .setOrigin(0.5)
                .setDepth(15),
            settings: this.add.text(width/2, height * 0.85, "AJUSTES", textConfig)
                .setOrigin(0.5)
                .setDepth(15)
        };

        // Textos de bienvenida con el estilo original
        const welcomeTextConfig = {
            color: "#ffffff",
            fontSize: '42px',
            align: 'center'
        };

        this.helloText = this.add.text(
            width * 0.5,
            height * 0.45 + 250,
            getPhrase(this.helloKey),
            welcomeTextConfig
        ).setOrigin(0.5).setDepth(15);

        this.howAreUText = this.add.text(
            width * 0.5,
            height * 0.55 + 250,
            getPhrase(this.howAreUKey),
            welcomeTextConfig
        ).setOrigin(0.5).setDepth(15);

        Object.values(this.texts).forEach(text => text.setVisible(false));
        this.helloText.setVisible(false);
        this.howAreUText.setVisible(false);

        this.mainContainer.add([...Object.values(this.texts), this.helloText, this.howAreUText]);
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

    createTransitionParticles() {
        this.transitionParticles = this.add.particles(0, 0, 'particle', {
            speed: { min: 100, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.4, end: 0 },
            blendMode: 'ADD',
            lifespan: 800,
            gravityY: 0,
            quantity: 1,
            frequency: 50,
            tint: 0x44d27e,
            on: false
        }).setDepth(30);
    }

    emitTransitionParticles(x, y, direction) {
        if (!this.transitionParticles) return;

        // Configurar dirección de las partículas según la transición
        let angleRange = { min: 0, max: 360 };
        switch(direction) {
            case 'up':
                angleRange = { min: -135, max: -45 };
                break;
            case 'down':
                angleRange = { min: 45, max: 135 };
                break;
            case 'left':
                angleRange = { min: -225, max: -135 };
                break;
            case 'right':
                angleRange = { min: -45, max: 45 };
                break;
        }

        this.transitionParticles.setPosition(x, y);
        this.transitionParticles.setAngle(angleRange);
        this.transitionParticles.start();

        // Detener emisión después de un tiempo
        this.time.delayedCall(500, () => {
            this.transitionParticles.stop();
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

    createSettingsMenu() {
        const { width, height } = this.scale;
        
        // Campo estabilizador
        this.stabilizationField = this.add.rectangle(
            width/2,
            height * 0.7,
            width * 0.6,
            height * 0.4,
            0x1a1a1a
        ).setStrokeStyle(2, 0x44d27e).setDepth(15).setVisible(false);

        // Sliders
        const sliderConfig = {
            width: width * 0.4,
            height: 8,
            x: width * 0.6,
            trackColor: 0x666666,
            handleColor: 0x44d27e,
            handleRadius: 15
        };

        // Volumen (logarítmico)
        this.volumeSlider = this.createSlider({
            ...sliderConfig,
            y: height * 0.65,
            label: "Volumen (Logarítmico)",
            initialValue: 0.5, // Comenzar en el medio (volumen normal)
            onChange: this.updateVolume.bind(this)
        });

        // Brillo
        this.brightnessSlider = this.createSlider({
            ...sliderConfig,
            y: height * 0.75,
            label: "Brillo",
            initialValue: 0.5, // Comenzar en el medio (brillo normal)
            onChange: this.updateBrightness.bind(this)
        });

        this.sliders = [this.volumeSlider, this.brightnessSlider];
        this.mainContainer.add(this.stabilizationField);
    }

    createSlider({ x, y, width, height, label, initialValue, onChange, trackColor, handleColor, handleRadius }) {
        const track = this.add.rectangle(x, y, width, height, trackColor).setDepth(16);
        const handle = this.add.circle(
            x + ((initialValue - 0.5) * width),
            y,
            handleRadius,
            handleColor
        ).setDepth(17);
        
        const labelText = this.add.text(x - (width/2) - 20, y, label, {
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(1, 0.5).setDepth(16);

        const slider = {
            track,
            handle,
            label: labelText,
            width,
            baseX: x,
            value: initialValue,
            onChange,
            getValue: () => slider.value,
            setValue: (newValue) => {
                // Asegurar que el valor está entre 0 y 1
                slider.value = Phaser.Math.Clamp(newValue, 0, 1);
                // Actualizar posición del handle
                handle.x = x + ((slider.value - 0.5) * width);
                if (onChange) onChange(slider.value);
            },
            setVisible: (visible) => {
                track.setVisible(visible);
                handle.setVisible(visible);
                labelText.setVisible(visible);
            }
        };

        slider.setVisible(false);
        return slider;
    }

    setupInputSystem() {
        this.inputSystem = new InputSystem(this, this.keyMap1, this.keyMap2);
    }

    setupMusic() {
        this.menuMusic = this.sound.add('menuMusic', { loop: true });
        this.menuMusic.play();
        this.updateVolume(this.volumeSlider.getValue());
    }

   updateVolume(value) {
        // Convertir el valor del slider (0-1) a un rango de volumen (0-2)
        // donde 0.5 en el slider = 1.0 de volumen
        let volumeValue;
        if (value <= 0.5) {
            // De 0 a 0.5 mapear a 0-1 (silencio a normal)
            volumeValue = (value * 2);
        } else {
            // De 0.5 a 1 mapear a 1-2 (normal a doble)
            volumeValue = 1 + ((value - 0.5) * 2);
        }
        
        if (this.menuMusic) {
            this.menuMusic.setVolume(volumeValue);
        }
    }

   updateBrightness(value) {
        // Convertir el valor del slider (0-1) a un rango de brillo (0-2)
        // donde 0.5 en el slider = 1.0 de brillo
        let brightness;
        if (value <= 0.5) {
            // De 0 a 0.5 mapear a 0-1 (negro a normal)
            brightness = (value * 2);
        } else {
            // De 0.5 a 1 mapear a 1-2 (normal a blanco)
            brightness = 1 + ((value - 0.5) * 2);
        }
        
        this.cameras.main.setAlpha(brightness);
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
            case MENU_STATES.SETTINGS:
                this.transitionToSettings(duration, ease);
                break;
        }

        // Finalizar transición
        this.time.delayedCall(duration, () => {
            this.isTransitioning = false;
        });
    }

    transitionToCentral(duration, ease) {
        const { width, height } = this.scale;

        // Resetear el slider activo
        this.activeSlider = 0;

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
            duration,
            ease
        });

        // Ocultar pala derecha
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
        this.texts.languages.setVisible(true);
        this.helloText.setVisible(true);
        this.howAreUText.setVisible(true);

        // Animar cámara
        this.camera.pan(width/2, height * 0.5, duration, ease);
        this.camera.zoomTo(1.2, duration, ease);

        // Animar partícula verticalmente hacia arriba
        this.animateParticle(width/2, height/2, duration, 'vertical', true);
    }

    transitionToSettings(duration, ease) {
        const { width, height } = this.scale;

        // Ocultar palas hacia abajo
        this.tweens.add({
            targets: [this.palaP1, this.palaP2],
            y: height * 2,
            duration,
            ease
        });

        // Mostrar campo estabilizador y sliders
        this.stabilizationField.setVisible(true);
        this.sliders.forEach(slider => slider.setVisible(true));

        // Mostrar texto de ajustes
        this.texts.settings.setVisible(true);

        // Asegurarse de que el primer slider esté seleccionado
        this.activeSlider = 0;
        this.highlightActiveSlider();

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
        this.helloText?.setVisible(false);
        this.howAreUText?.setVisible(false);
        this.languageBlocks.forEach(block => block.container.setVisible(false));
        this.stabilizationField?.setVisible(false);
        this.sliders.forEach(slider => slider.setVisible(false));

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
            case MENU_STATES.SETTINGS:
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
        this.startFlicker(this.helloText);
        this.startFlicker(this.howAreUText);

        try {
            await getTranslations(this.selectedLanguageBlock.code);
            this.language = this.selectedLanguageBlock.code;
            
            // Actualizar textos
            this.helloText.setText(getPhrase(this.helloKey));
            this.howAreUText.setText(getPhrase(this.howAreUKey));
            
            // Restaurar estado visual
            this.stopFlicker(this.helloText);
            this.stopFlicker(this.howAreUText);
            this.languageBlocks.forEach(block => {
                block.container.setAlpha(1);
            });

            this.wasChangedLanguage = FETCHED;
        } catch (error) {
            console.error('Error al cambiar el idioma:', error);
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
                    this.emitTransitionParticles(particleX, particleY, 'left');
                    this.transitionToState(MENU_STATES.COOP);
                } else if (isRight) {
                    this.emitTransitionParticles(particleX, particleY, 'right');
                    this.transitionToState(MENU_STATES.VERSUS);
                } else if (isUp) {
                    this.emitTransitionParticles(particleX, particleY, 'up');
                    this.transitionToState(MENU_STATES.LANGUAGES);
                } else if (isDown) {
                    this.emitTransitionParticles(particleX, particleY, 'down');
                    this.transitionToState(MENU_STATES.SETTINGS);
                }
                break;

            case MENU_STATES.VERSUS:
                if (isLeft) {
                    this.emitTransitionParticles(particleX, particleY, 'left');
                    this.transitionToState(MENU_STATES.CENTRAL);
                } else if (isNorth) {
                    if (this.menuMusic?.isPlaying) {
                        this.menuMusic.stop();
                    }
                    this.scene.start("PreGame", { language: this.language });
                }
                break;

            case MENU_STATES.COOP:
                if (isRight) {
                    this.emitTransitionParticles(particleX, particleY, 'right');
                    this.transitionToState(MENU_STATES.CENTRAL);
                } else if (isNorth) {
                    if (this.menuMusic?.isPlaying) {
                        this.menuMusic.stop();
                    }
                    this.scene.start("CoopGame", { language: this.language });
                }
                break;

            case MENU_STATES.LANGUAGES:
                if (isDown) {
                    this.emitTransitionParticles(particleX, particleY, 'down');
                    this.transitionToState(MENU_STATES.CENTRAL);
                } else if (isLeft) {
                    this.navigateLanguageBlocks(-1);
                } else if (isRight) {
                    this.navigateLanguageBlocks(1);
                } else if (isNorth && !this.isChangingLanguage) {
                    this.selectLanguage();
                }
                break;

            case MENU_STATES.SETTINGS:
                if (isP1Up) {
                    if (this.activeSlider === 0) {
                        // Solo volver al menú central si estamos en el primer slider
                        this.emitTransitionParticles(particleX, particleY, 'up');
                        this.transitionToState(MENU_STATES.CENTRAL);
                    } else {
                        // Navegar entre sliders
                        this.activeSlider = Math.max(0, this.activeSlider - 1);
                        this.highlightActiveSlider();
                    }
                } else if (isP1Down) {
                    this.activeSlider = Math.min(this.sliders.length - 1, this.activeSlider + 1);
                    this.highlightActiveSlider();
                }

                const slider = this.sliders[this.activeSlider];
                if (slider) {
                    if (this.inputSystem.isDown(INPUT_ACTIONS.LEFT, 'player1') || 
                        this.inputSystem.isDown(INPUT_ACTIONS.LEFT, 'player2')) {
                        slider.setValue(slider.getValue() - 0.01);
                    } else if (this.inputSystem.isDown(INPUT_ACTIONS.RIGHT, 'player1') || 
                             this.inputSystem.isDown(INPUT_ACTIONS.RIGHT, 'player2')) {
                        slider.setValue(slider.getValue() + 0.01);
                    }
                }
                break;
        }
    }

    highlightActiveSlider() {
        this.sliders.forEach((slider, index) => {
            const color = index === this.activeSlider ? 0x66ff99 : 0x44d27e;
            slider.handle.setFillStyle(color);
            slider.track.setStrokeStyle(index === this.activeSlider ? 2 : 0, 0xffffff);
        });
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