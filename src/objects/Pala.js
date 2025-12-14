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
    this.visual = scene.add.rectangle(x, y, 20, 200, palaColor).setStrokeStyle(5, 0xffffff);
    this.hitboxes = scene.physics.add.group({ allowGravity: false });

    // --- Configuración de Físicas ---
    scene.physics.add.existing(this.visual);
    this.visual.body.setImmovable(true).setCollideWorldBounds(true);
    this.visual.body.checkCollision.none = true; // El rectángulo visual no colisiona

    this.createHitboxes();
  }

  /**
   * Activa o desactiva un borde dorado alrededor de la pala cuando tiene líneas activas
   * @param {boolean} active
   */
  setLineHighlight(active) {
    // Simplemente cambiamos el grosor y color del borde según el estado
    this.visual.setStrokeStyle(active ? 8 : 5, active ? 0xFFD700 : 0xffffff);
  }

  createHitboxes() {
    const radio = this.visual.width / 2;
    const alturaPala = this.visual.height;
    const numCirculos = this.CIRCLES_DENSITY;
    const espaciado = (alturaPala - radio * 2) / (numCirculos - 1);
    const startYOffset = -alturaPala / 2 + radio;

    for (let i = 0; i < numCirculos; i++) {
      const localY = startYOffset + (i * espaciado);
      const circle = this.scene.add.circle(this.visual.x, this.visual.y, radio, 0xffffff, 0)
        .setVisible(false);
      
      this.scene.physics.add.existing(circle);
      circle.body.setCircle(radio);
      circle.body.setImmovable(true);
      circle.body.setCollideWorldBounds(false);
      circle.body.allowGravity = false;
      circle.body.moves = true;
      circle.body.pushable = false;
      circle.body.customSeparateX = true;
      circle.body.customSeparateY = true;
      circle.body.setMass(0.0001);

      // Propiedades críticas para el comportamiento de colisión
      circle.parentPala = this.visual;
      circle.localYOffset = localY;
      circle.isP1 = this.isP1;
      
      this.hitboxes.add(circle);
    }
  }

  update(delta) {
    this.handleMovement(delta);
    this.handleRotation(delta);
    this.updateVisuals(delta);
  }

  handleMovement(delta) {
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

  updateVisuals(delta) {
    // Actualizamos el ángulo visual
    this.visual.setAngle(this.isP1 ? -this.logicalRotation : this.logicalRotation);

    // Calculamos constantes fuera del bucle
    const angleRad = this.visual.angle * Phaser.Math.DEG_TO_RAD;
    const scaleY = this.visual.scaleY;
    const sinAngle = Math.sin(angleRad);
    const cosAngle = Math.cos(angleRad);
    const visualX = this.visual.x;
    const visualY = this.visual.y;

    // Actualizamos las hitboxes
    const deltaSec = Math.max(0, delta) / 1000;
    this.hitboxes.children.iterate(circle => {
      if (!circle.body) return;

      // Calculamos la nueva posición
      const localY = circle.localYOffset * scaleY;
      const newX = visualX - localY * sinAngle;
      const newY = visualY + localY * cosAngle;

      // Guardar velocidad actual
      const vx = circle.body.velocity.x;
      const vy = circle.body.velocity.y;

      // Actualizamos posición del game object
      circle.setPosition(newX, newY);

      // Calculamos prev basado en velocidad para mejorar detección de colisiones (evitar tunneling)
      const width = circle.body.width || 0;
      const height = circle.body.height || 0;
      const posX = newX - width/2;
      const posY = newY - height/2;

      circle.body.position.set(posX, posY);
      // prev = position - velocity * dt
      circle.body.prev.set(posX - vx * deltaSec, posY - vy * deltaSec);
      // restaurar velocidad
      circle.body.velocity.set(vx, vy);
    });
  }



  expandHitboxesGradualmente(duration = 2000) {
    const radio = this.visual.width / 2;
    const alturaPalaOriginal = this.visual.height;
    const alturaPalaEscalada = alturaPalaOriginal * this.visual.scaleY;
    
    // Calculamos el espacio mínimo entre hitboxes (ligeramente menor que el diámetro)
    const espaciadoMinimo = radio * 1.8; // Usamos 1.8 en lugar de 2 para tener un poco de solapamiento
    
    // Calculamos la cantidad total de hitboxes necesarias para la altura escalada
    const numCirculosNecesarios = Math.ceil(alturaPalaEscalada / espaciadoMinimo);
    
    // Recalculamos el espaciado real para distribuir uniformemente
    const espaciadoReal = alturaPalaEscalada / (numCirculosNecesarios - 1);
    
    // Obtenemos las hitboxes actuales
    const hitboxesActuales = this.hitboxes.getChildren();
    const numHitboxesNuevas = numCirculosNecesarios - hitboxesActuales.length;
    
    // Si no necesitamos más hitboxes, solo actualizamos las posiciones
    if (numHitboxesNuevas <= 0) {
      return;
    }
    
    // Calculamos las posiciones iniciales y finales
    const startYEscalado = -alturaPalaEscalada/2 + radio;
    const endYEscalado = alturaPalaEscalada/2 - radio;
    
    const delayPerCircle = duration / numHitboxesNuevas;

    // Primero, actualizamos las posiciones de las hitboxes existentes
    hitboxesActuales.forEach((circle, index) => {
      const ratio = index / (hitboxesActuales.length - 1);
      circle.localYOffset = Phaser.Math.Linear(startYEscalado, endYEscalado, ratio);
    });

    // Luego creamos las nuevas hitboxes
    for (let i = 1; i <= numHitboxesNuevas; i++) {
      this.scene.time.delayedCall(i * delayPerCircle, () => {
        // Interpolamos entre hitboxes existentes para posicionar las nuevas
        const ratio = i / (numHitboxesNuevas + 1);
        const localY = Phaser.Math.Linear(startYEscalado, endYEscalado, ratio);

        const circle = this.scene.add.circle(this.visual.x, this.visual.y, radio, 0xffffff, 0)
          .setVisible(false);
          
        this.scene.physics.add.existing(circle);
        circle.body.setCircle(radio);
        circle.body.setImmovable(true);
        circle.body.setCollideWorldBounds(false);
        circle.body.allowGravity = false;
        circle.body.moves = true;
        circle.body.pushable = false;
        circle.body.customSeparateX = true;
        circle.body.customSeparateY = true;
        circle.body.setMass(0.0001);

        circle.parentPala = this.visual;
        circle.localYOffset = localY;
        circle.isP1 = this.isP1;
        
        this.hitboxes.add(circle);
      });
    }
  }

  retractHitboxesGradualmente(originalCount, duration = 2000) {
    const allCircles = this.hitboxes.getChildren();
    const extraCircles = allCircles.slice(originalCount);
    const delayPerCircle = duration / extraCircles.length;

    // Invertimos el orden para que se eliminen de afuera hacia adentro
    extraCircles.reverse().forEach((circle, index) => {
      this.scene.time.delayedCall(index * delayPerCircle, () => {
        circle.destroy();
      });
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