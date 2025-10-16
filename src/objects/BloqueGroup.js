import { Physics } from "phaser";

export class BloqueGroup extends Physics.Arcade.Group {
  /**
   * @param {Phaser.Scene} scene La escena de Phaser.
   * @param {object} config Objeto con la configuración de los bloques.
   */
  constructor(scene, config) {
    // Llama al constructor de la clase base (Physics.Arcade.Group)
    super(scene.physics.world, scene, {
      immovable: true,
      allowGravity: false,
    });

    this.createGrid(config);
  }

  /**
   * Crea la cuadrícula de bloques basada en la configuración.
   * @param {object} config
   */
  createGrid(config) {
    const {
      FilasBloques,
      ColumnasBloques,
      EspaciadoBloques,
      AnchoBloque,
      AltoBloque,
      ColorBloque,
    } = config;

    const gameWidth = this.scene.sys.game.config.width;

    const totalWidth = (ColumnasBloques * AnchoBloque) + ((ColumnasBloques - 1) * EspaciadoBloques);
    const startX = (gameWidth / 2) - (totalWidth / 2) + (AnchoBloque / 2);
    const startY = 150;

    for (let i = 0; i < FilasBloques; i++) {
      for (let j = 0; j < ColumnasBloques; j++) {
        const x = startX + (j * (AnchoBloque + EspaciadoBloques));
        const y = startY + (i * (AltoBloque + EspaciadoBloques));
        
        // Creamos el rectángulo visual
        const bloque = this.scene.add.rectangle(x, y, AnchoBloque, AltoBloque, ColorBloque)
          .setStrokeStyle(3, 0x333333);
        
        // Añadimos una propiedad para identificar la fila
        bloque.rowIndex = i;

        // Lo añadimos a este grupo de físicas. El 'true' aquí es un atajo para
        // this.add(bloque) y this.scene.physics.add.existing(bloque, true)
        this.add(bloque, true);
      }
    }
  }

  /**
   * Comprueba si una fila está completa y maneja el reordenamiento de bloques.
   * @param {number} rowIndex - El índice de la fila del bloque destruido.
   * @returns {boolean} - Devuelve true si una fila fue completada, de lo contrario false.
   */
  checkAndHandleCompletedRow(rowIndex) {
    const bloquesEnFila = this.getChildren().filter(b => b.rowIndex === rowIndex);
    if (bloquesEnFila.length > 0) {
      return false; // La fila no está vacía
    }

    // --- Si la fila está vacía, reorganizamos y creamos una nueva ---
    const { ColumnasBloques, EspaciadoBloques, AnchoBloque, AltoBloque, ColorBloque } = this.scene.bloques.config;
    const gameWidth = this.scene.sys.game.config.width;
    const totalWidth = (ColumnasBloques * AnchoBloque) + ((ColumnasBloques - 1) * EspaciadoBloques);
    const startX = (gameWidth / 2) - (totalWidth / 2) + (AnchoBloque / 2);
    const startY = 150;

    // Mover bloques de filas superiores hacia abajo
    this.getChildren().forEach(bloque => {
      if (bloque.rowIndex < rowIndex) {
        bloque.rowIndex++;
        const newY = startY + (bloque.rowIndex * (AltoBloque + EspaciadoBloques));
        this.scene.tweens.add({
          targets: bloque,
          y: newY,
          duration: 500,
          ease: 'Power2'
        });
      }
    });

    // Crear una nueva fila en la parte superior (rowIndex = 0)
    for (let j = 0; j < ColumnasBloques; j++) {
      const x = startX + (j * (AnchoBloque + EspaciadoBloques));
      const y = startY - (AltoBloque + EspaciadoBloques); // Posición inicial fuera de la pantalla
      
      const bloque = this.scene.add.rectangle(x, y, AnchoBloque, AltoBloque, ColorBloque)
        .setStrokeStyle(3, 0x333333);
      bloque.rowIndex = 0;
      this.add(bloque, true);

      // Animación para que la nueva fila baje a su posición
      this.scene.tweens.add({
        targets: bloque,
        y: startY,
        duration: 500,
        ease: 'Power2'
      });
    }

    return true;
  }
}