import { Assets } from "../core/assets.js";
import { ProgramEvent } from "../core/event.js";
import { Canvas } from "../gfx/interface.js";
import { ConfirmationBox } from "../ui/confirmationbox.js";
import { Menu } from "../ui/menu.js";
import { MenuButton } from "../ui/menubutton.js";
import { TextBox } from "../ui/textbox.js";


export class Pause {


    private menu : Menu;
    private gameSavedBox : TextBox;
    private respawnBox : ConfirmationBox;
    private quitBox : ConfirmationBox;

    private active : boolean = false;


    constructor(event : ProgramEvent) {

        this.gameSavedBox = new TextBox();

        const menuText : string[] = event.localization?.getItem("pause_menu") ?? [];

        const strYes : string = event.localization?.getItem("yes")?.[0] ?? "null";
        const strNo : string = event.localization?.getItem("no")?.[0] ?? "null";

        this.menu = new Menu(
            [
    
            // Resume
            new MenuButton(menuText[0] ?? "null",
            (event : ProgramEvent) => {
    
                this.deactivate();
                // resumeEvent(event);
            }),
    
            // Respawn
            new MenuButton(menuText[1] ?? "null",
            (event : ProgramEvent) => {
    
                this.respawnBox.activate(1);
            }),
    
            // Save game
            new MenuButton(menuText[2] ?? "null",
            (event : ProgramEvent) => {
    
                this.gameSavedBox.activate();
            }),
    
            // Settings
            new MenuButton(menuText[3] ?? "null",
            (event : ProgramEvent) => {
    
                // ...
            }),
    
            // Quit
            new MenuButton(menuText[4] ?? "null",
            (event : ProgramEvent) => {
    
                this.quitBox.activate(1);
            }),
            ], false);
    }


    public update(event : ProgramEvent) : void {

        if (!this.active) {

            return;
        }

        if (this.gameSavedBox?.isActive()) {

            this.gameSavedBox.update(event);
            return;
        }

        if (this.respawnBox?.isActive()) {

            this.respawnBox.update(event);
            return;
        }

        if (this.quitBox?.isActive()) {

            this.quitBox.update(event);
            return;
        }

        this.menu.update(event);
    }


    public draw(canvas : Canvas, assets : Assets) : void {

        const DARKEN_MAGNITUDE : number = 0.50;

        if (!this.active) {

            return;
        }

        canvas.setColor(0, 0, 0, DARKEN_MAGNITUDE);
        canvas.fillRect();
        canvas.setColor();

        if (this.gameSavedBox?.isActive()) {

            this.gameSavedBox.draw(canvas, assets);
            return;
        }

        if (this.respawnBox?.isActive()) {

            this.respawnBox.draw(canvas, assets);
            return;
        }

        if (this.quitBox?.isActive()) {

            this.quitBox.draw(canvas, assets);
            return;
        }

        this.menu.draw(canvas, assets);
    }


    public activate() : void {

        this.active = true;

        this.menu.activate(0);
        this.quitBox?.deactivate();
        this.respawnBox?.deactivate();
        this.gameSavedBox?.deactivate();
    }


    public deactivate() : void {

        this.active = false;

        this.menu.deactivate();
        this.quitBox?.deactivate();
        this.respawnBox?.deactivate();
        this.gameSavedBox?.deactivate();
    }


    public isActive = () : boolean => this.active;
}
