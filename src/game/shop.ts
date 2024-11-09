import { Progress } from "./progress.js";
import { TextBox } from "../ui/textbox.js";
import { ConfirmationBox } from "../ui/confirmationbox.js";
import { ProgramEvent } from "../core/event.js";
import { Align, Bitmap, Canvas, Flip } from "../gfx/interface.js";
import { Assets } from "../core/assets.js";
import { InputState } from "../core/inputstate.js";
import { negMod } from "../math/utility.js";
import { drawUIBox } from "../ui/box.js";
import { MENU_ITEM_BASE_COLOR, MENU_ITEM_SELECTED_COLOR } from "../ui/menu.js";
import { drawHUD } from "./hud.js";


class ShopItem {

    public name : string = "";
    public price : number = 0;
    public itemID : number = 0;

    public obtained : boolean = false;


    constructor(name : string, price : number, itemID : number) {

        this.name = name;
        this.price = price;
        this.itemID = itemID;
    }
}


export class Shop {


    private items : ShopItem[];

    private cursorPos : number = 0;
    private active : boolean = false;

    private message : TextBox;
    private confirmationMessage : ConfirmationBox;

    private handAnimation : number = 0;

    private cancelText : string = "null";


    constructor(event : ProgramEvent) {

        this.items = new Array<ShopItem> ();

        this.message = new TextBox();
        this.confirmationMessage = new ConfirmationBox(
            event.localization?.getItem("yesno") ?? ["null", "null"],
            (event.localization?.getItem("purchase") ?? ["null"])[0],
            (event : ProgramEvent) : void => {

                this.message.addText(event.localization?.getItem("purchase") ?? ["null"]);
                this.message.activate(true);
            },
            (event : ProgramEvent) : void => {

                this.confirmationMessage.deactivate();
            });

        this.cancelText = (event.localization?.getItem("cancel") ?? ["null"])[0];
    }


    private prepareMessage(progress : Progress, event : ProgramEvent) : void {

        const price : number = this.items[this.cursorPos]?.price ?? 0;

        if (price > progress.getMoney()) {

            event.audio.playSample(event.assets.getSample("deny"), 0.70);

            this.message.addText(event.localization?.getItem("nomoney") ?? ["null"]);
            this.message.activate(true);
        }
        else {

            event.audio.playSample(event.assets.getSample("select"), 0.40);
            this.confirmationMessage.activate(1);
        }
    }


    private checkObtainedItems(progress : Progress) : void {

        for (const i of this.items) {

            i.obtained = progress.hasItem(i.itemID);
        }
    }


    public addItem(name : string, price : number, itemID : number) : void {

        this.items.push(new ShopItem(name, price, itemID));
    }


    public update(progress : Progress, event : ProgramEvent) : void {

        const HAND_ANIMATION_SPEED : number = Math.PI*2/60.0;

        if (!this.active) {

            return;
        }

        if (this.confirmationMessage.isActive()) {

            this.confirmationMessage.update(event);
            return;
        }

        if (this.message.isActive()) {

            this.message.update(event);
            return;
        }


        const oldPos : number = this.cursorPos;
        if (event.input.upPress()) {

            -- this.cursorPos;
        }
        else if (event.input.downPress()) {

            ++ this.cursorPos;
        }

        const buttonCount : number = this.items.length + 1;
        if (oldPos != this.cursorPos) {

            this.cursorPos = negMod(this.cursorPos, buttonCount);
            event.audio.playSample(event.assets.getSample("choose"), 0.50);
        }

        if (event.input.getAction("select") == InputState.Pressed) {

            if (this.cursorPos == buttonCount - 1) {

                event.audio.playSample(event.assets.getSample("select"), 0.40);
                this.deactivate();
                return;
            }

            if (this.items[this.cursorPos].obtained) {

                event.audio.playSample(event.assets.getSample("deny"), 0.70);
            }
            else {
            
                this.prepareMessage(progress, event);
            }
        }

        if (event.input.getAction("back") == InputState.Pressed) {
            
            event.audio.playSample(event.assets.getSample("select"), 0.40);
            this.deactivate();
        }

        this.handAnimation = (this.handAnimation + HAND_ANIMATION_SPEED*event.tick) % (Math.PI*2);
    }


    public draw(canvas : Canvas, assets : Assets, progress : Progress) : void {

        const BOX_WIDTH : number = 224;
        const ITEM_OFFSET : number = 12;

        const SIDE_OFFSET : number = 4;
        const HAND_OFFSET : number = 14;

        const DARKEN_ALPHA : number = 0.33;

        if (!this.active) {

            return;
        }

        canvas.setColor(0, 0, 0, DARKEN_ALPHA);
        canvas.fillRect(0, 0, canvas.width, canvas.height);
        canvas.setColor();

        drawHUD(canvas, assets, progress);

        if (this.confirmationMessage.isActive()) {

            this.confirmationMessage.draw(canvas, assets);
            return;
        }

        if (this.message.isActive()) {

            this.message.draw(canvas, assets);
            return;
        }

        const width : number = BOX_WIDTH;
        const height : number = (this.items.length + 2)*ITEM_OFFSET;

        const dx : number = canvas.width/2 - width/2;
        const dy : number = canvas.height/2 - height/2;

        const yoff : number = ITEM_OFFSET/2 + SIDE_OFFSET/2;


        drawUIBox(canvas, dx, dy, width, height);

        const font : Bitmap | undefined = assets.getBitmap("font");

        for (let i : number = 0; i < this.items.length + 1; ++ i) {

            // This is a beautiful line
            const buttonColor : number[] = 
                (i ==  this.cursorPos ? MENU_ITEM_SELECTED_COLOR : MENU_ITEM_BASE_COLOR)
                [Number(this.items[i]?.obtained ?? 0)];
            canvas.setColor(...buttonColor);

            const lineY : number =  dy + i*ITEM_OFFSET + yoff;

            // Item text
            const itemText : string = i == this.items.length ? this.cancelText : this.items[i].name;
            canvas.drawText(font, itemText, 
                dx + HAND_OFFSET + SIDE_OFFSET, lineY);

            // Item price
            if (i != this.items.length) {

                const price : string = `${this.items[i].price}`;
                canvas.drawText(font, price, dx + BOX_WIDTH - 8, lineY, 0, 0, Align.Right);

                // Coin symbol
                canvas.setColor();
                canvas.drawBitmap(font, Flip.None, dx + BOX_WIDTH - 14, lineY, 24, 0, 8, 8);
            }
                
            // Hand
            if (i == this.cursorPos) {

                canvas.setColor(...MENU_ITEM_SELECTED_COLOR[0]);
                canvas.drawBitmap(font, Flip.None, 
                    dx + SIDE_OFFSET + Math.round(Math.sin(this.handAnimation)), lineY, 
                    8, 0, 16, 8);
            }
        }
    }


    public activate(progress : Progress) : void {

        this.checkObtainedItems(progress);

        this.cursorPos = 0;
        this.active = true;
    }


    public deactivate() : void {

        this.active = false;
        
        this.confirmationMessage.deactivate();
        this.message.deactivate();
    }


    public isActive = () : boolean => this.active;

}
