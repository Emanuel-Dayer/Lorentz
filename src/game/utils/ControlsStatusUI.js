import { INPUT_ACTIONS } from "./InputSystem";

export class ControlsStatusUI {
  /**
   * @param {Phaser.Scene} scene La escena de Phaser.
   * @param {InputSystem} inputSystem La instancia del sistema de entrada.
   */
  constructor(scene, inputSystem) {
    this.scene = scene;
    this.inputSystem = inputSystem;
    this.keyMap1 = inputSystem.keyMap1;
    this.keyMap2 = inputSystem.keyMap2;

    this.allUIElements = []; // Array para controlar la visibilidad de todos los elementos.

    // --- Referencias a objetos de UI ---
    this.p1StickL = null;
    this.p1StickR = null;
    this.p2StickL = null;
    this.p2StickR = null;
    this.p1GamepadLight = null;
    this.p2GamepadLight = null;
    this.p1ActionLights = {};
    this.p2ActionLights = {};
    this.p1KeyStatusText = null;
    this.p2KeyStatusText = null;
    this.p1ButtonStatusText = null;
    this.p2ButtonStatusText = null;
    this.p1GamepadInfoText = null;
    this.p2GamepadInfoText = null;

    this.ACTION_MAP = [
      { action: INPUT_ACTIONS.NORTH, label: 'Norte (Lanzar)' },
      { action: INPUT_ACTIONS.EAST, label: 'Este' },
      { action: INPUT_ACTIONS.SOUTH, label: 'Sur' },
      { action: INPUT_ACTIONS.WEST, label: 'Oeste' },
    ];

    this.create();
  }

