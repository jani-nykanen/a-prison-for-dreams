import { Assets } from "../core/assets.js";
import { ProgramEvent } from "../core/event.js";
import { InputState } from "../core/inputstate.js";
import { Bitmap, Canvas } from "../gfx/interface.js";
import { RGBA } from "../math/rgba.js";
import { drawUIBox } from "./box.js";
import { Menu } from "./menu.js";
import { MenuButton } from "./menubutton.js";


export class ConfirmationBox {


    private menu : Menu;

    private message : string[];
    private width : number;
    private height : number;


    constructor(buttonText : string[], message : string, 
        yesEvent : (event : ProgramEvent) => void, 
        noEvent : (event : ProgramEvent) => void) {

        this.message = message.split("\n");
        this.width = Math.max(...this.message.map(s => s.length));
        this.height = this.message.length;

        this.menu = new Menu(
        [
        new MenuButton(buttonText[0], (event : ProgramEvent) => {

            yesEvent(event);
            this.menu.deactivate();
        }),
        new MenuButton(buttonText[1], (event : ProgramEvent) => {
            
            noEvent(event);
            this.menu.deactivate();
        })
        ]);
    }


    public update(event : ProgramEvent) : void {

        if (event.input.getAction("back") == InputState.Pressed) {

            event.audio.playSample(event.assets.getSample("reject"), 0.50);

            this.menu.callButtonEvent(1, event);
            this.deactivate();

            return;
        }
        this.menu.update(event);
    }


    public draw(canvas : Canvas, assets : Assets,
        drawBox : boolean = true, x : number = 0, y : number = 0, 
        yoff : number = 10, menuYoff : number = 12,
        boxColors : RGBA[] | undefined = undefined,
        drawShadow : boolean = true, shadowAlpha : number = 0.25, 
        shadowOffset : number = 2) : void {

        const BOX_OFFSET : number = 2;
        const SIDE_OFFSET : number = 2;

        if (!this.menu.isActive()) {
            
            return;
        }

        const font : Bitmap | undefined = assets.getBitmap("font");
        const charDim : number = (font?.width ?? 128)/16;

        const w : number = (this.width + 1)*charDim;
        const h : number = (this.height + 1)*yoff + 2*menuYoff;

        const dx : number = x + canvas.width/2 - w/2;
        const dy : number = y + canvas.height/2 - h/2; 

        if (drawBox) {
            
            drawUIBox(canvas, 
                dx - BOX_OFFSET, dy - BOX_OFFSET, 
                w + BOX_OFFSET*2, h + BOX_OFFSET*2,
                boxColors, drawShadow, shadowAlpha, 
                shadowOffset);
        }

        for (let i = 0; i < this.message.length; ++ i) {

            canvas.drawText(font, this.message[i], dx + SIDE_OFFSET, dy + SIDE_OFFSET + i*yoff);
        }

        const menuY : number = (dy + h - canvas.height/2) - menuYoff;

        this.menu.draw(canvas, assets, x, menuY, menuYoff, false);
    }


    public changeText(newText : string) : void {

        this.message = newText.split("\n");
        this.width = Math.max(...this.message.map(s => s.length));
        this.height = this.message.length;
    }


    public activate(cursorPos : number = 0) : void {

        this.menu.activate(cursorPos);
    }


    public deactivate() : void {

        this.menu.deactivate();
    }


    public isActive = () : boolean => this.menu.isActive();
}
