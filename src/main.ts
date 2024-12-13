import { ProgramEvent } from "./core/event.js";
import { Program } from "./core/program.js";
import { WebGLRenderer } from "./gfx/webgl/renderer.js";
import { Game } from "./game/game.js";
import { TitleScreen } from "./game/titlescreen.js";
import { Intro } from "./game/intro.js";
import { SETTINGS_LOCAL_STORAGE_KEY } from "./game/settings.js";
import { clamp } from "./math/utility.js";


const loadSetting = (event : ProgramEvent) : void => {

    try {

        const str : string | null = window["localStorage"]["getItem"](SETTINGS_LOCAL_STORAGE_KEY);
        if (str === null) {

            return;
        }

        const json : unknown = JSON.parse(str) ?? {};

        const musicVolume : number = clamp(Number(json["musicvolume"]), 0, 100);
        const soundVolume : number = clamp(Number(json["soundvolume"]), 0, 100);

        event.audio.setMusicVolume(musicVolume);
        event.audio.setSoundVolume(soundVolume);

    }
    catch (e) {

        console.error("Not-so-fatal error: failed to load settings: " + e["message"]);
    }
}


const initialEvent = (event : ProgramEvent) : void => {

    event.assets.parseIndexFile("assets/index.json");

    // TODO: Read from JSON so I can change these without having
    // to recompile each time.
    event.input.addAction("jump", ["Space", "KeyZ", "KeyJ"], [0]);
    event.input.addAction("attack", ["ControlLeft", "ControlRight", "KeyX", "KeyK"], [2, 3], [0]);
    event.input.addAction("shoot", ["ShiftLeft", "ShiftRight", "KeyC", "KeyL"], [1], [2]);
    event.input.addAction("pause", ["Enter", "Escape"], [7, 9]);
    event.input.addAction("back", ["Escape"], [1, 6, 8], undefined, false); // We do not want to prevent escape!
    event.input.addAction("back2", ["Backspace"]); 
    event.input.addAction("select", ["Enter", "Space", "KeyZ", "KeyJ"], [0, 7, 9], [0]);
    event.input.addAction("start", ["Enter", "Space", "KeyZ", "KeyJ"], [0, 7, 9], [0]);

    event.audio.setMusicVolume(60);
    event.audio.setSoundVolume(60);

    loadSetting(event);
}


const onloadEvent = (event : ProgramEvent) : void => {

    const loc : string | undefined = event.assets.getDocument("en-us");
    if (loc !== undefined) {

        event.addLocalizationJSON("en-us", loc);
        event.setActiveLocalization("en-us");
    }

    event.scenes.addScene("intro", new Intro(), true);
    event.scenes.addScene("title", new TitleScreen(event), false);
    event.scenes.addScene("game", new Game(event), false);
}


const printError = (e : Error) : void => {

    console.log(e["stack"]);

    document.getElementById("base_div")?.remove();

    const textOut : HTMLElement = document.createElement("b");
    textOut.setAttribute("style", "color: rgb(224,73,73); font-size: 16px");
    textOut.innerText = "Fatal error:\n\n " + e["stack"];

    document.body.appendChild(textOut);
}


function waitForInitialEvent() : Promise<AudioContext> {

    return new Promise<AudioContext> ( (resolve : (ctx : AudioContext | PromiseLike<AudioContext>) => void) : void => {

        window.addEventListener("keydown", (e : KeyboardEvent) => {

            e.preventDefault();
            document.getElementById("div_initialize")?.remove();
    
            const ctx : AudioContext = new AudioContext();
            resolve(ctx);
    
        }, { once: true });
    } );
}


window.onload = () => (async () => {
    
    document.getElementById("init_text")!.innerText = "Press Any Key to Start";

    const ctx : AudioContext = await waitForInitialEvent();

    try {

        (new Program(ctx, WebGLRenderer, 256, 192, false, true, false, 576, 192)).run(initialEvent, onloadEvent, printError);
    }
    catch (e : any) {

        printError(e);
    }
}) ();
