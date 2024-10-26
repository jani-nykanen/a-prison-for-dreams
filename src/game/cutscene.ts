import { Assets } from "../core/assets.js";
import { ProgramEvent } from "../core/event.js";
import { Bitmap, Canvas, Flip } from "../gfx/interface.js";
import { Sprite } from "../gfx/sprite.js";
import { RGBA } from "../math/rgba.js";
import { TextBox } from "../ui/textbox.js";


const FADE_TIME : number = 20;


export class Cutscene {


    private text : TextBox;
    private active : boolean = false;
    private color : RGBA;

    private mouthSprite : Sprite;

    private fadeTimer : number = 0.0;
    private fadingIn : boolean = false;

    private finishEvent : ((event : ProgramEvent) => void) | undefined = undefined;


    constructor() {

        this.text = new TextBox();
    
        this.color = new RGBA(255, 255, 255);

        this.mouthSprite = new Sprite(64, 32);
        this.mouthSprite.setFrame(0, 0);
    }


    public update(event : ProgramEvent): void {

        const MOUTH_ANIMATION_SPEED : number = 7;

        if (!this.active) {

            return;
        }

        if (this.fadeTimer > 0) {

            this.fadeTimer -= event.tick;
            if (!this.fadingIn && this.fadeTimer <= 0) {

                this.finishEvent?.(event);
                this.deactivate();
            }
            return;
        }

        if (!this.text.isActive()) {

            return;
        }

        this.text.update(event);
        if (!this.text.isFinished() || this.mouthSprite.getColumn() != 0) {

            this.mouthSprite.animate(0, 0, 3, MOUTH_ANIMATION_SPEED, event.tick);
        }
    }


    public draw(canvas : Canvas, assets : Assets) : void {

        const MOUTH_OFF_Y : number = -24;
        const TEXT_OFF_Y : number = 16; 

        if (!this.active) {

            return;
        }

        const bmpMouth : Bitmap | undefined = assets.getBitmap("mouth");

        if (this.fadeTimer <= 0) {

            canvas.setColor(this.color.r, this.color.g, this.color.b);
            this.text.draw(canvas, assets, 0, TEXT_OFF_Y, 2, false);
            canvas.setColor();
        }

        if (bmpMouth === undefined) {

            return;
        }

        if (this.fadeTimer > 0) {

            const alpha : number = this.fadingIn ? 1.0 - this.fadeTimer/FADE_TIME : this.fadeTimer/FADE_TIME;
            canvas.setAlpha(alpha);
        }

        this.mouthSprite.draw(canvas, bmpMouth,
            canvas.width/2 - this.mouthSprite.width/2, 
            canvas.height/2 - this.mouthSprite.height/2 + MOUTH_OFF_Y);

        canvas.setAlpha();
    }


    public activate(index : number, fontColor : RGBA, event : ProgramEvent,
        finishEvent? : (event : ProgramEvent) => void) : void {

        const text : string[] = event.localization?.getItem(`cutscene${index}`) ?? ["null"];

        this.text.addText(text);
        this.text.activate(false, null, (event : ProgramEvent) : void => {

            this.fadeTimer = FADE_TIME;
            this.fadingIn = false;
        });

        this.finishEvent = finishEvent;

        this.color = fontColor.clone();

        this.fadeTimer = FADE_TIME;
        this.fadingIn = true;

        this.active = true;
    }


    public deactivate() : void {

        this.text.deactivate();
        this.active = false;
    }


    public isActive = () : boolean => this.active;
}
