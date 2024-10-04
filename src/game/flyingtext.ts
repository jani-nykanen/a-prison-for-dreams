import { Assets } from "../core/assets.js";
import { ProgramEvent } from "../core/event.js";
import { Bitmap, Canvas, Flip } from "../gfx/interface.js";
import { RGBA } from "../math/rgba.js";
import { Vector } from "../math/vector.js";
import { GameObject } from "./gameobject.js";



const CHAR_DISTANCE : number = 6;


export const enum FlyingTextSymbol {

    None = 0,
    Coin = 1,
    Heart = 2,
}


export class FlyingText extends GameObject {


    private symbol : FlyingTextSymbol = FlyingTextSymbol.None;
    private value : number = 0;
    private timer : number = 0;

    private color : RGBA;


    constructor() {

        super(0, 0, false);

        this.color = new RGBA();

        this.cameraCheckArea = new Vector(64, 64);
    }



    public spawn(x : number, y : number, value : number, 
        symbol : FlyingTextSymbol = FlyingTextSymbol.None,
        color : RGBA = new RGBA(255, 255, 255)) : void {
        
        this.pos.x = x;
        this.pos.y = y;

        this.value = value;
        this.symbol = symbol;

        this.timer = 0;

        this.color = color.clone();

        this.exist = true;
    }


    public updateEvent(event : ProgramEvent) : void {

        const FLY_TIME : number = 16;
        const FLY_SPEED : number = -1.5;
        const WAIT_TIME : number = 30;

        this.timer += event.tick;
        if (this.timer < FLY_TIME) {

            this.pos.y += FLY_SPEED*event.tick;
        }

        if (this.timer >= FLY_TIME + WAIT_TIME) {

            this.exist = false;
        }
    }


    public draw(canvas : Canvas, assets : Assets | undefined, bmp : Bitmap | undefined) : void {

        if (!this.isActive()) {

            return;
        }

        const str : string = String(Math.floor(Math.abs(this.value)));

        let dx : number = this.pos.x - str.length*CHAR_DISTANCE/2;
        const dy : number = this.pos.y - 8;

        if (this.symbol > 0) {

            dx -= CHAR_DISTANCE/2;
        }

        canvas.setColor(this.color.r, this.color.g, this.color.b, this.color.a);

        // Sign
        const sign : number = this.value < 0 ? 1 : 0;
        canvas.drawBitmap(bmp, Flip.None, dx, dy, 80 + sign*8, 8, 8, 8);
        dx += CHAR_DISTANCE;

        // Numbers
        for (let i = 0; i < str.length; ++ i) {

            const c : number = Number(str.charAt(i));
            canvas.drawBitmap(bmp, Flip.None, dx, dy, c*8, 8, 8, 8);
            dx += CHAR_DISTANCE;
        }

        canvas.setColor();

        // Symbol
        if (this.symbol > 0) {

            canvas.drawBitmap(bmp, Flip.None, dx, dy, (this.symbol - 1)*8, 0, 8, 8);
        }
    }
}
