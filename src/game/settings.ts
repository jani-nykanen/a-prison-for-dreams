import { Assets } from "../core/assets.js";
import { ProgramEvent } from "../core/event.js";
import { Canvas } from "../gfx/interface.js";
import { Menu } from "../ui/menu.js";
import { MenuButton } from "../ui/menubutton.js";


export class Settings {


    private menu : Menu;


    constructor(event : ProgramEvent) {

        const text : string[] = event.localization?.getItem("settings") ?? [];

        this.menu = new Menu(
        [
            // NOTE: The actual button text will be set by the "activate" function, we just
            // pass something here to compute the correct size for the menu box.
            new MenuButton((text[0] ?? "null") + ": 100%",
                undefined,
                (event : ProgramEvent) : void => {

                    event.audio.setSoundVolume(event.audio.getSoundVolume() - 10);
                    this.updateSoundButtonText(event);
                },
                (event : ProgramEvent) : void => {

                    event.audio.setSoundVolume(event.audio.getSoundVolume() + 10);
                    this.updateSoundButtonText(event);
                }
            ),

            new MenuButton((text[1] ?? "null") + ": 100%",
                undefined,
                (event : ProgramEvent) : void => {
                    
                    event.audio.setMusicVolume(event.audio.getMusicVolume() - 10);
                    this.updateSoundButtonText(event);
                },
                (event : ProgramEvent) : void => {

                    event.audio.setMusicVolume(event.audio.getMusicVolume() + 10);
                    this.updateSoundButtonText(event);
                }
            ),

            new MenuButton(text[2] ?? "null",
                (event : ProgramEvent) : void => {

                    this.deactivate();
                }
            ),
        ]);   
    }


    private updateSoundButtonText(event : ProgramEvent) : void {

        const soundVolume : number = event.audio.getSoundVolume();
        const musicVolume : number = event.audio.getMusicVolume();

        const text : string[] = event.localization?.getItem("settings") ?? [];

        this.menu.changeButtonText(0, `${text[0]}: ${soundVolume}%`);
        this.menu.changeButtonText(1, `${text[1]}: ${musicVolume}%`);
    }


    public update(event : ProgramEvent) : void {

        this.menu.update(event);
    }


    public draw(canvas : Canvas, assets : Assets, xoff : number = 0, yoff : number = 0) : void {

        this.menu.draw(canvas, assets, xoff, yoff);
    }


    public activate(event : ProgramEvent) : void {

        this.updateSoundButtonText(event);
        this.menu.activate();
    }


    public deactivate() : void {

        this.menu.deactivate();
    }


    public isActive = () : boolean => this.menu.isActive();
}
