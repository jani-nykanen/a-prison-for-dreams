import { Progress } from "./progress.js";
import { TextBox } from "../ui/textbox.js";
import { ConfirmationBox } from "../ui/confirmationbox.js";
import { ProgramEvent } from "../core/event.js";
import { Canvas } from "../gfx/interface.js";
import { Assets } from "../core/assets.js";
import { InputState } from "../core/inputstate.js";
import { negMod } from "../math/utility.js";


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

    private noMoneyMessage : TextBox;
    private confirmationMessage : ConfirmationBox;


    constructor(event : ProgramEvent) {

        this.items = new Array<ShopItem> ();

        this.noMoneyMessage = new TextBox();
        this.confirmationMessage = new ConfirmationBox(
            event.localization?.getItem("yesno") ?? ["null", "null"],
            (event.localization?.getItem("purchase") ?? ["null"])[0],
            (event : ProgramEvent) : void => {

                // TODO: Obtain the item. Somehow.
            },
            (event : ProgramEvent) : void => {

                this.confirmationMessage.deactivate();
            })

    }


    private prepareMessage(progress : Progress, event : ProgramEvent) : void {

        const price : number = this.items[this.cursorPos]?.price ?? 0;

        if (price > progress.getMoney()) {

            event.audio.playSample(event.assets.getSample("deny"), 0.70);

            this.noMoneyMessage.addText(event.localization?.getItem("nomoney") ?? ["null"]);
            this.noMoneyMessage.activate(true);
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

        if (this.active) {

            return;
        }

        if (this.confirmationMessage.isActive()) {

            this.confirmationMessage.update(event);
            return;
        }

        if (this.noMoneyMessage.isActive()) {

            this.noMoneyMessage.update(event);
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

            if (this.cursorPos == buttonCount) {

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

            this.deactivate();
        }
    }


    public draw(canvas : Canvas, assets : Assets) : void {

        const DARKEN_ALPHA : number = 0.33;

        if (!this.active) {

            return;
        }

        canvas.setColor(0, 0, 0, DARKEN_ALPHA);
        canvas.fillRect(0, 0, canvas.width, canvas.height);
        canvas.setColor();

        if (this.confirmationMessage.isActive()) {

            this.confirmationMessage.draw(canvas, assets);
            return;
        }

        if (this.noMoneyMessage.isActive()) {

            this.noMoneyMessage.draw(canvas, assets);
            return;
        }

        // TODO: Draw the rest
        
    }


    public activate(progress : Progress) : void {

        this.checkObtainedItems(progress);

        this.cursorPos = 0;
        this.active = true;
    }


    public deactivate() : void {

        this.active = false;
        
        this.confirmationMessage.deactivate();
        this.noMoneyMessage.deactivate();
    }

}
