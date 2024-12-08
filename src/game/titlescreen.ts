import { Assets } from "../core/assets.js";
import { ProgramEvent } from "../core/event.js";
import { InputState } from "../core/inputstate.js";
import { Scene, SceneParameter } from "../core/scene.js";
import { TransitionType } from "../core/transition.js";
import { Align, Bitmap, Canvas, Flip } from "../gfx/interface.js";
import { drawUIBox } from "../ui/box.js";
import { ConfirmationBox } from "../ui/confirmationbox.js";
import { Menu } from "../ui/menu.js";
import { MenuButton } from "../ui/menubutton.js";
import { TextBox } from "../ui/textbox.js";
import { Background, BackgroundType } from "./background.js";
import { Camera } from "./camera.js";
import { LOCAL_STORAGE_KEY } from "./progress.js";
import { Settings } from "./settings.js";
import { TILE_HEIGHT, TILE_WIDTH } from "./tilesize.js";
import { VERSION } from "./version.js";


const MUSIC_VOLUME : number = 0.60;

const CORNER_TILEMAP : number[] = [
    -1,  94, 95, -1,
    -1,  110, 111, 54,
     0,  1, 1, 1,
    16,  17, 17,17,
];
const CORNER_TILEMAP_WIDTH : number = 4;
const CORNER_TILEMAP_HEIGHT : number = 4;

