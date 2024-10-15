import { Assets } from "../core/assets.js";
import { ProgramEvent } from "../core/event.js";
import { Scene, SceneParameter } from "../core/scene.js";
import { TransitionType } from "../core/transition.js";
import { Canvas } from "../gfx/interface.js";
import { Menu } from "../ui/menu.js";
import { MenuButton } from "../ui/menubutton.js";
import { Settings } from "./settings.js";


export class TitleScreen implements Scene {

    
    private menu : Menu;
    private settings : Settings;


    constructor(event : ProgramEvent) {

        const text : string[] = event.localization?.getItem("titlescreen") ?? [];

        this.settings = new Settings(event);

        this.menu = new Menu(
        [

        new MenuButton(text[0] ?? "null", (event : ProgramEvent) : void => {

            this.goToGame(true, 0, event);
        }),

        new MenuButton(text[1] ?? "null", (event : ProgramEvent) : void => {

            this.goToGame(false, 0, event);
        }),

        new MenuButton(text[2] ?? "null", (event : ProgramEvent) : void => {

            this.settings.activate(event);
        }),

        ], true);
    }


    private goToGame(newGame : boolean, file : number, event : ProgramEvent) : void {

        this.menu.deactivate();
            event.transition.activate(true, TransitionType.Circle, 1.0/30.0, event,
                (event : ProgramEvent) : void => {

                    event.scenes.changeScene("game", event);
            });
    }


    public init (param : SceneParameter, event : ProgramEvent) : void {

        // TODO: Get the position depending on if a save file exist
        this.menu.activate(0);
    }


    public update(event: ProgramEvent) : void {
        
        if (event.transition.isActive()) {

            // TODO: Update background
            return;
        }

        if (this.settings.isActive()) {

            this.settings.update(event);
            return;
        }

        this.menu.update(event);
    }


    public redraw(canvas: Canvas, assets: Assets) : void {
        
        canvas.clear(0, 73, 182);

        if (this.settings.isActive()) {

            this.settings.draw(canvas, assets, 0, 48);
        }
        else {

            this.menu.draw(canvas, assets, 0, 48);
        }

        // TODO: Draw copyright
    }


    public dispose() : SceneParameter {
        
        // TODO: Return save index?
        return undefined;
    }


    

}
