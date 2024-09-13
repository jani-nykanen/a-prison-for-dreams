import { Canvas } from "../gfx/interface.js";
import { Assets } from "./assets.js";
import { ProgramEvent } from "./event.js";
import { Scene, SceneParameter } from "./scene.js";


export class SceneManager {


    private scenes : Map<string, Scene>;
    private activeScene : Scene | undefined = undefined;


    constructor() {

        this.scenes = new Map<string, Scene> ();
    }


    public addScene(name : string, scene : Scene, makeActive : boolean = true) : void {

        this.scenes.set(name, scene);
        if (makeActive) {

            this.activeScene = scene;
        }
        
    }

    public init(event : ProgramEvent) : void {

        this.activeScene?.init?.(undefined, event);
    }


    public update(event : ProgramEvent) : void {

        this.activeScene?.update(event);
    }


    public redraw(canvas : Canvas, assets : Assets) : void {

        this.activeScene?.redraw(canvas, assets);
    }


    public changeScene(name : string, event : ProgramEvent) : void {

        const param : SceneParameter = this.activeScene?.dispose();

        this.activeScene = this.scenes.get(name);
        this.activeScene?.init?.(param, event)
    }
}
