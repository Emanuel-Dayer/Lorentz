import { Scene } from "phaser";

import {
  getLanguageConfig,
  getTranslations,
} from "../../services/translations";

/**
 * Configuración centralizada de la interfaz de usuario de carga.
 * Todos los colores se definen en formato de string ('#RRGGBB').
 */
const UI_CONFIG = {
  // Colores principales (todos son STRING ahora)
  TITLE_COLOR: '#00ffff',     // Color base del título (Cyan)
  TITLE_SHADOW_COLOR: '#ff00ff', // Color de la sombra/glitch (Magenta)
  TEXT_COLOR: '#ffffff',     // Color del texto de porcentaje
  ASSET_TEXT_COLOR: '#cccccc', // Color del texto del asset cargado (más claro)
  
  // Colores de la barra (STRING, serán convertidos a 0x para las formas)
  BACKGROUND_COLOR: '#111111', // Color del fondo de la barra
  BORDER_COLOR: '#00ffff',    // Color del borde (Cyan)
  FILL_COLOR: '#00ff00',      // Color de relleno de la barra (Verde)
  
  // Dimensiones
  BAR_WIDTH: 800,            // Ancho fijo de la barra de carga
  BAR_HEIGHT: 40,            // Alto fijo de la barra de carga
};


export class Preload extends Scene {
  #language;
  // Variables para los elementos de UI/Efectos
  loadBar;
  loadBarBg;
  percentText;
  assetText;
  titleText;
  glitchTimer; // Se añade glitchTimer como propiedad de la clase
  
  // ==========================================================
  // VARIABLES DE CONTROL DE CARGA
  // ==========================================================

  #isAssetsLoaded = false;

  // Tiempo mínimo falso de carga (en ms)
  #MIN_LOAD_TIME_MS = 3000; // 3 segundos de ESPERA MÍNIMA después de la carga

  constructor() {
    super("Preload");
  }

  // Usamos init para tareas muy rápidas y configuración visual
  init() {
    // Establecer el color de fondo a negro
    this.cameras.main.setBackgroundColor('#000000');
  }
  
  /**
   * Convierte un color hexadecimal de string (#RRGGBB) a su valor numérico (0xRRGGBB).
   * @param {string} hex - Color en formato string (#RRGGBB).
   * @returns {number} Color en formato numérico (0xRRGGBB).
   */
  _hexToNumber(hex) {
    // Quita el '#' inicial y parsea el resto como hexadecimal
    return parseInt(hex.slice(1), 16);
  }

