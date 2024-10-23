import { Canvas } from "../gfx/interface.js";
import { Assets } from "./assets.js";
import { ProgramEvent } from "./event.js";


export type SceneParameter = number | string | undefined;


export interface Scene {
    
    init?(param : SceneParameter, event : ProgramEvent) : void;
    update(event : ProgramEvent) : void;
    redraw(canvas : Canvas, assets : Assets) : void;
    postDraw?(canvas : Canvas, assets : Assets) : void;
    dispose() : SceneParameter;
}
