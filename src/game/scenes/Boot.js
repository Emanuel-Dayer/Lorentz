import { Scene } from 'phaser';

export class Boot extends Scene
{
    constructor ()
    {
        super('Boot');
    }

    preload ()
    {
        /*
        La escena de boot se usa tipicamente para cargar cualquier 
        asset que necesites en el preload, como el logo del juego 
        o el fondo.

        Mientras mas pequeño sea el tamaño del archivo de los assets, 
        mejor, para que el juego no tarde en cargar antes de la
        pantalla de carga.
        */
    }

    create ()
    { 
        this.scene.start('Preload');
    }
}