const SAVE_INFO_APPEAR_TIME : number = 30;


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

    private logoWave : number = 0;

    private background : Background;
    private dummyCamera : Camera;

    private enterPressed : boolean = false;
    private enterTimer : number = 1.0;
    private enterText : string = "null";

    private showSaveInfo : boolean = false;
    private saveInfoText : string[] | undefined = undefined;
    private saveInfoAppearTimer : number = 0;
    private saveInfoAppearPhase : number = 0;

    private disabledButtons : boolean[];


    constructor(event : ProgramEvent) {

        this.disabledButtons = (new Array<boolean> (3)).fill(false);

        const text : string[] = event.localization?.getItem("titlescreen") ?? [];

        this.settings = new Settings(event, (event : ProgramEvent) : void => {

            this.activeMenu = this.menu;
            this.activeMenuOffset = 1;
        });

        this.menu = new Menu(
        [
            new MenuButton(text[0] ?? "null", (event : ProgramEvent) : void => {

                this.setFileMenuButtonNames(this.fileMenu);
                let cursorPos : number = 0;
                for (let i : number = 0; i < this.disabledButtons.length; ++ i) {

                    if (!this.disabledButtons[i]) {

                        cursorPos = i;
                        break;
                    }
                }

                this.fileMenu.activate(cursorPos);

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
        // TODO: Create button in for loop to avoid repeating code
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

        this.background = new Background(event.screenHeight, BackgroundType.Graveyard);
        this.dummyCamera = new Camera(0, -128, event);
    }


    private setFileMenuButtonNames(menu : Menu, disableNonExisting : boolean = false) : void {

        
        for (let i : number = 0; i < 3; ++ i) {

            this.disabledButtons[i] = true;

            let str : string = "--/--/----";

            try {

                const saveFile : string | undefined = window["localStorage"]["getItem"](LOCAL_STORAGE_KEY + String(i));
                if (saveFile !== null) {

                    const json : unknown = JSON.parse(saveFile) ?? {};
                    str = json["date"] ?? str;

                    this.disabledButtons[i] = false;
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
        event.audio.stopMusic();
        this.menu.deactivate();

        if (this.disabledButtons[file]) {

            this.toggleSaveFileInfo();
            return;
        }

        event.transition.activate(true, TransitionType.Circle, 1.0/30.0, event,
        (event : ProgramEvent) : void => {

            event.scenes.changeScene("game", event);
        });
    }


    private toggleSaveFileInfo() : void {

        this.saveInfoAppearPhase = 0;
        this.saveInfoAppearTimer = 0;
        this.showSaveInfo = true;
    }


    private updateSaveInfo(event : ProgramEvent) : void {

        if (this.saveInfoAppearPhase != 1) {

            this.saveInfoAppearTimer += event.tick;
            if (this.saveInfoAppearTimer >= SAVE_INFO_APPEAR_TIME) {

                if (this.saveInfoAppearPhase == 0) {
                
                    this.saveInfoAppearPhase = 1;
                }
                else {

                    event.transition.activate(false, TransitionType.Circle, 1.0/30.0, event);
                    event.scenes.changeScene("game", event);
                }
            }
            return;
        }

        if (event.input.isAnyPressed()) {

            event.audio.playSample(event.assets.getSample("select"), 0.40);
            this.saveInfoAppearPhase = 2;
            this.saveInfoAppearTimer = 0.0;
        }
    }


    private drawCornerTilemap(canvas : Canvas, assets : Assets) : void {

        const PLAYER_X : number = -6;
        const PLAYER_Y : number = 13;

        const bmpTileset1 : Bitmap | undefined = assets.getBitmap("tileset_1");
        const bmpPlayer : Bitmap | undefined = assets.getBitmap("player");
        const bmpWeapons : Bitmap | undefined = assets.getBitmap("weapons");

        canvas.setColor();
        canvas.moveTo(
            canvas.width - CORNER_TILEMAP_WIDTH*TILE_WIDTH, 
            canvas.height - CORNER_TILEMAP_HEIGHT*TILE_HEIGHT);

        for (let y : number = 0; y < CORNER_TILEMAP_HEIGHT; ++ y) {

            for (let x : number = 0 ; x < CORNER_TILEMAP_WIDTH; ++ x) {

                const tile : number = CORNER_TILEMAP[y*CORNER_TILEMAP_WIDTH + x];
                if (tile < 0) {

                    continue;
                }

                const sx : number = tile % 16;
                const sy : number = Math.floor(tile/16);

                canvas.drawBitmap(bmpTileset1, Flip.None, 
                    x*TILE_WIDTH, y*TILE_HEIGHT, 
                    sx*TILE_WIDTH, sy*TILE_HEIGHT, 
                    TILE_WIDTH, TILE_HEIGHT);
            }
        }

        // Sword
        canvas.drawBitmap(bmpWeapons, Flip.Horizontal, PLAYER_X - 7, PLAYER_Y + 14, 139, 18, 16, 16)
        // Player
        canvas.drawBitmap(bmpPlayer, Flip.None, PLAYER_X, PLAYER_Y, 192, 72, 24, 24);

        canvas.moveTo();
    }


    private drawSaveInfo(canvas : Canvas, assets : Assets) : void {

        const BOX_WIDTH : number = 224;
        const BOX_HEIGHT : number = 160;
        const EDGE_OFFSET : number = 8;

        canvas.clear(0, 0, 0);

        let t : number = 0.0;
        if (this.saveInfoAppearPhase != 1) {

            t = this.saveInfoAppearTimer/SAVE_INFO_APPEAR_TIME;;
        }

        const yoff : number = this.saveInfoAppearPhase == 0 ? (1.0 - t)*canvas.height : -t*canvas.height;
        const dy : number = canvas.height/2 - BOX_HEIGHT/2 + yoff;

        drawUIBox(canvas, canvas.width/2 - BOX_WIDTH/2, dy, BOX_WIDTH, BOX_HEIGHT);

        if (this.saveInfoText === undefined) {

            return;
        }

        const bmpFont : Bitmap | undefined = assets.getBitmap("font");
        const bmpHUD : Bitmap | undefined = assets.getBitmap("hud");

        const dx : number = canvas.width/2 - BOX_WIDTH/2;

        canvas.drawText(bmpFont, this.saveInfoText[0], 
            dx + EDGE_OFFSET, dy + EDGE_OFFSET, -1, 2);
        // Save success icon
        const frame : number = Math.floor(this.enterTimer*8);
        canvas.drawBitmap(bmpHUD, Flip.None, canvas.width/2 - 16, dy + 32, frame*16, 16, 16, 16);

        canvas.drawText(bmpFont, this.saveInfoText[1], 
            dx + EDGE_OFFSET, dy + EDGE_OFFSET + 44, -1, 2);
        // Save failure icon
        canvas.drawBitmap(bmpHUD, Flip.None, canvas.width/2 - 16, dy + 88, 52, 0, 8, 16);
        canvas.drawBitmap(bmpHUD, Flip.None, canvas.width/2 - 8, dy + 88, 0, 16, 16, 16);
        
        canvas.drawText(bmpFont, this.saveInfoText[2], 
            dx + EDGE_OFFSET, dy + EDGE_OFFSET + 102, -1, 2);
        canvas.drawText(bmpFont, this.saveInfoText[3], 
            dx + EDGE_OFFSET, dy + EDGE_OFFSET + 128, -1, 2);
    }


    public init(param : SceneParameter, event : ProgramEvent) : void {

        this.menu.activate(0);

        this.activeMenu = this.menu;
        this.activeMenuOffset = 1;

        event.audio.fadeInMusic(event.assets.getSample("titlescreen"), MUSIC_VOLUME, 1000.0);

        this.enterText = event.localization?.getItem("press_enter")?.[0] ?? "null";

        this.saveInfoText = event.localization?.getItem("save_info");

        this.showSaveInfo = false;
        this.saveInfoAppearPhase = 0;
    }


    public update(event: ProgramEvent) : void {
        
        const LOGO_WAVE_SPEED : number = Math.PI*2/120.0;
        const ENTER_FLICKER_TIME : number = 1.0/60.0;

        this.dummyCamera.update(event);
        this.logoWave = (this.logoWave + LOGO_WAVE_SPEED*event.tick) % (Math.PI*2);
        this.background.update(this.dummyCamera, event);

        if (event.transition.isActive()) {

            return;
        }

        this.enterTimer = (this.enterTimer + ENTER_FLICKER_TIME*event.tick) % 1.0

        if (this.showSaveInfo) {

            this.updateSaveInfo(event);
            return;
        }

        if (!this.enterPressed) {

            if (event.input.getAction("start") == InputState.Pressed) {

                event.audio.playSample(event.assets.getSample("pause"), 0.60);
                this.enterPressed = true;
            }
            return;
        }

        this.activeMenu?.update(event);
    }


    public redraw(canvas: Canvas, assets: Assets) : void {
        
        const MENU_YOFF : number = 48;
        const LOGO_YOFF : number = 16;
        const PRESS_ENTER_OFFSET : number = 56;

        if (this.showSaveInfo) {

            this.drawSaveInfo(canvas, assets);
            return;
        }

        const bmpFontOutlines : Bitmap | undefined = assets.getBitmap("font_outlines");
        const bmpLogo : Bitmap | undefined = assets.getBitmap("logo");
        // const bmpMouth : Bitmap | undefined = assets.getBitmap("mouth");

        // canvas.clear(219, 219, 219);
        this.background.draw(canvas, assets, this.dummyCamera);
        this.drawCornerTilemap(canvas, assets);

        canvas.drawHorizontallyWavingBitmap(bmpLogo, 2, 48, this.logoWave,
            Flip.None, canvas.width/2 - (bmpLogo?.width ?? 0)/2, LOGO_YOFF);
        // canvas.drawBitmap(bmpMouth, Flip.None, canvas.width/2 - 32, 8, 0, 0, 64, 32);

        if (!this.enterPressed) {

            if (this.enterTimer < 0.5) {

                canvas.drawText(bmpFontOutlines, this.enterText,
                    canvas.width/2, canvas.height - PRESS_ENTER_OFFSET, 
                    -9, 0, Align.Center);
            }
        }
        else {

            this.activeMenu?.draw(canvas, assets, 0, this.activeMenuOffset*MENU_YOFF);
        }

        canvas.setColor(146, 255, 73);
        canvas.drawText(bmpFontOutlines, "\u0008 2024 Jani Nyk\u0007nen", 
            canvas.width/2, canvas.height - 16, -9, 0, Align.Center);
        canvas.setColor();

        // Draw version
        canvas.drawText(bmpFontOutlines, VERSION, -1, -1, -9, 0);
    }


    public dispose() : SceneParameter {
        
        return this.activeFileIndex;
    }
}
