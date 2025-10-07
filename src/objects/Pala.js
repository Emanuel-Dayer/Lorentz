import { Scene } from "phaser";
import { INPUT_ACTIONS } from "../game/utils/InputSystem";

export class Pala {
  /**
   * @param {Scene} scene La escena de Phaser.
   * @param {number} x La posición X inicial.
   * @param {number} y La posición Y inicial.
   * @param {string} playerKey Identificador del jugador ('player1' o 'player2').
   */
  constructor(scene, x, y, playerKey) {
    this.scene = scene;
    this.playerKey = playerKey; // 'player1' o 'player2'
    this.isP1 = playerKey === 'player1';

    // --- Constantes (obtenidas de la escena para mantener la configuración centralizada) ---
    this.MAX_ROTATION_DEG = scene.MAX_ROTATION_DEG;
    this.ROTATION_SPEED = scene.ROTATION_SPEED;
    this.DEAD_ZONE_DEG = scene.DEAD_ZONE_DEG;
    this.RETURN_SPEED = scene.RETURN_SPEED;
    this.CIRCLES_DENSITY = scene.CIRCLES_DENSITY;
    this.VELOCIDAD_PALA = scene.VelocidadPala;

    // --- Estado ---
    this.logicalRotation = 0; // Rotación lógica estandarizada (+ arriba, - abajo)

    // --- Creación de GameObjects ---
    const palaColor = this.isP1 ? 0x0000FF : 0xFF0000;
    this.visual = scene.add.rectangle(x, y, 50, 300, palaColor).setStrokeStyle(5, 0xffffff);
    this.hitboxes = scene.physics.add.group({ allowGravity: false });

    // --- Configuración de Físicas ---
    scene.physics.add.existing(this.visual);
    this.visual.body.setImmovable(true).setCollideWorldBounds(true);
    this.visual.body.checkCollision.none = true; // El rectángulo visual no colisiona

    this.createHitboxes();
  }

  createHitboxes() {
    const radio = this.visual.width / 2;
    const alturaPala = this.visual.height;
    const numCirculos = this.CIRCLES_DENSITY;
    const espaciado = numCirculos > 1 ? (alturaPala - radio * 2) / (numCirculos - 1) : 0;
    const startYOffset = -alturaPala / 2 + radio;

    for (let i = 0; i < numCirculos; i++) {
      const localY = startYOffset + (i * espaciado);
      const circle = this.scene.add.circle(this.visual.x, this.visual.y, radio, 0xffffff, 0).setVisible(false);
      
      this.hitboxes.add(circle);

      circle.body
        .setCircle(radio)
        .setImmovable(true)
        .setCollideWorldBounds(false)
        .setMass(0.0001);
      
      circle.body.customSeparateX = true;
      circle.body.customSeparateY = true;

      // Guardamos referencias en el círculo para la lógica de colisión
      circle.parentPala = this.visual; // Referencia al objeto visual
      circle.localYOffset = localY;   // Offset Y local para el rebote
      circle.isP1 = this.isP1;        // Para saber el lado de la cancha
    }
  }

  update(delta) {
    this.handleMovement();
    this.handleRotation(delta);
    this.updateVisuals();
  }

  handleMovement() {
    this.visual.body.setVelocityY(0);
    // Usamos el InputSystem de la escena
    if (this.scene.inputSystem.isDown(INPUT_ACTIONS.UP, this.playerKey)) {
      this.visual.body.setVelocityY(-this.VELOCIDAD_PALA);
    }
    if (this.scene.inputSystem.isDown(INPUT_ACTIONS.DOWN, this.playerKey)) {
      this.visual.body.setVelocityY(this.VELOCIDAD_PALA);
    }
  }

  handleRotation(delta) {
    let isRotating = false;
    // La rotación lógica es siempre: + para arriba, - para abajo.
    // Las teclas se mapean a esta lógica estandarizada.
    if (this.scene.inputSystem.isDown(INPUT_ACTIONS.LEFT, this.playerKey)) {
      this.logicalRotation += this.isP1 ? this.ROTATION_SPEED : -this.ROTATION_SPEED;
      isRotating = true;
    }
    if (this.scene.inputSystem.isDown(INPUT_ACTIONS.RIGHT, this.playerKey)) {
      this.logicalRotation += this.isP1 ? -this.ROTATION_SPEED : this.ROTATION_SPEED;
      isRotating = true;
    }

    // Lógica de retorno a 0 (zona muerta)
    if (!isRotating && Math.abs(this.logicalRotation) < this.DEAD_ZONE_DEG) {
      if (this.logicalRotation !== 0) {
        this.logicalRotation = Phaser.Math.Linear(this.logicalRotation, 0, this.RETURN_SPEED * delta * 0.05);
        if (Math.abs(this.logicalRotation) < 0.1) this.logicalRotation = 0;
      }
    }

    this.logicalRotation = Phaser.Math.Clamp(this.logicalRotation, -this.MAX_ROTATION_DEG, this.MAX_ROTATION_DEG);
  }

  updateVisuals() {
    // El ángulo visual se deriva de la rotación lógica
    const visualAngle = this.isP1 ? -this.logicalRotation : this.logicalRotation;
    this.visual.setAngle(visualAngle);

    // Actualizar la posición de los hitboxes
    const angleRad = this.visual.angle * Phaser.Math.DEG_TO_RAD;
    this.hitboxes.children.iterate(circle => {
      if (!circle.body) return; // Seguridad por si el círculo es destruido
      
      const localY = circle.localYOffset;
      const newX = this.visual.x - localY * Math.sin(angleRad);
      const newY = this.visual.y + localY * Math.cos(angleRad);
      
      // Usamos body.reset() para una sincronización instantánea
      circle.body.reset(newX, newY);
    });
  }

  // --- Métodos de acceso para la escena ---
  getHitboxGroup() {
    return this.hitboxes;
  }

  getVisualObject() {
    return this.visual;
  }

  getLogicalRotation() {
    return this.logicalRotation;
  }
}