/**
 * Constantes de acciones de entrada disponibles en el sistema
 * Estas constantes evitan hardcodear strings y proporcionan autocompletado
 */
export const INPUT_ACTIONS = {
  UP: "up", // Movimiento hacia arriba (eje Y negativo)
  DOWN: "down", // Movimiento hacia abajo (eje Y positivo)
  LEFT: "left", // Movimiento hacia la izquierda (eje X negativo)
  RIGHT: "right", // Movimiento hacia la derecha (eje X positivo)
  NORTH: "north", // Botón norte del gamepad (B3, Y en XBOX)
  EAST: "east", // Botón este del gamepad (B1, B en XBOX)
  SOUTH: "south", // Botón sur del gamepad (B0, A en XBOX)
  WEST: "west", // Botón oeste del gamepad (B2, X en XBOX)
};

/**
 * Sistema de entrada unificado y optimizado para teclado y gamepad.
 *
 * Características principales:
 * - Detección de pulsación simple (`isJustPressed`) y continua (`isDown`).
 * - Caché de gamepads para evitar llamadas repetitivas a la API.
 * - Soporte para detección de conexión/desconexión dinámica de controles.
 */
export default class InputSystem {
  /**
   * @param {Phaser.Scene} scene - La escena de Phaser a la que pertenece el sistema de entrada.
   * @param {Object} [keyMap1] - Mapeo de teclas para el Jugador 1 (ej: { UP: 'W', ... }).
   * @param {Object} [keyMap2] - Mapeo de teclas para el Jugador 2 (ej: { UP: 'ARROW_UP', ... }).
   */
  constructor(scene, keyMap1, keyMap2) {
    this.scene = scene;
    this.keyMap1 = keyMap1;
    this.keyMap2 = keyMap2;

    // Estado interno para la detección de "Just Pressed" (pulsación simple)
    this.prevKeyStates = new Map();
    this.prevGamepadStates = new Map();

    // Referencias de Gamepad. Se refrescan constantemente en 'update'.
    this.gamepad1 = null;
    this.gamepad2 = null;

    // Estado para rastrear si los controles están intercambiados
    this.swapped = false;

    // Flag para evitar swaps múltiples por una sola pulsación larga.
    this._swapDebounce = false;

    // Inicializar el manejo de teclado de Phaser
    this.keys = {
      player1: {},
      player2: {},
    };

    this._setupKeyboard(keyMap1, 'player1');
    this._setupKeyboard(keyMap2, 'player2');
    
    // Configurar listeners de Gamepad (específicos de la API de navegador)
    // Estos solo manejan los eventos de conexión/desconexión, no el estado.
    window.addEventListener("gamepadconnected", (e) => this._handleGamepadConnection(e, true));
    window.addEventListener("gamepaddisconnected", (e) => this._handleGamepadConnection(e, false));
  }

  /**
   * Configura las teclas de teclado de Phaser.
   * @param {Object} keyMap - Mapeo de teclas.
   * @param {string} player - 'player1' o 'player2'.
   */
  _setupKeyboard(keyMap, player) {
    if (!keyMap) return;
    for (const action in keyMap) {
      const keyName = keyMap[action];
      this.keys[player][action] = this.scene.input.keyboard.addKey(keyName);
    }
  }

  /**
   * Maneja la conexión o desconexión de un gamepad.
   * Nota: La actualización real del objeto gamepad se hace en `update()`.
   * @param {GamepadEvent} e - Evento de gamepad.
   * @param {boolean} isConnected - true si conectado, false si desconectado.
   */
  _handleGamepadConnection(e, isConnected) {
    const gamepad = e.gamepad;
    /*
    console.log(`Gamepad ${isConnected ? 'conectado' : 'desconectado'} en índice ${gamepad.index}: ${gamepad.id}`);
    */
   
    // No es necesario asignar aquí, ya que `update()` lo maneja en cada frame
    // Pero es útil para debug o si solo queremos saber qué index usa cada jugador.
    if (isConnected) {
      if (gamepad.index === 0) {
        this.gamepad1 = gamepad;
      } else if (gamepad.index === 1) {
        this.gamepad2 = gamepad;
      }
    } else {
      if (this.gamepad1 && this.gamepad1.index === gamepad.index) {
        this.gamepad1 = null;
      }
      if (this.gamepad2 && this.gamepad2.index === gamepad.index) {
        this.gamepad2 = null;
      }
    }
  }

  /**
   * ACTUALIZA el estado de los gamepads y guarda el estado anterior para
   * la detección de pulsaciones simples.
   * * FIX IMPORTANTE: Llama a navigator.getGamepads() en cada frame para obtener
   * la referencia más reciente del objeto Gamepad, lo cual es necesario en
   * algunos navegadores para refrescar los valores de axes y buttons.
   */
    update() {
      // Obtener la lista de gamepads más reciente.
      const gamepads = navigator.getGamepads();
      
      // Actualizar las referencias con la data fresca, respetando el estado de 'swapped'
      if (this.swapped) {
        this.gamepad1 = gamepads[1] || null;
        this.gamepad2 = gamepads[0] || null;
      } else {
        this.gamepad1 = gamepads[0] || null;
        this.gamepad2 = gamepads[1] || null;
      }
    }

