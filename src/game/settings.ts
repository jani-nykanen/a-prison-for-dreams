import { Assets } from "../core/assets.js";
import { ProgramEvent } from "../core/event.js";
import { InputState } from "../core/inputstate.js";
import { Canvas } from "../gfx/interface.js";
import { Menu } from "../ui/menu.js";
import { MenuButton } from "../ui/menubutton.js";


export const SETTINGS_LOCAL_STORAGE_KEY : string = "the_end_of_dreams__settings";


export class Settings {


    private menu : Menu;
    private backEvent : ((event : ProgramEvent) => void | undefined) = undefined;


    constructor(event : ProgramEvent, backEvent? : (event : ProgramEvent) => void) {

        this.backEvent = backEvent;

        const text : string[] = event.localization?.getItem("settings") ?? [];

        this.menu = new Menu(this.createMenuButtons(text));   
    }


    private createMenuButtons(text : string[]) : MenuButton[] {

        const buttons : MenuButton[] = [
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
        ];
        

         // Only in nw.js
        if (window["nw"] !== undefined) {
        
            buttons.push(new MenuButton(text[2] ?? "null", (event : ProgramEvent) : void => {
        
                window["nw"]?.["Window"]?.["get"]?.()?.["toggleFullscreen"]?.();
            }));
        }


        buttons.push(new MenuButton(text[3] ?? "null",
            (event : ProgramEvent) : void => {

                this.deactivate();
                this.backEvent?.(event);
                this.save(event);
            }
        ));

        return buttons;
    }


    private updateSoundButtonText(event : ProgramEvent) : void {

        const soundVolume : number = event.audio.getSoundVolume();
        const musicVolume : number = event.audio.getMusicVolume();

        const text : string[] = event.localization?.getItem("settings") ?? [];

        this.menu.changeButtonText(0, `${text[0]}: ${soundVolume}%`);
        this.menu.changeButtonText(1, `${text[1]}: ${musicVolume}%`);
    }


    public save(event : ProgramEvent) : void {

        try {

            const output : unknown = {};

            output["musicvolume"] = String(event.audio.getMusicVolume());
            output["soundvolume"] = String(event.audio.getSoundVolume());
            if (window["nw"] !== undefined) {

                output["fullscreen"] = String(window["nw"]?.["Window"]?.["get"]?.()?.["isFullscreen"]);
            }

            window["localStorage"]["setItem"](SETTINGS_LOCAL_STORAGE_KEY, JSON.stringify(output));

        }
        catch (e) {

            console.error("Not-so-fatal error: failed to save settings: " + e["message"]);
        }
    }


    public update(event : ProgramEvent, allowBack : boolean = false) : void {

        if (!this.isActive()) {

            return;
        }

        if (allowBack &&
            event.input.getAction("back") == InputState.Pressed) {

            this.deactivate();
            event.audio.playSample(event.assets.getSample("deny"), 0.60);

            return;
        }

        this.menu.update(event);
    }


    public draw(canvas : Canvas, assets : Assets, xoff : number = 0, yoff : number = 0) : void {

        this.menu.draw(canvas, assets, xoff, yoff);
    }


    public activate(event : ProgramEvent) : void {

        this.updateSoundButtonText(event);
        this.menu.activate(2);
    }


    public deactivate() : void {

        this.menu.deactivate();
    }


    public isActive = () : boolean => this.menu.isActive();
}
