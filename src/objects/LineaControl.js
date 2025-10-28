import { PARTICLE_STATE } from './Particula';

/**
 * LineaControl: administra líneas "bezier rectas" (curva de Bezier con un único control
 * que actúa como línea recta visual) entre una pala y una partícula.
 *
 * Contrato mínimo:
 * - inputs: llamar a addLinea(particula) para crear una línea asociada a una partícula
 * - toggle: toggleGlobal() alterna visibilidad/creación de todas las líneas (usado por EAST)
 * - update: update() debe llamarse desde la escena para reposicionar las líneas
 * - removeLinea(particula) borra la línea asociada
 */
export default class LineaControl {
  // --- Constantes configurables para el efecto visual y físico ---
  static CONFIG = {
    // Visual de la línea
    LINE_THICKNESS: 4,           // Grosor de la línea en píxeles
    MAX_CURVE: 600,             // Curvatura máxima en píxeles
    CURVE_CONTROL_POINT: 0,     // Posición del punto de control (0.5 = medio, menor = más cerca de la partícula)
    CURVE_SEGMENTS: 20,         // Segmentos para dibujar la curva (más = más suave)
    
    // Física y comportamiento
    LERP_SPEED: 2000,            // Velocidad de respuesta a la rotación (más alto = sigue más rápido)
    STRAIGHTEN_SPEED: 1,      // Velocidad de enderezamiento (decremento por segundo)
    MAX_TENSION: 1,          // Tensión máxima de la línea
    TENSION_DECAY: 1,        // Velocidad de pérdida de tensión (más alto = más rápido)
    LINE_DEPTH: 5000,          // Profundidad de dibujado (z-index)
    PADDLE_OFFSET: 30,         // Distancia entre la línea y la pala
    
    // Colores
    P1_COLOR: 0x0000FF,        // Color línea jugador 1 (azul)
    P2_COLOR: 0xFF0000,        // Color línea jugador 2 (rojo)
  };

  // Mapa de signos por jugador para la dirección de curvatura
  static CURVE_SIGNS = {
    player1: -1,  // P1: rotación invertida
    player2: -1   // P2: rotación invertida
  };

  /**
   * @param {Phaser.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    // Map de partículas a objetos { graphics, color, visible }
    this.lineMap = new Map();
    // visibilidad por jugador
    this.visiblePlayers = {
      player1: false,
      player2: false
    };
  }

  /** Crea (si no existe) la linea asociada a una particula */
  addLinea(particula) {
    if (!particula || !particula.active) return;
    // Solo permitimos crear linea para particulas que tienen lastPlayerHit
    const owner = particula.lastPlayerHit;
    if (!owner) return;

    if (this.lineMap.has(particula)) return; // ya existe

    const graphics = this.scene.add.graphics();
    graphics.setDepth(LineaControl.CONFIG.LINE_DEPTH);

    // Determinar color por owner
    const color = owner === 'player1' ? LineaControl.CONFIG.P1_COLOR : LineaControl.CONFIG.P2_COLOR;

    const visible = !!this.visiblePlayers[owner];
    
    // Obtener la pala dueña para guardar su rotación inicial
    const palaInicial = owner === 'player1' ? this.scene.pala1 : this.scene.pala2;
    const rotacionInicial = palaInicial ? palaInicial.getLogicalRotation() : 0;

    // Guardamos estado inicial
    this.lineMap.set(particula, {
      graphics,
      color,
      owner,
      rotacionInicial: rotacionInicial,
      lastKnownState: particula.state,  // para detectar cambios de estado
      currentControlYOffset: 0,
      tension: LineaControl.CONFIG.MAX_TENSION  // Nueva propiedad para controlar la "tensión" de la línea
    });

    // Inicialmente visible según el flag del jugador
    graphics.setVisible(visible);

    // nothing else to do here; visibility handled elsewhere
  }

  /** Elimina la linea asociada a una particula (si existe) */
  removeLinea(particula) {
    const entry = this.lineMap.get(particula);
    if (!entry) return;
    if (entry.graphics) entry.graphics.destroy();
    // no counters to update; highlight is controlled por visiblePlayers
    const owner = entry.owner;
    this.lineMap.delete(particula);
  }

