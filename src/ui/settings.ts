import { Assets } from "../core/assets.js";
import { ProgramEvent } from "../core/event.js";
import { Canvas } from "../gfx/interface.js";
import { Menu } from "./menu.js";
import { MenuButton } from "./menubutton.js";


export class Settings {


    private menu : Menu;


    constructor(event : ProgramEvent) {

        const text : string[] = event.localization?.getItem("settings") ?? [];

        this.menu = new Menu(
        [
            new MenuButton(text[0] ?? "null",
                (event : ProgramEvent) : void => {

                }
            ),

            new MenuButton((text[1] ?? "null") + ": 100%",
                (event : ProgramEvent) : void => {

                }
            ),

            new MenuButton((text[2] ?? "null") + ": 100%",
                (event : ProgramEvent) : void => {

                }
            ),

            new MenuButton(text[3] ?? "null",
                (event : ProgramEvent) : void => {

                    this.deactivate();
                }
            ),
        ]);   
    }


    public update(event : ProgramEvent) : void {

        this.menu.update(event);
    }


    public draw(canvas : Canvas, assets : Assets) : void {

        this.menu.draw(canvas, assets);
    }


    public activate() : void {

        this.menu.activate();
    }


    public deactivate() : void {

        this.menu.deactivate();
    }


    public isActive = () : boolean => this.menu.isActive();
}
