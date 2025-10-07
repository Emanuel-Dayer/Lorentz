import Phaser from "phaser";
import { DE, EN, ES, PT } from "../../enums/languages";
import { FETCHED, FETCHING, READY, TODO } from "../../enums/status";
import { getTranslations, getPhrase } from "../../services/translations";
import keys from "../../enums/keys";

export default class InitialMenu extends Phaser.Scene {
  #updatedTextInScene; // Texto dentro del botón 'Next'
  #helloText;
  #howAreUText;
  #updatedString;
  #helloKey;
  #howAreUKey;
  #wasChangedLanguage = TODO;
  #selectedLanguageContainer = null; // Rastrea el contenedor de botón seleccionado
  #nextButton; // Referencia al rectángulo del botón 'Next'
  #nextButtonOutline; // Referencia al delineado del botón 'Next'
  languageContainers = []; // Array para almacenar las referencias de los contenedores de idioma

  constructor() {
    super("Menu");
    // Asignación directa de las claves para mayor claridad y evitar 'this.' redundante.
    const { next, hello, howAreU } = keys.sceneInitialMenu;
    this.#updatedString = next;
    this.#helloKey = hello;
    this.#howAreUKey = howAreU;
  }

  init({ language }) {
    this.language = language;
  }

  create() {
    const { width, height } = this.scale;

    // Configuración general
    this.cameras.main.setBackgroundColor(0x333333);
    
    // --- Configuración de Botones de Idioma ---
    const yPos = height * 0.25;
    const spacing = width / 5; 
    const startX = spacing;
    
    // Al crear los botones, se les añade el efecto de delineado y hover
    this.languageContainers.push(this.createLanguageButton(startX * 1, yPos, 'flag_es', 'Español', ES));
    this.languageContainers.push(this.createLanguageButton(startX * 2, yPos, 'flag_de', 'Deutsch', DE)); 
    this.languageContainers.push(this.createLanguageButton(startX * 3, yPos, 'flag_en', 'English', EN)); 
    this.languageContainers.push(this.createLanguageButton(startX * 4, yPos, 'flag_pt', 'Português', PT));
    
    // --- Botón 'Next' ---
    this.#nextButton = this.add
      .rectangle(width * 0.5, height * 0.8, 300, 100, 0x44d27e) 
      .setInteractive({ useHandCursor: true }); 
    
    // Delineado para el botón 'Next' (por defecto invisible)
    this.#nextButtonOutline = this.add.rectangle(
        this.#nextButton.x, 
        this.#nextButton.y, 
        this.#nextButton.width + 6,
        this.#nextButton.height + 6, 
        0xffffff, // Color blanco
        0 // Inicialmente transparente
    ).setStrokeStyle(6, 0xffffff, 1) // Borde blanco
    .setVisible(false);
    