  /** Alterna el estado global: si estaba visible lo oculta y viceversa */
  toggleGlobal() {
    // Mantener compatibilidad: toggle global antiguo (activa/desactiva ambos jugadores)
    const newVal = !(this.visiblePlayers.player1 && this.visiblePlayers.player2);
    this.visiblePlayers.player1 = newVal;
    this.visiblePlayers.player2 = newVal;
    // Aplicar visibilidad a las líneas existentes
    this.lineMap.forEach((entry, particula) => {
      if (entry && entry.graphics) entry.graphics.setVisible(!!this.visiblePlayers[entry.owner]);
    });
  }

  /** Alterna la visibilidad de las lineas para un jugador concreto */
  toggleForPlayer(playerKey) {
    if (!['player1','player2'].includes(playerKey)) return;
    this.visiblePlayers[playerKey] = !this.visiblePlayers[playerKey];

    // Actualizar las líneas existentes o crear nuevas
    if (this.visiblePlayers[playerKey]) {
      // Al activar, para cada partícula:
      // - Si no tiene línea, crear una nueva
      // - Si ya tiene línea, resetear su rotación inicial a la actual
      const pala = playerKey === 'player1' ? this.scene.pala1 : this.scene.pala2;
      this.scene.particulas.getChildren().forEach(p => {
        if (!p || !p.active || p.lastPlayerHit !== playerKey) return;
        
        const entry = this.lineMap.get(p);
        if (entry) {
          // Ya existe: actualizar rotación inicial a la actual
          entry.rotacionInicial = pala ? pala.getLogicalRotation() : 0;
          entry.currentControlYOffset = 0; // reset curvatura
        } else {
          // No existe: crear nueva
          this.addLinea(p);
        }
      });
    }

    // Actualizar visibilidad de las líneas existentes
    this.lineMap.forEach((entry, particula) => {
      if (!entry || !entry.graphics) return;
      if (entry.owner === playerKey) {
        const willShow = !!this.visiblePlayers[playerKey];
        const currentlyVisible = entry.graphics.visible;
        entry.graphics.setVisible(willShow);

        // Forzar highlight según el toggle, independientemente de si hay partículas
        const pala = playerKey === 'player1' ? this.scene.pala1 : this.scene.pala2;
        if (pala && typeof pala.setLineHighlight === 'function') {
          pala.setLineHighlight(!!this.visiblePlayers[playerKey]);
        }
      }
    });

    // Además, si no había ninguna línea existente para este jugador, igualmente forzamos el highlight
    const palaAlways = playerKey === 'player1' ? this.scene.pala1 : this.scene.pala2;
    if (palaAlways && typeof palaAlways.setLineHighlight === 'function') {
      palaAlways.setLineHighlight(!!this.visiblePlayers[playerKey]);
    }
  }

