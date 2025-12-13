import { AUTO, Scale, Game } from "phaser";
import { Boot } from "./scenes/Boot";
import { Preload } from "./scenes/Preload";
import { AuthLogin } from "./scenes/AuthLogin";
// Menú principal
import InitialMenu from "./scenes/MainMenu";
// Modos de jueego
import { CoopGame } from "./scenes/CoopGame";
import { VersusPreGame } from "./scenes/VersusPreGame";
import { VersusGame} from "./scenes/VersusGame";
//Escena victoria o derrota
import { RslGameResult } from "./scenes/RslGame";

import FirebasePlugin from "../plugins/FirebasePlugin";

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
  scene: [Boot, Preload, AuthLogin, InitialMenu, VersusPreGame, VersusGame, CoopGame, RslGameResult],
  plugins: {
    global: [
      {
        key: "FirebasePlugin",
        plugin: FirebasePlugin,
        start: true,
        mapping: "firebase",
      },
    ],
  },
};

const StartGame = (parent) => {
  return new Game({ ...config, parent });
};

export default StartGame;