    // Asigna el manejador de click al botón principal
    this.#nextButton.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
        this.scene.start("Game", { language: this.language });
    });
      
    // Efectos Hover con Delineado para 'Next'
    this.#nextButton
      .on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => {
        if (this.#nextButton.active) { // Solo si está activo
          this.#nextButton.setFillStyle(0x66ff99);
          this.#nextButtonOutline.setVisible(true).setAlpha(1); // Muestra el delineado
        }
      })
      .on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => {
        this.#nextButton.setFillStyle(0x44d27e);
        this.#nextButtonOutline.setVisible(false); // Oculta el delineado
      });

    this.#updatedTextInScene = this.add
      .text(this.#nextButton.x, this.#nextButton.y, getPhrase(this.#updatedString), {
        color: "#ffffff",
        fontSize: '48px',
        fontStyle: 'bold'
      })
      .setOrigin(0.5)
      .setDepth(1); // Asegura que el texto esté encima del delineado
      
    // --- Display de Texto Dinámico ---
    const textStyle = {
      color: "#ffffff",
      fontSize: '42px',
      align: 'center'
    };
    
    this.#helloText = this.add.text(
      width * 0.5,
      height * 0.45,
      getPhrase(this.#helloKey),
      textStyle
    ).setOrigin(0.5); 
    
    this.#howAreUText = this.add.text(
      width * 0.5,
      height * 0.55,
      getPhrase(this.#howAreUKey),
      textStyle
    ).setOrigin(0.5); 
    
    // Resaltar idioma inicial 
    const initialLanguage = this.language || ES; 
    const initialContainer = this.languageContainers.find(c => c.languageCode === initialLanguage);
    if (initialContainer) {
      this.highlightSelection(initialContainer);
    }
  }

  // --- Helper para crear un botón de idioma (Bandera + Texto) ---
  createLanguageButton(x, y, imageKey, textLabel, languageCode) {
    const selectedAlpha = 0.3; // Alpha para el fondo seleccionado (variable local para referencia)

    // Fondo de selección/hover (invisible por defecto)
    const background = this.add.rectangle(0, 0, 220, 220, 0x44d27e, 0)
        .setDepth(-1)
        .setData('isBackground', true); 

    // Delineado (Outline) del botón de idioma (por defecto invisible)
    const outline = this.add.rectangle(0, 0, 224, 224, 0x000000, 0)
        .setStrokeStyle(4, 0xffffff, 1) // Borde blanco
        .setVisible(false)
        .setData('isOutline', true);
        
    // Imagen de Bandera
    const flag = this.add.image(0, -30, imageKey)
        .setDisplaySize(135, 90) 
        .setOrigin(0.5);
        
    // Texto de Idioma (No parpadea)
    const text = this.add.text(0, 50, textLabel, {
        color: '#ffffff', 
        fontSize: '28px',
        fontStyle: 'bold'
    }).setOrigin(0.5)
      .setData('isText', true); 
    
    // Contenedor
    const container = this.add.container(x, y, [outline, background, flag, text]);
    container.languageCode = languageCode; 

    // Configurar Interacción
    container.setSize(220, 220)
        .setInteractive({ useHandCursor: true })
        .on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, (pointer) => {
            // Permitir la selección si no es el idioma actual O si la carga previa falló.
            // La condición más importante es: no intentar cargar si ya está en estado FETCHING
            if (this.#wasChangedLanguage !== FETCHING) { 
                 this.highlightSelection(container); 
                 this.getTranslations(languageCode);
            }
        })
        .on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => {
            // Solo aplicar efectos de hover si el botón está ACTIVO (no en carga)
            if (container.input.enabled) { 
                container.setScale(1.05);
                // Efecto Hover: Muestra el delineado
                outline.setVisible(true).setAlpha(1); 
                
                // Si es el contenedor seleccionado, usa el alpha de selección, sino el gris claro de hover.
                if (this.#selectedLanguageContainer === container) {
                    background.setFillStyle(0x44d27e, selectedAlpha); 
                } else {
                    background.setFillStyle(0xAAAAAA, 0.2); 
                }
            }
        })
        .on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => {
             // Solo aplicar efectos de out si el botón está ACTIVO
            if (container.input.enabled) { 
                container.setScale(1.0);
                outline.setVisible(false); // Oculta el delineado
                
                // Si el contenedor NO está seleccionado, restablece el fondo a transparente.
                if (this.#selectedLanguageContainer !== container) {
                    background.setFillStyle(0x44d27e, 0); 
                } else {
                     // Si está seleccionado, mantiene el alpha de selección al salir del hover.
                     background.setFillStyle(0x44d27e, selectedAlpha);
                }
            }
        });
        
    return container;
  }
  
  // --- Función de Resaltado ---
  highlightSelection(newContainer) {
    const selectedAlpha = 0.3; // Alpha para el fondo seleccionado
    const selectedTextColor = '#44d27e'; // Color verde para el texto seleccionado

    // 1. Resetear el contenedor anterior (si existe y es diferente)
    if (this.#selectedLanguageContainer && this.#selectedLanguageContainer !== newContainer) {
      const oldBackground = this.#selectedLanguageContainer.list.find(item => item.getData('isBackground'));
      const oldText = this.#selectedLanguageContainer.list.find(item => item.getData('isText'));
      const oldOutline = this.#selectedLanguageContainer.list.find(item => item.getData('isOutline'));
      
      if (oldBackground) oldBackground.setFillStyle(0x44d27e, 0); // Fondo transparente
      if (oldText) oldText.setColor('#ffffff'); // Texto blanco
      if (oldOutline) oldOutline.setVisible(false); // Oculta el delineado del *anterior*
    }

    // 2. Aplicar estilo al nuevo contenedor
    const newBackground = newContainer.list.find(item => item.getData('isBackground'));
    const newText = newContainer.list.find(item => item.getData('isText'));

    if (newBackground) newBackground.setFillStyle(0x44d27e, selectedAlpha); // Fondo verde semi-transparente
    if (newText) newText.setColor(selectedTextColor); // Texto verde

    this.#selectedLanguageContainer = newContainer;
  }

  // --- Animación de Parpadeo (Flicker) ---
  startFlicker(target) {
    // Parpadeo lento y suave
    target.flickerTween = this.tweens.add({
      targets: target,
      alpha: 0.2, // Baja la opacidad
      ease: 'Sine.easeInOut',
      duration: 800, // Duración del ciclo
      yoyo: true, // Vuelve al estado inicial (alpha 1)
      repeat: -1 // Repite infinitamente
    });
  }

  // --- Detener la Animación de Parpadeo ---
  stopFlicker(target) {
    if (target.flickerTween) {
      target.flickerTween.stop();
      target.flickerTween.remove();
      delete target.flickerTween;
    }
    target.setAlpha(1); // Asegura que el objeto termine con opacidad completa
  }

  // Optimización CLAVE: Reemplazamos 'update' por un evento de escena.
  updateUIText() {
      // 1. Detener el parpadeo y activar el botón 'Next'
      this.stopFlicker(this.#updatedTextInScene);
      this.stopFlicker(this.#helloText);
      this.stopFlicker(this.#howAreUText);
      
      // 2. Reactivar el botón 'Next'
      this.#nextButton.setInteractive({ useHandCursor: true }).setAlpha(1); 
      this.#nextButtonOutline.setVisible(false); 

      // 3. Reactivar TODOS los botones de idioma
      this.languageContainers.forEach(container => {
          container.setActive(true).setAlpha(1);
      });
      
      // 4. Actualizar textos
      this.#updatedTextInScene.setText(getPhrase(this.#updatedString));
      this.#helloText.setText(getPhrase(this.#helloKey)).setOrigin(0.5); 
      this.#howAreUText.setText(getPhrase(this.#howAreUKey)).setOrigin(0.5); 

      // 5. Importante: Resetear el estado para permitir la selección de otro idioma
      this.#wasChangedLanguage = FETCHED; 
  }

  updateWasChangedLanguage = () => {
    // Al recibir la confirmación de la traducción, llamamos directamente a la función de activación de UI
    this.updateUIText(); 
  };

  async getTranslations(language) {
    // Si se está seleccionando el mismo idioma y ya ha cargado, no hacer nada.
    if (this.language === language && this.#wasChangedLanguage === FETCHED) {
        return;
    }
    
    this.language = language;

    // --- Lógica para Carga (Loading) ---
    this.#wasChangedLanguage = FETCHING;
    
    // 1. Desactivar el botón 'Next'
    this.#nextButton.disableInteractive().setAlpha(0.5); 
    this.#nextButtonOutline.setVisible(false); 

    // 2. Desactivar TODOS los botones de idioma y reducir su opacidad
    this.languageContainers.forEach(container => {
        container.setActive(false).setAlpha(0.5);
    });

    // 3. Iniciar el Parpadeo en los textos dinámicos
    this.startFlicker(this.#updatedTextInScene);
    this.startFlicker(this.#helloText);
    this.startFlicker(this.#howAreUText);

    // 4. Ejecutar la traducción y, al terminar, llama a updateWasChangedLanguage
    await getTranslations(language, this.updateWasChangedLanguage);
  }
}
