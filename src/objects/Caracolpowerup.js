import Phaser from "phaser";

export default class Caracolpowerup extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'Caracol');

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
        this.tipo = 'caracol';
        this.activationDelayMs = 2000; // o sea 2 segundos
        this.spawnTime = scene.time.now;
        this.slowFactor = 0.5;
        this.effectDuration = 5000;
    }

    update() {
        if (this.y > this.scene.sys.game.config.height + 50) {
            this.destroy();
        }
    }

    onCollected(jugador) {
        const now = this.scene.time.now;
        if (now - this.spawnTime < this.activationDelayMs) {
            console.warn('Caracolpowerup: aún no está activo');
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

        // Efecto visual del caracol
        const caracolEffect = this.scene.add.sprite(pala.x, pala.y, 'Caracol')
            .setScale(0.15)
            .setAlpha(0.5)
            .setDepth(5);

        // Hacer que el efecto siga a la paleta
        const updateCaracol = () => {
            if (pala && pala.active && caracolEffect && caracolEffect.active) {
                caracolEffect.setPosition(pala.x, pala.y);
            }
        };

        this.scene.events.on('update', updateCaracol);

        // Restaurar la velocidad después de la duración del efecto
        const scene = this.scene; // Guardamos la referencia a la escena
        scene.time.delayedCall(this.effectDuration, function() {
            if (pala) {
                pala.VELOCIDAD_PALA = 1200; // Velocidad base de la pala
                if (caracolEffect && caracolEffect.active) {
                    caracolEffect.destroy();
                }
                scene.events.off('update', updateCaracol);
            }
        });

        this.scene.sounds.Ball?.play();
        this.destroy();
    }
}