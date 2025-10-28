import Phaser from "phaser";

export default class Escudospowerup extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'Escudo');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Ajustar primero el hitbox al tamaño completo de la imagen
    this.body.setSize(this.width / 2, this.height / 2);
    // Luego aplicar la escala que afectará tanto al sprite como al hitbox
    this.setScale(0.25);
    this.setDepth(10);
    this.setVelocityY(100);
    this.body.allowGravity = false;
    this.body.setCollideWorldBounds(false);
    this.setImmovable(true);

    this.collected = false;
    this.tipo = 'escudo';
    this.activationDelayMs = 2000; // o sea 2 segundos
    this.spawnTime = scene.time.now;
  }

  update() {
    if (this.y > this.scene.sys.game.config.height + 50) {
      this.destroy();
    }
  }

onCollected(jugador) {
  if (this.collected) return;
  this.collected = true;

  const particula = this.scene.particulas.getChildren().find(p =>
    p.active && p.lastPlayerHit === jugador
  );

  if (particula) {
    if (particula.escudoActivo) {
      // Ya tiene escudo, no aplicar otro
      this.destroy();
      return;
    }

    // Establecer el escudo y su dueño
    particula.escudoActivo = true;
    particula.escudoColor = (jugador === 'player1') ? 0x0000FF : 0xFF0000;
    particula.escudoOwner = jugador;
    particula.lastPlayerHit = jugador; // Forzar el último toque al dueño del escudo

    // Crear el halo visual
    const halo = this.scene.add.circle(particula.x, particula.y, 40, particula.escudoColor, 0.3);
    halo.setDepth(5);
    particula.halo = halo;

    // Actualizar la posición del halo junto con la partícula
    particula.update = (function (originalUpdate) {
      return function () {
        originalUpdate.call(this);
        if (this.halo && this.active) {
          this.halo.setPosition(this.x, this.y);
        }
      };
    })(particula.update);
  }

  this.destroy();
}
}