  /**
   * Guarda el estado actual de las entradas para el próximo ciclo de `update`:
   * @param {string} player - 'player1' o 'player2'.
   */
  _saveCurrentState(player) {
    // Teclado
    const currentKey = {};
    for (const action in this.keys[player]) {
      currentKey[action] = this.keys[player][action].isDown;
    }
    this.prevKeyStates.set(player, currentKey);

    // Gamepad
    const gamepad = player === 'player1' ? this.gamepad1 : this.gamepad2;
    if (gamepad) {
      // Usar el estado mapeado actual para guardarlo como estado previo
      const currentGamepad = this._mapGamepad(gamepad);
      this.prevGamepadStates.set(player, currentGamepad);
    } else {
      this.prevGamepadStates.delete(player);
    }
  }

  /**
   * método para ser llamado al final del ciclo de juego.
   * Guarda el estado actual para que `isJustPressed` funcione en el siguiente fotograma.
   */
  lateUpdate() {
    this._saveCurrentState('player1');
    this._saveCurrentState('player2');
  }

  /**
   * Mapea los ejes y botones de un Gamepad a las acciones INPUT_ACTIONS.
   * Se asume el mapeo de un control arcade genérico.
   * @param {Gamepad} gamepad - Objeto Gamepad nativo.
   * @returns {Object} Un objeto donde las claves son INPUT_ACTIONS y los valores son booleanos.
   */
  _mapGamepad(gamepad) {
    if (!gamepad) {
      return {};
    }

    const deadzone = 0.25;
    const axes = gamepad.axes;
    const buttons = gamepad.buttons;

    return {
      // Mapeo de acciones
      [INPUT_ACTIONS.UP]: axes[1] < -deadzone,
      [INPUT_ACTIONS.DOWN]: axes[1] > deadzone,
      [INPUT_ACTIONS.LEFT]: axes[0] < -deadzone,
      [INPUT_ACTIONS.RIGHT]: axes[0] > deadzone,
      [INPUT_ACTIONS.NORTH]: buttons[3] && buttons[3].pressed,
      [INPUT_ACTIONS.EAST]: buttons[1] && buttons[1].pressed,
      [INPUT_ACTIONS.SOUTH]: buttons[0] && buttons[0].pressed,
      [INPUT_ACTIONS.WEST]: buttons[2] && buttons[2].pressed,
      
      // CORRECCIÓN: Incluir el array de botones para otras comprobaciones, como isSwapButtonPressed
      buttons: buttons.map(b => b.pressed)
    };
  }
  
  /**
   * Verifica si una acción está actualmente presionada (pulsación continua).
   * Prioriza el Gamepad si está conectado.
   * @param {string} action - Una constante de INPUT_ACTIONS.
   * @param {string} [player='player1'] - Jugador a consultar ('player1' o 'player2').
   * @returns {boolean} True si la acción está presionada.
   */
  isDown(action, player = "player1") {
    // Comprobar Gamepad
    let gamepadIsDown = false;
    const gamepad = this.getGamepadInfo(player);
    if (gamepad) {
      const mapped = this._mapGamepad(gamepad);
      gamepadIsDown = mapped[action] || false;
    }

    // Comprobar Teclado
    let keyIsDown = false;
    const key = this.keys[player]?.[action];
    if (key) {
      keyIsDown = key.isDown;
    }

    return gamepadIsDown || keyIsDown;
  }

  /**
   * Verifica si una acción fue JUSTO presionada en este ciclo (pulsación simple).
   * @param {string} action - Una constante de INPUT_ACTIONS.
   * @param {string} [player='player1'] - Jugador a consultar ('player1' o 'player2').
   * @returns {boolean} True si la acción fue presionada en este frame, pero no en el anterior.
   */
  isJustPressed(action, player = "player1") {
    // Comprobar Gamepad
    let gamepadJustPressed = false;
    const gamepad = this.getGamepadInfo(player);
    const prevGamepadState = this.prevGamepadStates.get(player);
    if (gamepad && prevGamepadState) {
      const currentGamepadState = this._mapGamepad(gamepad);
      gamepadJustPressed = currentGamepadState[action] && !prevGamepadState[action];
    }

    // Comprobar Teclado
    let keyJustPressed = false;
    const key = this.keys[player]?.[action];
    const prevKeyState = this.prevKeyStates.get(player);
    if (key && prevKeyState) {
      keyJustPressed = key.isDown && !prevKeyState[action];
    }

    return gamepadJustPressed || keyJustPressed;
  }

  /**
   * Intercambia los controles entre el jugador 1 y el jugador 2.
   */
  swapPlayers() {
    this.swapped = !this.swapped;
    // Activamos el debounce para evitar otro swap inmediato.
    this._swapDebounce = true;
  }

  /**
   * Verifica si el botón de sistema (B16) fue presionado en alguno de los mandos.
   * @returns {boolean} True si el botón fue presionado en este fotograma.
   */
  isSwapButtonPressed() {
    const gamepads = navigator.getGamepads();
    const gp0 = gamepads[0];
    const gp1 = gamepads[1];

    const isPressed = (gp0 && gp0.buttons[16]?.pressed) || (gp1 && gp1.buttons[16]?.pressed);

    if (isPressed) {
      // Si el botón está presionado, pero el debounce está activo, no hacemos nada.
      if (this._swapDebounce) {
        return false;
      }
      // Si el botón está presionado y no hay debounce, es una pulsación válida.
      return true;
    } else {
      // Si el botón NO está presionado, reseteamos el debounce para la próxima pulsación.
      this._swapDebounce = false;
      return false;
    }
  }

  /**
   * Devuelve la información del gamepad para un jugador específico.
   * @param {string} player - 'player1' o 'player2'.
   * @returns {Gamepad|null} El objeto Gamepad o null si no está conectado.
   */
  getGamepadInfo(player) {
    return player === 'player1' ? this.gamepad1 : this.gamepad2;
  }
}