  preload() {
    // ==========================================================
    // 1. CONFIGURACIÓN DE UI (MOVIDO a _setupUI())
    // ==========================================================
    this._setupUI();

    // ==========================================================
    // 2. LISTENERS DE EVENTOS DE CARGA (Actualizan la UI)
    // ==========================================================
    const barWidth = UI_CONFIG.BAR_WIDTH;
    
    this.load.on('progress', (value) => {
        // La barra de progreso solo necesita actualizar su ancho
        this.loadBar.width = (barWidth - 4) * value; 
        this.percentText.setText(Math.round(value * 100) + '%');
    });

    this.load.on('fileprogress', (file) => {
        this.assetText.setText(`Cargando: ${file.key} (${file.type})`);
        console.log(`Cargando asset: ${file.key} (${file.type})`);
    });
    
    // Al completar la carga REAL de assets:
    this.load.once('complete', () => {
        this.#isAssetsLoaded = true;
        this.assetText.setText('Carga de assets completa. Esperando...');
        
        // ==========================================================
        // TIEMPO DE ESPERA FORZADO antes de iniciar la escena
        // ==========================================================
        this.time.delayedCall(this.#MIN_LOAD_TIME_MS, this._startScene, [], this);
    });
    
    // ==========================================================
    // 3. EFECTO GLITCH VISUAL (Solo el título)
    // ==========================================================
    this._setupGlitchEffect();

    // -----------------------------------------------------
    // 4. CARGA DE ASSETS REALES DEL JUEGO (DEBE IR DESPUÉS DE LISTENERS)
    // -----------------------------------------------------

    // Assets de idiomas
    this.load.image('flag_es', 'assets/LanguagesIcons/Spanish.svg');
    this.load.image('flag_pt', 'assets/LanguagesIcons/Portuguese.svg');
    this.load.image('flag_de', 'assets/LanguagesIcons/German.svg');
    this.load.image('flag_en', 'assets/LanguagesIcons/English.svg');

    // carga de asests 
    this.load.setPath("assets");
      this.load.image('logo', 'logo.png');
      this.load.image('background', 'bg.png');

      // Carga de sonidos
      this.load.audio('ParticulaRebota', 'ParticulaRebota.wav');
      this.load.audio('ColisionObstaculo', 'ColisionObstaculo.wav');
      
    
    // -----------------------------------------------------
    // 5. CONFIGURACIÓN DE IDIOMA
    // -----------------------------------------------------
    this.#language = getLanguageConfig();
  }

  /**
   * Obtiene las traducciones, limpia la UI e inicia la escena 'Menu'.
   * Esta funciónes llamada SOLO después de la espera forzada.
   */
  _startScene() {
      // Obtener traducciones y luego iniciar la escena
      this.assetText.setText('Inicializando sistema de juego...');
      
      getTranslations(this.#language, () => {
          // Limpiar la UI y detener efectos
          this.loadBarBg.destroy();
          this.loadBar.destroy();
          this.percentText.destroy();
          this.assetText.destroy();
          this.titleText.destroy();
          
          this.glitchTimer.destroy();

          // Iniciar la siguiente escena ('Menu')
          this.scene.start('Menu', { language: this.#language });
      });
  }
  
  /**
   * Configura todos los elementos visuales de la barra de carga y textos.
   */
  _setupUI() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    const barWidth = UI_CONFIG.BAR_WIDTH;
    const barHeight = UI_CONFIG.BAR_HEIGHT;
    const x = width / 2 - barWidth / 2;
    const y = height / 2 + 150; // Ajusta el espaciado

    // Título con efecto glitch (usando strings directamente)
    this.titleText = this.add.text(width / 2, height / 2 - 150, 'ARCADE SYSTEM 1.0', {
        fontFamily: 'Consolas, monospace',
        fontSize: '72px',
        color: UI_CONFIG.TITLE_COLOR, 
        shadow: { offsetX: 0, offsetY: 0, color: UI_CONFIG.TITLE_SHADOW_COLOR, blur: 10, fill: true } 
    }).setOrigin(0.5).setDepth(100);

    // Contorno de la barra de carga (usando la función de conversión)
    const bgColorNum = this._hexToNumber(UI_CONFIG.BACKGROUND_COLOR);
    const borderColorNum = this._hexToNumber(UI_CONFIG.BORDER_COLOR);
    const fillColorNum = this._hexToNumber(UI_CONFIG.FILL_COLOR);
    
    this.loadBarBg = this.add.rectangle(x, y, barWidth, barHeight, bgColorNum).setOrigin(0, 0);
    this.loadBarBg.setStrokeStyle(2, borderColorNum); 

    // Barra de carga (se llenará) (usando la función de conversión)
    this.loadBar = this.add.rectangle(x + 2, y + 2, 0, barHeight - 4, fillColorNum).setOrigin(0, 0);

    // Texto de porcentaje (usando strings)
    this.percentText = this.add.text(width / 2, y + barHeight / 2, '0%', {
        fontSize: '22px',
        color: UI_CONFIG.TEXT_COLOR,
        fontStyle: 'bold'
    }).setOrigin(0.5);

    // Texto del archivo actual (usando strings)
    this.assetText = this.add.text(width / 2, y + barHeight + 30, 'Cargando assets...', {
        fontSize: '20px',
        color: UI_CONFIG.ASSET_TEXT_COLOR,
        fontFamily: 'Consolas, monospace',
    }).setOrigin(0.5);
  }

  create() {

  }
  
  /**
   * Aplica un efecto de glitch simulado al texto del título.
   */
  _setupGlitchEffect() {
      this.glitchTimer = this.time.addEvent({
          delay: 50, // Intervalo muy corto para un glitch rápido
          callback: () => {
              // 40% de probabilidad de glitch en cada tick
              const isGlitching = Phaser.Math.Between(0, 100) < 40; 
              
              if (isGlitching) {
                  // Pequeño desplazamiento aleatorio
                  const offsetX = Phaser.Math.Between(-3, 3);
                  const offsetY = Phaser.Math.Between(-3, 3);
                  
                  // Color principal aleatorio entre Cyan y Magenta (usando los valores STRING)
                  const color = Phaser.Math.Between(0, 1) === 0 ? UI_CONFIG.TITLE_COLOR : UI_CONFIG.TITLE_SHADOW_COLOR;
                  
                  this.titleText.setShadow(offsetX, offsetY, color, 5, true, false);
                  this.titleText.setColor(color);
                  // Añadir una pequeña distorsión en el texto (ruido)
                  this.titleText.setText(this._distortText(this.titleText.text));

              } else {
                  // Restablecer al estado normal
                  this.titleText.setShadow(0, 0, UI_CONFIG.TITLE_SHADOW_COLOR, 5, true, false);
                  this.titleText.setColor(UI_CONFIG.TITLE_COLOR);
                  this.titleText.setText('ARCADE SYSTEM 1.0');
              }
          },
          callbackScope: this,
          loop: true
      });
  }

  /**
   * Distorsiona aleatoriamente unos pocos caracteres del texto para simular un glitch.
   * @param {string} text - Texto de entrada.
   * @returns {string} Texto con algunos caracteres distorsionados.
   */
  _distortText(text) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
        // Solo distorsionar un carácter por cada 20
        if (Phaser.Math.Between(0, 20) === 0) {
            // Caracteres ASCII aleatorios (simulando corrupción)
            result += String.fromCharCode(Phaser.Math.Between(33, 126));
        } else {
            result += text[i];
        }
    }
    return result;
  }
}
