import { Assets } from "../core/assets.js";
import { ProgramEvent } from "../core/event.js";
import { Canvas } from "../gfx/interface.js";
import { RGBA } from "../math/rgba.js";
import { TextBox } from "../ui/textbox.js";


export class Cutscene {


    private text : TextBox;
    private active : boolean = false;
    private color : RGBA;


    constructor() {

        this.text = new TextBox();
    
        this.color = new RGBA(255, 255, 255);
    }


    public update(event : ProgramEvent): void {

        if (!this.active) {

            return;
        }

        this.text.update(event);
        if (!this.text.isActive()) {

            this.active = false;
        }
    }


    public draw(canvas : Canvas, assets : Assets) : void {

       if (!this.active) {

            return;
       }

       canvas.setColor(this.color.r, this.color.g, this.color.b);
       this.text.draw(canvas, assets, 0, 0, 2, false);
       canvas.setColor();
    }


    public activate(index : number, fontColor : RGBA, event : ProgramEvent,
        finishEvent? : (event : ProgramEvent) => void) : void {

        const text : string[] = event.localization?.getItem(`cutscene${index}`) ?? ["null"];

        this.text.addText(text);
        this.text.activate(false, null, finishEvent);

        this.color = fontColor.clone();

        console.log(this.color);

        this.active = true;
    }


    public deactivate() : void {

        this.text.deactivate();
        this.active = false;
    }


    public isActive = () : boolean => this.active;
}
