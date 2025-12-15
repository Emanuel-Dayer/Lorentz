import BasePowerUp from "./BasePowerUp";

export default class Caracolpowerup extends BasePowerUp {
    constructor(scene, x, y) {
        super(scene, x, y, 'Caracol', 'caracol', 5000);

        this.activationDelayMs = 2000;
        this.slowFactor = 0.5;
    }

    onCollected(jugador) {
        if (!this.isActive()) {
            return;
        }

        if (this.collected) return;
        this.collected = true;

        const pala = jugador === 'player1' ? this.scene.pala1 : this.scene.pala2;
        if (!pala) return;

        // Guardar velocidad original de la paleta
        if (!pala.originalVelocidad) {
            pala.originalVelocidad = pala.VELOCIDAD_PALA;
        }

        // Aplicar ralentización
        pala.VELOCIDAD_PALA = pala.originalVelocidad * this.slowFactor;

        // Efecto visual del caracol encima de la pala
        const palaVisual = pala.getVisualObject();
        const caracolEffect = this.scene.add.sprite(palaVisual.x, palaVisual.y - palaVisual.height / 2 - 30, 'Caracol')
            .setScale(0.15)
            .setAlpha(0.5)
            .setDepth(palaVisual.depth + 1);

        // Sobrescribir el update de la pala para que el caracol la siga
        const originalPalaUpdate = pala.update;
        pala.update = function(inputSystem) {
            // Llamar al update original
            originalPalaUpdate.call(this, inputSystem);
            
            // Hacer que el caracol siga el movimiento vertical de la pala
            if (caracolEffect && caracolEffect.active) {
                const palaVisualCurrent = this.getVisualObject();
                caracolEffect.setPosition(palaVisualCurrent.x, palaVisualCurrent.y - palaVisualCurrent.height / 2 - 30);
            }
        };

        // Restaurar la velocidad después de la duración del efecto
        const scene = this.scene; // Guardamos la referencia a la escena
        scene.time.delayedCall(this.effectDuration, function() {
            if (pala) {
                pala.VELOCIDAD_PALA = pala.originalVelocidad; // Restaurar velocidad original
                pala.update = originalPalaUpdate; // Restaurar el update original
                if (caracolEffect && caracolEffect.active) {
                    caracolEffect.destroy();
                }
            }
        });

        this.scene.sounds.Ball?.play();
        this.deactivateForPool();
    }
}