import BasePowerUp from "./BasePowerUp";

export default class Hielopowerup extends BasePowerUp {
    constructor(scene, x, y) {
        super(scene, x, y, 'Hielo', 'hielo', 5000);

        this.activationDelayMs = 300;
    }

    onCollected(jugador, targetParticula) {
        if (!this.isActive()) {
            return;
        }

        if (this.collected) return;
        this.collected = true;

        // Preferir partícula pasada desde el overlap; si no, buscar por lastPlayerHit
        let particula = targetParticula && targetParticula.active ? targetParticula : null;
        if (!particula) {
            particula = this.scene.particulas.getChildren().find(p => p.active && p.lastPlayerHit === jugador);
        }

        if (!particula) {
            this.deactivateForPool();
            return;
        }

        // Guardar referencia a la escena y velocidad original
        const scene = this.scene;
        particula.originalVelocity = particula.body.velocity.length();
        const targetVelocity = 250; // Velocidad fija del hielo

        // Crear efecto visual
        const iceEffect = scene.add.sprite(particula.x, particula.y, 'Hielo')
            .setScale(0.15)
            .setAlpha(0.5)
            .setDepth(5);

        // Hacer que el efecto siga a la partícula y mantener velocidad constante
        const originalUpdate = particula.update;
        particula.update = function() {
            originalUpdate.call(this);
            
            // Si la partícula ya no está activa, limpiar el efecto
            if (!this.active) {
                if (iceEffect && iceEffect.active) {
                    iceEffect.destroy();
                }
                return;
            }

            // Mantener el efecto visual siguiendo a la partícula
            if (iceEffect && iceEffect.active) {
                iceEffect.setPosition(this.x, this.y);
            }

            // Mantener la velocidad constante en 250 mientras dure el efecto
            const currentSpeed = this.body.velocity.length();
            if (currentSpeed !== targetVelocity) {
                const angle = Phaser.Math.Angle.Between(0, 0, this.body.velocity.x, this.body.velocity.y);
                this.body.setVelocity(
                    Math.cos(angle) * targetVelocity,
                    Math.sin(angle) * targetVelocity
                );
            }
        };

        // Aplicar velocidad reducida inmediatamente
        const angle = Phaser.Math.Angle.Between(0, 0, particula.body.velocity.x, particula.body.velocity.y);
        particula.body.setVelocity(
            Math.cos(angle) * targetVelocity,
            Math.sin(angle) * targetVelocity
        );

        // Asegurar limpieza del efecto si la partícula se destruye (ej. al tocar el estabilizador)
        particula.once('destroy', function() {
            if (iceEffect && iceEffect.active) {
                iceEffect.destroy();
            }
        });

        // Guardar referencia al iceEffect en la partícula para limpieza en release/pool
        particula._iceEffect = iceEffect;

        // Restaurar velocidad después del efecto
        scene.time.delayedCall(this.effectDuration, function() {
            if (particula.active) {
                // Eliminar la función de update personalizada
                particula.update = originalUpdate;

                // Determinar y aplicar la velocidad final según la carga
                const baseVelocity = 1000;
                const finalVelocity = particula.getHitCount() >= 5 ? baseVelocity * 1.5 : baseVelocity;

                const angle = Phaser.Math.Angle.Between(0, 0, particula.body.velocity.x, particula.body.velocity.y);
                particula.body.setVelocity(
                    Math.cos(angle) * finalVelocity,
                    Math.sin(angle) * finalVelocity
                );

                // Asegurarnos de que la velocidad se mantenga después del cambio
                const currentUpdate = particula.update;
                particula.update = function() {
                    if (this.active) {
                        currentUpdate.call(this);
                        // Verificar y mantener la velocidad final
                        const speed = this.body.velocity.length();
                        if (Math.abs(speed - finalVelocity) > 1) {
                            const currentAngle = Phaser.Math.Angle.Between(0, 0, this.body.velocity.x, this.body.velocity.y);
                            this.body.setVelocity(
                                Math.cos(currentAngle) * finalVelocity,
                                Math.sin(currentAngle) * finalVelocity
                            );
                        }
                    }
                };

                // Limpiar el efecto visual
                if (iceEffect && iceEffect.active) {
                    iceEffect.destroy();
                }
                particula._iceEffect = null;
                delete particula.originalVelocity;
            }
        }, [], scene);

        scene.sounds.Ball?.play();
        this.deactivateForPool();
    }
}