  /** Actualizar dibujado de líneas; llamada desde update de la escena
   * @param {number} delta Tiempo en ms desde el último frame
   */
  update(delta) {
    // Si hay partículas que deberían tener líneas pero aún no las tienen (por ejemplo
    // cuando vuelven a pegarse a la pala original), crearlas automáticamente si el
    // jugador dueño tiene su visibilidad activada.
    this.scene.particulas.getChildren().forEach(p => {
      if (!p || !p.active) return;
      const owner = p.lastPlayerHit;
      if (owner && this.visiblePlayers[owner] && !this.lineMap.has(p)) {
        this.addLinea(p);
      }
    });

    if (this.lineMap.size === 0) return;

    // Recorre las entradas; si la particula dejó de existir, la elimina
    for (const [particula, entry] of this.lineMap.entries()) {
      if (!particula || !particula.active) {
        this.removeLinea(particula);
        continue;
      }

      // Si la particula ya no tiene lastPlayerHit, eliminar la linea
      if (!particula.lastPlayerHit) {
        this.removeLinea(particula);
        continue;
      }

      // Si la owner de la linea ya no coincide con lastPlayerHit, transferir la linea al nuevo owner
      if (entry.owner !== particula.lastPlayerHit) {
        const oldOwner = entry.owner;
        const newOwner = particula.lastPlayerHit;
        // Reasignar owner y color
        entry.owner = newOwner;
        entry.color = newOwner === 'player1' ? 0x0000FF : 0xFF0000;
        // Si el nuevo owner tiene visibilidad activada, mostrar la linea; si no, ocultarla
        // Al transferir ownership, guardar la rotación inicial de la nueva pala
        const nuevaPala = newOwner === 'player1' ? this.scene.pala1 : this.scene.pala2;
        entry.rotacionInicial = nuevaPala ? nuevaPala.getLogicalRotation() : 0;
        // Reiniciar el offset actual para que la línea reaparezca recta al asignarse
        entry.currentControlYOffset = 0;
        if (this.visiblePlayers[newOwner]) {
          if (entry.graphics) entry.graphics.setVisible(true);
        } else {
          if (entry.graphics) entry.graphics.setVisible(false);
        }

        // Actualizar highlight en palas según contadores
        const palaOld = oldOwner === 'player1' ? this.scene.pala1 : this.scene.pala2;
        const palaNew = newOwner === 'player1' ? this.scene.pala1 : this.scene.pala2;
  if (palaOld && typeof palaOld.setLineHighlight === 'function') palaOld.setLineHighlight(!!this.visiblePlayers[oldOwner]);
  if (palaNew && typeof palaNew.setLineHighlight === 'function') palaNew.setLineHighlight(!!this.visiblePlayers[newOwner]);

        // Continuar con el dibujo normal (la entrada ahora apunta al nuevo owner)
      }

  // Refresh dinámico del color según la owner (debería coincidir)
      const newColor = entry.owner === 'player1' ? 0x0000FF : 0xFF0000;
      entry.color = newColor;

      const graphics = entry.graphics;
      graphics.clear();

  // Mostrar solo si el jugador dueño tiene la visibilidad activada
  if (!this.visiblePlayers[entry.owner]) continue;

  // Color y estilo (actualizado)
  graphics.lineStyle(LineaControl.CONFIG.LINE_THICKNESS, entry.color, 1);

      // Punto inicio: particula
      const x1 = particula.x;
      const y1 = particula.y;

  // Punto fin: la pala que tocó por ultima vez
      let pala = null;
      if (particula.lastPlayerHit === 'player1') pala = this.scene.pala1;
      else if (particula.lastPlayerHit === 'player2') pala = this.scene.pala2;

      if (!pala) continue;

      const palaVisual = pala.getVisualObject();

      // Punto destino = ancla lateral de la pala (dependiendo de lado)
      const dirFactor = pala.isP1 ? 1 : -1;
      const offsetX = (palaVisual.width / 2 + particula.radius - LineaControl.CONFIG.PADDLE_OFFSET) * dirFactor;
      const offsetY = 0; // para la 'bezier recta' mantendremos control en la misma altura

      // Rotación de la pala aplicada
      const angRad = palaVisual.angle * Phaser.Math.DEG_TO_RAD;
      const dx = offsetX * Math.cos(angRad) - offsetY * Math.sin(angRad);
      const dy = offsetX * Math.sin(angRad) + offsetY * Math.cos(angRad);

      const x2 = palaVisual.x + dx;
      const y2 = palaVisual.y + dy;

      // Para aproximar una "bezier recta" usaremos un punto de control en la mitad
  // La posicion base del control es el punto medio
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;

    // Si la partícula está pegada o ACABA de ser lanzada, resetear rotación inicial
    if (particula.state === PARTICLE_STATE.PEGADA) {
      entry.lastKnownState = PARTICLE_STATE.PEGADA;
      entry.rotacionInicial = pala.getLogicalRotation(); // actualizar continuamente mientras está pegada
    } else if (entry.lastKnownState === PARTICLE_STATE.PEGADA && particula.state === PARTICLE_STATE.NORMAL) {
      // La partícula ACABA de ser lanzada (cambio de estado) - tomar esta rotación como inicial
      entry.rotacionInicial = pala.getLogicalRotation();
      entry.lastKnownState = PARTICLE_STATE.NORMAL;
    }

    // Línea recta mientras está pegada
    let rotFactor = 0;
    
    if (particula.state === PARTICLE_STATE.NORMAL && entry.lastKnownState === PARTICLE_STATE.NORMAL) {
      // Solo aplicar curvatura si ya estaba en movimiento (no recién lanzada)
      const logicalRot = pala.getLogicalRotation();
      const rotacionInicial = entry.rotacionInicial || 0;

      // La curvatura depende de cuánto has girado DESDE la posición inicial
      const deltaRotacion = logicalRot - rotacionInicial;
      
      // Normalizar el delta de rotación respecto al máximo
      const rotNorm = Phaser.Math.Clamp(deltaRotacion / this.scene.MAX_ROTATION_DEG, -1, 1);
      
      const ownerKey = pala.isP1 ? 'player1' : 'player2';
      rotFactor = rotNorm * LineaControl.CURVE_SIGNS[ownerKey];
    }

  // Aplicar desplazamiento vertical del punto de control
  const curvatureAmount = rotFactor * LineaControl.CONFIG.MAX_CURVE;
  const targetControlYOffset = curvatureAmount;

  // Si está pegada, forzar línea recta y resetear tensión
  if (particula.state === PARTICLE_STATE.PEGADA) {
    entry.currentControlYOffset = 0;
    entry.tension = LineaControl.CONFIG.MAX_TENSION;
  } else {
    // Si no está pegada:
    if (typeof entry.currentControlYOffset !== 'number') entry.currentControlYOffset = 0;
    if (typeof entry.tension !== 'number') entry.tension = LineaControl.CONFIG.MAX_TENSION;

      const dt = (delta || 16) / 1000;

      // Detectar cambios en la rotación de la pala
      const currentRotation = pala.getLogicalRotation();
      if (!entry.lastRotation) entry.lastRotation = currentRotation;
      const rotationDelta = Math.abs(currentRotation - entry.lastRotation);
      
      // Renovar tensión si hay rotación significativa
      if (rotationDelta > 0.1) {
        entry.tension = Math.min(entry.tension + rotationDelta * 0.5, LineaControl.CONFIG.MAX_TENSION);
      }
      entry.lastRotation = currentRotation;

      // Aplicar decaimiento de tensión
      entry.tension = Math.max(0, entry.tension - LineaControl.CONFIG.TENSION_DECAY * dt);    // 2. Si hay tensión, seguir la rotación de la pala
    if (entry.tension > 0) {
      const lerpFactor = Phaser.Math.Clamp(dt * LineaControl.CONFIG.LERP_SPEED, 0, 1);
      entry.currentControlYOffset = Phaser.Math.Interpolation.Linear(
        [entry.currentControlYOffset, targetControlYOffset * entry.tension],
        lerpFactor
      );
    } else {
      // Enderezar gradualmente, manteniendo la capacidad de respuesta
      const straightenAmount = LineaControl.CONFIG.STRAIGHTEN_SPEED * dt;
      entry.currentControlYOffset *= (1 - straightenAmount);
    }
  }

  // Punto de control más cerca de la partícula para efecto más pronunciado
  const controlT = LineaControl.CONFIG.CURVE_CONTROL_POINT; // 0.3 = 30% del camino desde la partícula
  const controlX = x1 + (x2 - x1) * controlT;
  const controlY = y1 + (y2 - y1) * controlT + entry.currentControlYOffset;

      // Dibujar una curva cuadrática aproximada muestreando N puntos
      // Phaser Graphics no expone quadraticCurveTo directamente, así que generamos puntos
      const segments = LineaControl.CONFIG.CURVE_SEGMENTS;
      let prevX = x1;
      let prevY = y1;
      for (let s = 1; s <= segments; s++) {
        const t = s / segments;
        // Quadratic Bezier: B(t) = (1 - t)^2 * P0 + 2(1 - t)t * C + t^2 * P2
        const it = 1 - t;
        const bx = (it * it) * x1 + 2 * it * t * controlX + (t * t) * x2;
        const by = (it * it) * y1 + 2 * it * t * controlY + (t * t) * y2;
        graphics.lineBetween(prevX, prevY, bx, by);
        prevX = bx;
        prevY = by;
      }

      // --- Aplicar efecto físico a la partícula (solo vertical) ---
      // curvature para applyLineEffect será rotFactor (-1..1)
      if (typeof particula.applyLineEffect === 'function') {
        particula.enableLineControl(1); // activar control si no lo está
        particula.applyLineEffect(rotFactor, delta || 16);
      }
    }
  }

  /** Forzar limpieza completa */
  clearAll() {
    this.lineMap.forEach((entry, p) => {
      if (entry.graphics) entry.graphics.destroy();
    });
    this.lineMap.clear();
  }
}
