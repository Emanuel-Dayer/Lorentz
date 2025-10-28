export class RslGameResult extends Phaser.Scene {
  constructor() {
    super("RslGameResult");
  }

  init(data) {
    this.modo = data.modo; // 'VS' o 'COOP'
    this.ganador = data.ganador; // 1 o 2 si es VS
    this.puntuacion = data.puntuacion; // solo en COOP
  }

  create() {
    const { width, height } = this.sys.game.config;
    this.canReturn = false;

    if (this.modo === 'VS') {
      this.add.text(width / 2, height / 2 - 100, `¡Jugador ${this.ganador} ganó!`, {
        fontSize: '48px',
        fill: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 4,
        align: 'center'
      }).setOrigin(0.5);
    } else {
      this.add.text(width / 2, height / 2 - 100, '¡Fin del juego!', {
        fontSize: '48px',
        fill: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 4,
        align: 'center'
      }).setOrigin(0.5);

      this.add.text(width / 2, height / 2 - 20, `Puntuación total: ${this.puntuacion}`, {
        fontSize: '48px',
        fill: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 4,
        align: 'center'
      }).setOrigin(0.5);
    }

    // Agregar el texto de retorno después de un delay
    this.time.delayedCall(2000, () => {
      this.returnText = this.add.text(width / 2, height / 2 + 60, 'Presiona cualquier botón para volver al menú', {
        fontSize: '36px',
        fill: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 4,
        align: 'center'
      }).setOrigin(0.5);
      this.canReturn = true;
    });

    // Escuchar cualquier tecla
    this.input.keyboard.on('keydown', () => {
      if (this.canReturn) {
        this.scene.start('Menu');
      }
    });

    // Escuchar cualquier botón del mando
    this.input.gamepad.on('down', () => {
      if (this.canReturn) {
        this.scene.start('Menu');
      }
    });
  }
}