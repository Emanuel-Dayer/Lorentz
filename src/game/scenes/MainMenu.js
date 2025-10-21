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

        // Crear elementos UI base
        this.createPalas();
        this.createParticle();
        this.createMenuTexts();
        this.createLanguageBlocks();
        this.createSettingsMenu();
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

transitionToState(newState) {
        if (this.isTransitioning || (this.isChangingLanguage && newState !== MENU_STATES.CENTRAL)) {
            return;
        }

        const { width, height } = this.scale;
        const duration = 1000;
        const ease = 'Power2';

        this.isTransitioning = true;
        this.currentState = newState;

        // Ocultar todos los elementos
        this.hideAllElements();

        // Resetear posición de palas (separar las operaciones)
        this.palaP1.setPosition(0, height/2);
        this.palaP1.width = this.palaBaseWidth;
        
        this.palaP2.setPosition(width, height/2);
        this.palaP2.width = this.palaBaseWidth;

        switch(newState) {
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

        // Animar cámara al centro
        this.camera.pan(width/2, height/2, duration, ease);
        this.camera.zoomTo(1, duration, ease);

        // Restaurar palas
        this.tweens.add({
            targets: [this.palaP1, this.palaP2],
            width: this.palaBaseWidth,
            y: height/2,
            duration,
            ease
        });

        // Mostrar partícula en el centro
        this.showParticleInCenter();
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

        if (direction === 'vertical') {
            // Para movimiento vertical, endXorY es ignorado y usamos goUp
            endY = goUp ? this.scale.height * 0.2 : this.scale.height * 0.8;
        } else {
            // Para movimiento horizontal (paletas), endXorY es la posición X final
            endX = endXorY;
        }

        // Crear línea de trayectoria
        this.particleTrail.clear();
        this.particleTrail.lineStyle(2, 0xffffff, 0.5);
        this.particleTrail.beginPath();
        this.particleTrail.moveTo(startX, startY);
        this.particleTrail.lineTo(endX, endY);
        this.particleTrail.strokePath();

        // Animar partícula
        this.tweens.add({
            targets: this.particula,
            x: endX,
            y: endY,
            duration: duration * 1.5,
            ease: 'Power1',
            onComplete: () => {
                this.particleTrail.clear();
            }
        });
    }

    hideAllElements() {
        Object.values(this.texts).forEach(text => text.setVisible(false));
        this.helloText?.setVisible(false);
        this.howAreUText?.setVisible(false);
        this.languageBlocks.forEach(block => block.container.setVisible(false));
        this.particula.setVisible(false);
        this.particleTrail.clear();
        this.stabilizationField?.setVisible(false);
        this.sliders.forEach(slider => slider.setVisible(false));
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

        this.inputSystem.lateUpdate();
    }

    handleMenuInput() {
        // Si estamos cambiando el idioma, solo permitir la navegación en LANGUAGES
        if (this.isChangingLanguage && this.currentState !== MENU_STATES.LANGUAGES) {
            return;
        }

        const isP1North = this.inputSystem.isJustPressed(INPUT_ACTIONS.NORTH, 'player1');
        const isP1East = this.inputSystem.isJustPressed(INPUT_ACTIONS.EAST, 'player1');
        const isP1South = this.inputSystem.isJustPressed(INPUT_ACTIONS.SOUTH, 'player1');

        // Manejo de estados
        switch(this.currentState) {
            case MENU_STATES.CENTRAL:
                if (this.inputSystem.isJustPressed(INPUT_ACTIONS.LEFT, 'player1')) {
                    this.transitionToState(MENU_STATES.COOP);
                } else if (this.inputSystem.isJustPressed(INPUT_ACTIONS.RIGHT, 'player1')) {
                    this.transitionToState(MENU_STATES.VERSUS);
                } else if (this.inputSystem.isJustPressed(INPUT_ACTIONS.UP, 'player1')) {
                    this.transitionToState(MENU_STATES.LANGUAGES);
                } else if (this.inputSystem.isJustPressed(INPUT_ACTIONS.DOWN, 'player1')) {
                    this.transitionToState(MENU_STATES.SETTINGS);
                }
                break;

            case MENU_STATES.LANGUAGES:
                if (this.inputSystem.isJustPressed(INPUT_ACTIONS.LEFT, 'player1')) {
                    this.navigateLanguageBlocks(-1);
                } else if (this.inputSystem.isJustPressed(INPUT_ACTIONS.RIGHT, 'player1')) {
                    this.navigateLanguageBlocks(1);
                } else if (isP1North && !this.isChangingLanguage) {
                    this.selectLanguage();
                }
                break;

            case MENU_STATES.SETTINGS:
                if (this.inputSystem.isJustPressed(INPUT_ACTIONS.UP, 'player1')) {
                    this.activeSlider = Math.max(0, this.activeSlider - 1);
                    this.highlightActiveSlider();
                } else if (this.inputSystem.isJustPressed(INPUT_ACTIONS.DOWN, 'player1')) {
                    this.activeSlider = Math.min(this.sliders.length - 1, this.activeSlider + 1);
                    this.highlightActiveSlider();
                }

                const slider = this.sliders[this.activeSlider];
                if (slider) {
                    if (this.inputSystem.isDown(INPUT_ACTIONS.LEFT, 'player1')) {
                        slider.setValue(slider.getValue() - 0.01);
                    } else if (this.inputSystem.isDown(INPUT_ACTIONS.RIGHT, 'player1')) {
                        slider.setValue(slider.getValue() + 0.01);
                    }
                }
                break;

            case MENU_STATES.VERSUS:
            case MENU_STATES.COOP:
                if (isP1North) {
                    if (this.menuMusic?.isPlaying) {
                        this.menuMusic.stop();
                    }
                    this.scene.start("PreGame", { language: this.language });
                    return;
                }
                break;
        }

        // Botón de volver al centro (excepto si estamos en el centro o cambiando idioma)
        if (this.currentState !== MENU_STATES.CENTRAL && 
            !this.isChangingLanguage && 
            (isP1East || isP1South)) {
            this.transitionToState(MENU_STATES.CENTRAL);
        }
    }

    highlightActiveSlider() {
        this.sliders.forEach((slider, index) => {
            const color = index === this.activeSlider ? 0x66ff99 : 0x44d27e;
            slider.handle.setFillStyle(color);
            slider.track.setStrokeStyle(index === this.activeSlider ? 2 : 0, 0xffffff);
        });
    }
}