  create() {
    const { width, height } = this.scene.cameras.main;
    const UI_HEIGHT = 320;
    const UI_Y_CENTER = height - (UI_HEIGHT / 2) - 20;
    const UI_P1_X = width * 0.25;
    const UI_P2_X = width * 0.75;
    const UI_TOP = UI_Y_CENTER - UI_HEIGHT / 2;
    const LIGHT_SIZE = 10;
    const INACTIVE_COLOR = 0x555555;
    const ROW_SPACING = 35;
    const lightX_P1 = width * 0.05;
    const lightX_P2 = width * 0.95;

    // --- Contenedor Principal ---
    const container = this.scene.add.container(0, 0);
    this.allUIElements.push(container);
    container.setDepth(200);

    // Fondo del Panel de UI
    const graphics = this.scene.add.graphics({ fillStyle: { color: 0x1c2833, alpha: 0.95 } });
    const uiPanelWidth = width - 20;
    graphics.fillRoundedRect(10, UI_TOP - 10, uiPanelWidth, UI_HEIGHT + 20, 15);
    graphics.lineStyle(3, 0x4a6572, 1);
    graphics.strokeRoundedRect(10, UI_TOP - 10, uiPanelWidth, UI_HEIGHT + 20, 15);
    container.add(graphics);

    // Separador central
    const separator = this.scene.add.line(0, 0, width / 2, UI_TOP, width / 2, UI_TOP + UI_HEIGHT, 0x4a6572).setOrigin(0);
    container.add(separator);

    const labelStyle = { fontFamily: "Arial", fontSize: 22, color: '#FFFFFF', backgroundColor: '#1c2833', padding: { x: 5, y: 3 } };
    const smallTextStyle = { fontSize: 20, color: "#CCCCCC", backgroundColor: '#1c2833', padding: { x: 5, y: 3 } };

    let currentY = UI_TOP + 25;

    // Fila 1: Gamepad Status
    this.p1GamepadLight = this.scene.add.circle(lightX_P1 + 400, currentY, 8, INACTIVE_COLOR);
    this.p2GamepadLight = this.scene.add.circle(lightX_P2 - 400, currentY, 8, INACTIVE_COLOR);
    container.add([
        this.scene.add.text(lightX_P1, currentY, "GP0 - GAMEPAD PLAYER ONE", { ...labelStyle, color: '#00aaff', fontSize: 24, backgroundColor: null }).setOrigin(0, 0.5),
        this.p1GamepadLight,
        this.scene.add.text(lightX_P2, currentY, "GP1 - GAMEPAD PLAYER TWO", { ...labelStyle, color: '#ff5555', fontSize: 24, backgroundColor: null }).setOrigin(1, 0.5),
        this.p2GamepadLight
    ]);

    currentY += ROW_SPACING;

    // Fila 1.5: Información del Gamepad
    const gamepadInfoStyle = { ...smallTextStyle, color: '#AAAAAA', fontStyle: 'italic', backgroundColor: null, fontSize: 18 };
    this.p1GamepadInfoText = this.scene.add.text(lightX_P1, currentY, "Control no detectado", gamepadInfoStyle).setOrigin(0, 0.5);
    this.p2GamepadInfoText = this.scene.add.text(lightX_P2, currentY, "Control no detectado", gamepadInfoStyle).setOrigin(1, 0.5);
    container.add([this.p1GamepadInfoText, this.p2GamepadInfoText]);

    currentY += ROW_SPACING + 10;

    // Filas de Acciones (2 a 5)
    this.ACTION_MAP.forEach((mapping, index) => {
        const actionY = currentY + (ROW_SPACING * index);
        const { action, label } = mapping;
        
        const p1Key = this.keyMap1[action];
        this.p1ActionLights[action] = this.scene.add.circle(lightX_P1 + 300, actionY, LIGHT_SIZE, INACTIVE_COLOR).setStrokeStyle(2, 0x00aaff, 0.5);
        
        const p2Key = this.keyMap2[action];
        this.p2ActionLights[action] = this.scene.add.circle(lightX_P2 - 350, actionY, LIGHT_SIZE, INACTIVE_COLOR).setStrokeStyle(2, 0xff5555, 0.5);

        container.add([
            this.scene.add.text(lightX_P1, actionY, `${label} (${p1Key})`, { ...labelStyle, color: '#00aaff', backgroundColor: null }).setOrigin(0, 0.5),
            this.p1ActionLights[action],
            this.scene.add.text(lightX_P2, actionY, `${label} (${p2Key})`, { ...labelStyle, color: '#ff5555', backgroundColor: null }).setOrigin(1, 0.5),
            this.p2ActionLights[action]
        ]);
    });

    currentY += ROW_SPACING * this.ACTION_MAP.length + 15;

    // Fila 6: Teclas presionadas
    this.p1KeyStatusText = this.scene.add.text(lightX_P1 + 220, currentY, "Ninguna", { ...smallTextStyle, color: '#00aaff', backgroundColor: null }).setOrigin(0, 0.5);
    this.p2KeyStatusText = this.scene.add.text(lightX_P2, currentY, "Ninguna", { ...smallTextStyle, color: '#ff5555', backgroundColor: null }).setOrigin(1, 0.5);
    container.add([
        this.scene.add.text(lightX_P1, currentY, "Teclas Teclado:", { ...labelStyle, color: '#CCCCCC', backgroundColor: null }).setOrigin(0, 0.5),
        this.p1KeyStatusText,
        this.scene.add.text(lightX_P2 - 500, currentY, "Teclas Teclado:", { ...labelStyle, color: '#CCCCCC', backgroundColor: null }).setOrigin(1, 0.5),
        this.p2KeyStatusText
    ]);
    
    currentY += ROW_SPACING;

    // Fila 7: Botones de Gamepad
    this.p1ButtonStatusText = this.scene.add.text(lightX_P1 + 240, currentY, "Ninguno", { ...smallTextStyle, color: '#00aaff', backgroundColor: null }).setOrigin(0, 0.5);
    this.p2ButtonStatusText = this.scene.add.text(lightX_P2, currentY, "Ninguno", { ...smallTextStyle, color: '#ff5555', backgroundColor: null }).setOrigin(1, 0.5);
    container.add([
        this.scene.add.text(lightX_P1, currentY, "Botones Gamepad:", { ...labelStyle, color: '#CCCCCC', backgroundColor: null }).setOrigin(0, 0.5),
        this.p1ButtonStatusText,
        this.scene.add.text(lightX_P2 - 480, currentY, "Botones Gamepad:", { ...labelStyle, color: '#CCCCCC', backgroundColor: null }).setOrigin(1, 0.5),
        this.p2ButtonStatusText
    ]);

    // Visualización de Joysticks
    const stickSize = 60;
    const stickMargin = 80;
    const stickY = UI_Y_CENTER - 55;
    this.stickBounds = { size: stickSize, y: stickY };
    
    const p1StickBaseX = UI_P1_X + 300;
    const p2StickBaseX = UI_P2_X - 300;

    const createStickBase = (x, y, size, color) => {
        const base = this.scene.add.circle(x, y, size + 2, 0x2c3e50).setStrokeStyle(2, color, 0.7);
        container.add(base);
    };

    createStickBase(p1StickBaseX - stickMargin, stickY, stickSize, 0x00aaff);
    createStickBase(p1StickBaseX + stickMargin, stickY, stickSize, 0x00aaff);
    this.p1StickL = this.scene.add.circle(p1StickBaseX - stickMargin, stickY, 15, 0x00aaff);
    this.p1StickR = this.scene.add.circle(p1StickBaseX + stickMargin, stickY, 15, 0x00aaff);
    
    createStickBase(p2StickBaseX - stickMargin, stickY, stickSize, 0xff5555);
    createStickBase(p2StickBaseX + stickMargin, stickY, stickSize, 0xff5555);
    this.p2StickL = this.scene.add.circle(p2StickBaseX - stickMargin, stickY, 15, 0xff5555);
    this.p2StickR = this.scene.add.circle(p2StickBaseX + stickMargin, stickY, 15, 0xff5555);

    container.add([
        this.p1StickL, this.p1StickR, this.p2StickL, this.p2StickR,
        this.scene.add.text(p1StickBaseX - stickMargin, stickY - stickSize - 15, "L-Move", { ...labelStyle, color: '#00aaff' }).setOrigin(0.5),
        this.scene.add.text(p1StickBaseX + stickMargin, stickY - stickSize - 15, "R-Aim", { ...labelStyle, color: '#00aaff' }).setOrigin(0.5),
        this.scene.add.text(p2StickBaseX - stickMargin, stickY - stickSize - 15, "L-Move", { ...labelStyle, color: '#ff5555' }).setOrigin(0.5),
        this.scene.add.text(p2StickBaseX + stickMargin, stickY - stickSize - 15, "R-Aim", { ...labelStyle, color: '#ff5555' }).setOrigin(0.5)
    ]);

    // Guardar coordenadas originales
    this.p1StickL.originalX = this.p1StickL.x; this.p1StickL.originalY = this.p1StickL.y;
    this.p1StickR.originalX = this.p1StickR.x; this.p1StickR.originalY = this.p1StickR.y;
    this.p2StickL.originalX = this.p2StickL.x; this.p2StickL.originalY = this.p2StickL.y;
    this.p2StickR.originalX = this.p2StickR.x; this.p2StickR.originalY = this.p2StickR.y;
  }

