import { Boot } from "./scenes/Boot";
import { Game as MainGame } from "./scenes/Game";
import { AUTO, Scale, Game } from "phaser";
import { Preload } from "./scenes/Preload";
import InitialMenu from "./scenes/MainMenu";
import { PreGame } from "./scenes/PreGame";

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
  scene: [Boot, Preload, InitialMenu, PreGame, MainGame],
};

const StartGame = (parent) => {
  return new Game({ ...config, parent });
};

export default StartGame;
