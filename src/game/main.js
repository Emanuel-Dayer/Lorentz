import { AUTO, Scale, Game } from "phaser";
import { Boot } from "./scenes/Boot";
import { Preload } from "./scenes/Preload";
// Menú principal
import InitialMenu from "./scenes/MainMenu";
// Modos de jueego
import { CoopGame } from "./scenes/CoopGame";
import { PreGame } from "./scenes/PreGame";
import { Game as MainGame } from "./scenes/Game";
//Escena victoria o derrota
import { RslGameResult } from "./scenes/RslGame";

const config = {
  type: AUTO,
  width: 1920,
  height: 1080,
  parent: "game-container",
  backgroundColor: "#000000ff",


  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false 
    }
  },

  //activar el inputsystem
  input: {
    gamepad: true,
  },

  scale: {
    mode: Scale.FIT,
    autoCenter: Scale.CENTER_BOTH,
  },
  scene: [Boot, Preload, InitialMenu, PreGame, MainGame, CoopGame, RslGameResult],
};

const StartGame = (parent) => {
  return new Game({ ...config, parent });
};

export default StartGame;
