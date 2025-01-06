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
    public description : string = "";
    public price : number = 0;
    public itemID : number = 0;
    public iconID : number = 0;

    public obtained : boolean = false;


    constructor(name : string, description : string,
        price : number, itemID : number, iconID : number) {

        this.name = name;
        this.description = description;
        this.price = price;
        this.itemID = itemID;

        this.iconID = iconID;
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
    private soldOutText : string = "null";

    private buyEvent : ((amount : number) => void) | undefined = undefined;


    constructor(event : ProgramEvent) {

        this.items = new Array<ShopItem> ();

        this.message = new TextBox();
        this.confirmationMessage = new ConfirmationBox(
            event.localization?.getItem("yesno") ?? ["null", "null"],
            (event.localization?.getItem("purchase") ?? ["null"])[0],
            (event : ProgramEvent) : void => {

                this.message.addText(
                    event.localization?.getItem("buyitem") ?? ["null"],
                    [[this.items[this.cursorPos]?.name ?? "null"]]) ;
                this.message.activate(true);

                this.buyEvent?.(this.items[this.cursorPos]?.price ?? 0);
                this.items[this.cursorPos].obtained = true;
            },
            (event : ProgramEvent) : void => {

                this.confirmationMessage.deactivate();
            });

        this.cancelText = (event.localization?.getItem("cancel") ?? ["null"])[0];
        this.soldOutText = (event.localization?.getItem("sold") ?? ["null"])[0];
    }


    private prepareMessage(progress : Progress, event : ProgramEvent) : void {

        const price : number = this.items[this.cursorPos]?.price ?? 0;

        if (price > progress.getMoney()) {

            event.audio.playSample(event.assets.getSample("deny"), 0.70);

            this.message.addText(event.localization?.getItem("nomoney") ?? ["null"]);
            this.message.activate(true);
        }
        else {

            const price : number = this.items[this.cursorPos]?.price ?? 0;
            const priceString : string = `${price}${String.fromCharCode(3)}`;

            event.audio.playSample(event.assets.getSample("select"), 0.40);
            this.confirmationMessage.activate(1, [priceString]);
        }
    }


    private checkObtainedItems(progress : Progress) : void {

        for (const i of this.items) {

            i.obtained = progress.hasItem(i.itemID);
        }
    }


    public addItem(name : string, description : string, 
        price : number, itemID : number, iconID : number) : void {

        this.items.push(new ShopItem(name, description, price, itemID, iconID));
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
                
                this.buyEvent = (amount : number) : void => {

                    const item : ShopItem = this.items[this.cursorPos];
                    progress.obtainItem(item.itemID);
                    progress.updateMoney(-amount);
                }
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
        const DESCRIPTION_BOX_HEIGHT : number = 26;
        const ITEM_OFFSET : number = 12;

        const SIDE_OFFSET : number = 4;
        const HAND_OFFSET : number = 14;
        const SHIFT_Y : number = 16;

        const DARKEN_ALPHA : number = 0.50;

        if (!this.active) {

            return;
        }

        canvas.setColor(0, 0, 0, DARKEN_ALPHA);
        canvas.fillRect(0, 0, canvas.width, canvas.height);
        canvas.setColor();

        drawHUD(canvas, assets, progress);

        const width : number = BOX_WIDTH;
        const height : number = (this.items.length + 2)*ITEM_OFFSET;

        const dx : number = canvas.width/2 - width/2;
        const dy : number = canvas.height/2 - height/2 - SHIFT_Y;

        const yoff : number = ITEM_OFFSET/2 + SIDE_OFFSET/2;

        // Box, my UI is a box!
        drawUIBox(canvas, dx, dy, width, height);

        const font : Bitmap | undefined = assets.getBitmap("font");

        // Item names & prices
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

                const price : string = this.items[i].obtained ? this.soldOutText : `${this.items[i].price} `;
                canvas.drawText(font, price, dx + BOX_WIDTH, lineY, 0, 0, Align.Right);

                if (!this.items[i].obtained) {

                    // Coin symbol
                    canvas.setColor();
                    canvas.drawBitmap(font, Flip.None, dx + BOX_WIDTH - 14, lineY, 24, 0, 8, 8);
                }
            }
                
            // Hand
            if (i == this.cursorPos) {

                canvas.setColor(...MENU_ITEM_SELECTED_COLOR[0]);
                canvas.drawBitmap(font, Flip.None, 
                    dx + SIDE_OFFSET + Math.round(Math.sin(this.handAnimation)), lineY, 
                    8, 0, 16, 8);
            }
        }

        // Item descriptions
        const bottomY : number = dy + height + 4;
        drawUIBox(canvas, dx, bottomY, BOX_WIDTH, DESCRIPTION_BOX_HEIGHT);

        if (this.cursorPos != this.items.length) {

            const item : ShopItem = this.items[this.cursorPos]; 

            canvas.drawText(font,item.description, dx + 28, bottomY + 4, 0, 2);

            // Item icon
            const bmpItemIcons : Bitmap | undefined = assets.getBitmap("item_icons");

            canvas.drawBitmap(bmpItemIcons, Flip.None, dx + 6, bottomY + 5, item.iconID*16, 32, 16, 16);
        }


        // Messages
        if (this.confirmationMessage.isActive()) {

            canvas.setColor(0, 0, 0, DARKEN_ALPHA);
            canvas.fillRect(0, 0, canvas.width, canvas.height);
            canvas.setColor();

            this.confirmationMessage.draw(canvas, assets);
            return;
        }

        if (this.message.isActive()) {

            canvas.setColor(0, 0, 0, DARKEN_ALPHA);
            canvas.fillRect(0, 0, canvas.width, canvas.height);
            canvas.setColor();

            this.message.draw(canvas, assets);
            return;
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
