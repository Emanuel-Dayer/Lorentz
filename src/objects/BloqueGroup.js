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
        
        // Lo añadimos a este grupo de físicas. El 'true' aquí es un atajo para
        // this.add(bloque) y this.scene.physics.add.existing(bloque, true)
        this.add(bloque, true);
      }
    }
  }
}