  update() {
    this._updateControlStatus();
    this._updateStickVisuals("player1", this.p1StickL, this.p1StickR);
    this._updateStickVisuals("player2", this.p2StickL, this.p2StickR);
  }

  setVisible(isVisible) {
    this.allUIElements.forEach(el => el.setVisible(isVisible));
  }

  _updateStickVisuals(playerKey, stickL, stickR) {
    const gamepad = this.inputSystem.getGamepadInfo(playerKey);
    const stickRadius = this.stickBounds.size;

    if (gamepad) {
        stickL.x = stickL.originalX + (gamepad.axes[0] || 0) * stickRadius;
        stickL.y = stickL.originalY + (gamepad.axes[1] || 0) * stickRadius;
        stickR.x = stickR.originalX + (gamepad.axes[2] || 0) * stickRadius;
        stickR.y = stickR.originalY + (gamepad.axes[3] || 0) * stickRadius;
    } else {
        stickL.x = stickL.originalX; stickL.y = stickL.originalY;
        stickR.x = stickR.originalX; stickR.y = stickR.originalY;
    }
  }

  _updateControlStatus() {
    const gp1 = this.inputSystem.getGamepadInfo("player1");
    const gp2 = this.inputSystem.getGamepadInfo("player2");
    const activeColorP1 = 0x00aaff;
    const activeColorP2 = 0xff5555;
    const inactiveColor = 0x555555;

    // Player 1
    this.p1GamepadLight.setFillStyle(gp1 ? activeColorP1 : inactiveColor);
    this.p1GamepadInfoText.setText(gp1 ? gp1.id : "Control no detectado");
    this.ACTION_MAP.forEach(({ action }) => {
        const isDown = this.inputSystem.isDown(action, "player1");
        this.p1ActionLights[action].setFillStyle(isDown ? activeColorP1 : inactiveColor);
    });
    if (gp1) {
        const pressed = gp1.buttons.map((b, i) => b.pressed ? `B${i}` : null).filter(b => b);
        this.p1ButtonStatusText.setText(pressed.length > 0 ? pressed.join(", ") : "Ninguno");
    } else {
        this.p1ButtonStatusText.setText("Ninguno");
    }
    const pushedKeys1 = Object.keys(this.keyMap1).filter(action => this.scene.input.keyboard.addKey(this.keyMap1[action]).isDown);
    this.p1KeyStatusText.setText(pushedKeys1.length > 0 ? pushedKeys1.map(a => this.keyMap1[a]).join(", ") : "Ninguna");

    // Player 2
    this.p2GamepadLight.setFillStyle(gp2 ? activeColorP2 : inactiveColor);
    this.p2GamepadInfoText.setText(gp2 ? gp2.id : "Control no detectado");
    this.ACTION_MAP.forEach(({ action }) => {
        const isDown = this.inputSystem.isDown(action, "player2");
        this.p2ActionLights[action].setFillStyle(isDown ? activeColorP2 : inactiveColor);
    });
    if (gp2) {
        const pressed = gp2.buttons.map((b, i) => b.pressed ? `B${i}` : null).filter(b => b);
        this.p2ButtonStatusText.setText(pressed.length > 0 ? pressed.join(", ") : "Ninguno");
    } else {
        this.p2ButtonStatusText.setText("Ninguno");
    }
    const pushedKeys2 = Object.keys(this.keyMap2).filter(action => this.scene.input.keyboard.addKey(this.keyMap2[action]).isDown);
    this.p2KeyStatusText.setText(pushedKeys2.length > 0 ? pushedKeys2.map(a => this.keyMap2[a]).join(", ") : "Ninguna");
  }
}