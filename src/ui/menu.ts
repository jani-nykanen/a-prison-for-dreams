import { ProgramEvent } from "../core/event.js";
import { InputState } from "../core/inputstate.js";
import { negMod } from "../math/utility.js";
import { Bitmap, Canvas, Flip } from "../gfx/interface.js";
import { MenuButton } from "./menubutton.js";
import { RGBA } from "../math/rgba.js";
import { drawUIBox } from "./box.js";
import { Assets } from "../core/assets.js";


export const MENU_ITEM_BASE_COLOR : number[][] = [[255, 255, 255], [146, 146, 146]];
export const MENU_ITEM_SELECTED_COLOR : number[][] = [[255, 255, 0], [182, 182, 36]];


export class Menu {


    private buttons : Array<MenuButton>;

    private cursorPos : number = 0;
    private active : boolean = false;
    
    private height : number;
    private width : number;

    private handAnimation : number = 0;


    constructor(buttons : Array<MenuButton>, makeActive : boolean = false,
        fixedWidth : number | undefined = undefined, 
        fixedHeight : number | undefined = undefined) {

        this.buttons = buttons.map((_, i) => buttons[i].clone());
    
        this.active = makeActive;

        this.width = fixedWidth ?? (2 + Math.max(...this.buttons.map(b => b.getText().length)));
        this.height = fixedHeight ?? this.buttons.length;
    }


    public activate(cursorPos : number = this.cursorPos) : void {

        if (cursorPos == -1) {

            cursorPos = this.buttons.length - 1;
        }

        this.cursorPos = cursorPos % this.buttons.length;
        this.active = true;
    }


    public update(event : ProgramEvent) : void {

        const HAND_ANIMATION_SPEED : number = Math.PI*2/60.0;

        if (!this.active) {
            
            return;
        }

        const oldPos : number = this.cursorPos;
        if (event.input.upPress()) {

            -- this.cursorPos;
        }
        else if (event.input.downPress()) {

            ++ this.cursorPos;
        }

        if (oldPos != this.cursorPos) {

            this.cursorPos = negMod(this.cursorPos, this.buttons.length);
            event.audio.playSample(event.assets.getSample("choose"), 0.50);
        }

        // Selection event
        if (event.input.getAction("select") == InputState.Pressed) {

            if (this.buttons[this.cursorPos].isDeactivated()) {

                event.audio.playSample(event.assets.getSample("deny"), 0.70);
            }
            else if (this.buttons[this.cursorPos].evaluateCallback(event)) {
            
                event.audio.playSample(event.assets.getSample("select"), 0.40);
            }
        }

        // Left & right events
        if ((event.input.leftPress() && this.buttons[this.cursorPos].evaluateLeftCallback(event)) ||
            (event.input.rightPress() && this.buttons[this.cursorPos].evaluateRightCallback(event))) {

            event.audio.playSample(event.assets.getSample("choose"), 0.70);
        }


        this.handAnimation = (this.handAnimation + HAND_ANIMATION_SPEED*event.tick) % (Math.PI*2);
    }


    public draw(canvas : Canvas, assets : Assets,
        x : number = 0, y : number = 0, yoff : number = 12, 
        drawBox : boolean = true, boxColors : RGBA[] | undefined = undefined,
        drawShadow : boolean = true, shadowAlpha : number = 0.25, 
        shadowOffset : number = 2) : void {

        const BOX_OFFSET : number = 2;
        const SIDE_OFFSET : number = 2;

        if (!this.active) {
            
            return;
        }

        const font : Bitmap | undefined = assets.getBitmap("font");
        const charDim : number = (font?.width ?? 128)/16;

        const w : number = (this.width + 1)*charDim;
        const h : number = this.height*yoff;

        const dx : number = x + canvas.width/2 - w/2;
        const dy : number = y + canvas.height/2 - h/2; 

        if (drawBox) {

            drawUIBox(canvas, 
                dx - BOX_OFFSET, dy - BOX_OFFSET, 
                w + BOX_OFFSET*2, h + BOX_OFFSET*2,
                boxColors, drawShadow, shadowAlpha, 
                shadowOffset);
        }

        for (let i : number = 0; i < this.buttons.length; ++ i) {

            // This is a beautiful line
            const buttonColor : number[] = 
                (i ==  this.cursorPos ? MENU_ITEM_SELECTED_COLOR : MENU_ITEM_BASE_COLOR)
                [Number(this.buttons[i].isDeactivated())];
            canvas.setColor(...buttonColor);
            
            const xoff : number = Number(i == this.cursorPos)*15;

            // Item text
            canvas.drawText(font, this.buttons[i].getText(), 
                dx + xoff + SIDE_OFFSET, dy + SIDE_OFFSET + i*yoff);
            // Hand
            if (i == this.cursorPos) {

                canvas.setColor(...MENU_ITEM_SELECTED_COLOR[0]);
                canvas.drawBitmap(font, Flip.None, 
                    dx + SIDE_OFFSET + Math.round(Math.sin(this.handAnimation)), 
                    dy + SIDE_OFFSET + i*yoff, 
                    8, 0, 16, 8);
            }
        } 

        canvas.setColor();
    }


    public isActive = () : boolean => this.active;


    public deactivate() : void {

        this.active = false;
    }


    public changeButtonText(index : number, text : string) : void {

        this.buttons[index].changeText(text);
    }


    public toggleDeactivation(index : number, state : boolean) : void {

        if (index < 0 || index >= this.buttons.length)
            return;

        this.buttons[index].toggleDeactivation(state); 
    }


    public isButtonDeactivated = (i : number) : boolean => this.buttons[i]?.isDeactivated() ?? false;


    public getCursorPos = () : number => this.cursorPos;
    public getButtonCount = () : number => this.buttons.length;


    public callButtonEvent(index : number, event : ProgramEvent) : void {

        if (index < 0 || index >= this.buttons.length)
            return;

        this.buttons[index].evaluateCallback(event);
    }
}
