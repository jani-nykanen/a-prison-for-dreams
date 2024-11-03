import { Assets } from "../core/assets.js";
import { ProgramEvent } from "../core/event.js";
import { Scene, SceneParameter } from "../core/scene.js";
import { TransitionType } from "../core/transition.js";
import { Canvas } from "../gfx/interface.js";
import { ConfirmationBox } from "../ui/confirmationbox.js";
import { Menu } from "../ui/menu.js";
import { MenuButton } from "../ui/menubutton.js";
import { TextBox } from "../ui/textbox.js";
import { LOCAL_STORAGE_KEY } from "./progress.js";
import { Settings } from "./settings.js";


export class TitleScreen implements Scene {

    
    private menu : Menu;
    private fileMenu : Menu; // Not really
    private clearDataMenu : Menu; 
    private confirmClearDataMenu : ConfirmationBox;
    private dataClearedMessage : TextBox;
    private settings : Settings;

    private clearDataIndex : number = 0;
    private activeFileIndex : number = 0;

    private activeMenu : Menu | ConfirmationBox | TextBox | Settings | undefined = undefined;
    private activeMenuOffset : number = 1;


    constructor(event : ProgramEvent) {

        const text : string[] = event.localization?.getItem("titlescreen") ?? [];

        this.settings = new Settings(event, (event : ProgramEvent) : void => {

            this.activeMenu = this.menu;
            this.activeMenuOffset = 1;
        });

        this.menu = new Menu(
        [
            new MenuButton(text[0] ?? "null", (event : ProgramEvent) : void => {

                this.setFileMenuButtonNames(this.fileMenu);
                this.fileMenu.activate(0);

                this.activeMenu = this.fileMenu;
                this.activeMenuOffset = 1;
            }),
            new MenuButton(text[1] ?? "null", (event : ProgramEvent) : void => {

                this.setFileMenuButtonNames(this.clearDataMenu, true);
                this.clearDataMenu.activate(3);

                this.activeMenu = this.clearDataMenu;
                this.activeMenuOffset = 1;
            }),
            new MenuButton(text[2] ?? "null", (event : ProgramEvent) : void => {

                this.settings.activate(event);

                this.activeMenu =  this.settings;
                this.activeMenuOffset = 1;
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
                this.activeMenu = this.menu;
                this.activeMenuOffset = 1;
            })
        ]
        );


        // TODO: Repeating code, replace with a common method
        // that generates both of this menus
        this.clearDataMenu = new Menu(
        [
                new MenuButton(emptyFileString, (event : ProgramEvent) : void => {
    
                    this.toggleClearDataBox(0);
                }),
                new MenuButton(emptyFileString, (event : ProgramEvent) : void => {
    
                    this.toggleClearDataBox(1);
                }),
                new MenuButton(emptyFileString, (event : ProgramEvent) : void => {
    
                    this.toggleClearDataBox(2);
                }),
                new MenuButton((event.localization?.getItem("back") ?? ["null"])[0], 
                (event : ProgramEvent) : void => {
    
                    this.clearDataMenu.deactivate();

                    this.activeMenu = this.menu;
                    this.activeMenuOffset = 1;
                })
        ]);

        this.dataClearedMessage = new TextBox();

        this.confirmClearDataMenu = new ConfirmationBox(
            event.localization?.getItem("yesno") ?? ["null", "null"],
            (event.localization?.getItem("clear_data") ?? ["null"])[0],
            (event : ProgramEvent) : void => {

                this.clearData();
                
                this.confirmClearDataMenu.deactivate();

                this.dataClearedMessage.addText(event.localization?.getItem("data_cleared") ?? ["null"]);
                this.dataClearedMessage.activate(true, null, (event : ProgramEvent) : void => {

                    this.activeMenu = this.clearDataMenu;
                    this.activeMenuOffset = 1;
                });

                this.activeMenu = this.dataClearedMessage;
                this.activeMenuOffset = 0;

                this.setFileMenuButtonNames(this.clearDataMenu, true);
            },
            (event : ProgramEvent) : void => {
                
                this.confirmClearDataMenu.deactivate();
                this.activeMenu = this.clearDataMenu;
                this.activeMenuOffset = 1;
            });
    }


    private setFileMenuButtonNames(menu : Menu, disableNonExisting : boolean = false) : void {

        for (let i = 0; i < 3; ++ i) {

            let str : string = "--/--/----";

            try {

                const saveFile : string | undefined = window["localStorage"]["getItem"](LOCAL_STORAGE_KEY + String(i));
                if (saveFile !== null) {

                    const json : unknown = JSON.parse(saveFile) ?? {};
                    str = json["date"] ?? str;
                }

                if (disableNonExisting) {

                    menu.toggleDeactivation(i, saveFile === null);
                }
            }
            catch(e) {

                console.error("Not-so-fatal error: failed to access the save files: " + e["message"]);
            }

            menu.changeButtonText(i, str);
        }
    }


    private clearData() : void {

        try {
         
            window["localStorage"]["removeItem"](LOCAL_STORAGE_KEY + String(this.clearDataIndex));
        }
        catch (e) {

            console.error("Not so fatal error: failed to clear save data: " + e["message"]);
        }
    }


    private toggleClearDataBox(file : number) : void {

        this.clearDataIndex = file;

        this.confirmClearDataMenu.activate(1);
        this.activeMenu = this.confirmClearDataMenu;
        this.activeMenuOffset = 0;
    }


    private goToGame(file : number, event : ProgramEvent) : void {

        this.activeFileIndex = file;

        this.menu.deactivate();
            event.transition.activate(true, TransitionType.Circle, 1.0/30.0, event,
            (event : ProgramEvent) : void => {

                event.scenes.changeScene("game", event);
            });
    }


    public init (param : SceneParameter, event : ProgramEvent) : void {

        // TODO: Get the position depending on if a save file exist
        this.menu.activate(0);

        this.activeMenu = this.menu;
        this.activeMenuOffset = 1;
    }


    public update(event: ProgramEvent) : void {
        
        if (event.transition.isActive()) {

            // TODO: Update background
            return;
        }

        this.activeMenu?.update(event);
    }


    public redraw(canvas: Canvas, assets: Assets) : void {
        
        const YOFF : number = 48;

        canvas.clear(0, 73, 182);

        this.activeMenu?.draw(canvas, assets, 0, this.activeMenuOffset*YOFF);

        // TODO: Draw copyright
    }


    public dispose() : SceneParameter {
        
        return this.activeFileIndex;
    }
}
