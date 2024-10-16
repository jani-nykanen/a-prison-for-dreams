import { Assets } from "../core/assets.js";
import { ProgramEvent } from "../core/event.js";
import { Scene, SceneParameter } from "../core/scene.js";
import { TransitionType } from "../core/transition.js";
import { Canvas } from "../gfx/interface.js";
import { Menu } from "../ui/menu.js";
import { MenuButton } from "../ui/menubutton.js";
import { LOCAL_STORAGE_KEY } from "./progress.js";
import { Settings } from "./settings.js";


export class TitleScreen implements Scene {

    
    private menu : Menu;
    private fileMenu : Menu; // Not really
    private settings : Settings;


    constructor(event : ProgramEvent) {

        const text : string[] = event.localization?.getItem("titlescreen") ?? [];

        this.settings = new Settings(event);

        this.menu = new Menu(
        [
            new MenuButton(text[0] ?? "null", (event : ProgramEvent) : void => {

                this.setFileMenuButtonNames();
                this.fileMenu.activate(0);
            }),
            new MenuButton(text[1] ?? "null", (event : ProgramEvent) : void => {

                
            }),
            new MenuButton(text[2] ?? "null", (event : ProgramEvent) : void => {

                this.settings.activate(event);
            }),
        ], true);

        const emptyFileString : string = "--/--/----";
        this.fileMenu = new Menu(
        [
            new MenuButton(emptyFileString, (event : ProgramEvent) : void => {

                this.goToGame(0, event);
            }),
            new MenuButton(emptyFileString, (event : ProgramEvent) : void => {

                this.goToGame(1, event);
            }),
            new MenuButton(emptyFileString, (event : ProgramEvent) : void => {

                this.goToGame(2, event);
            }),
            new MenuButton((event.localization?.getItem("back") ?? ["null"])[0], 
            (event : ProgramEvent) : void => {

                this.fileMenu.deactivate();
            })
        ]
        );
    }


    private setFileMenuButtonNames() : void {

        for (let i = 0; i < 3; ++ i) {

            let str : string = "--/--/----";

            try {

                const saveFile : string | undefined = window["localStorage"]["getItem"](LOCAL_STORAGE_KEY + String(i));
                if (saveFile !== undefined) {

                    const json : unknown = JSON.parse(saveFile) ?? {};
                    str = json["date"] ?? str;
                }
            }
            catch(e) {

                console.error("Not-so-fatal error: failed to access the save files: " + e["message"]);
            }

            this.fileMenu.changeButtonText(i, str);
        }
    }


    private goToGame(file : number, event : ProgramEvent) : void {

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

        if (this.fileMenu.isActive()) {

            this.fileMenu.update(event);
            return;
        }

        if (this.settings.isActive()) {

            this.settings.update(event);
            return;
        }

        this.menu.update(event);
    }


    public redraw(canvas: Canvas, assets: Assets) : void {
        
        const YOFF : number = 48;

        canvas.clear(0, 73, 182);

        if (this.settings.isActive()) {

            this.settings.draw(canvas, assets, 0, YOFF);
        }
        else if (this.fileMenu.isActive()){

            this.fileMenu.draw(canvas, assets, 0, YOFF);
        }
        else {

            this.menu.draw(canvas, assets, 0, YOFF);
        }

        // TODO: Draw copyright
    }


    public dispose() : SceneParameter {
        
        // TODO: Return save index?
        return undefined;
    }


    

}
