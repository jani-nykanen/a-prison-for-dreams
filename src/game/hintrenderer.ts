import { Vector } from "../math/vector.js";
import { ProgramEvent } from "../core/event.js";
import { Player } from "./player.js";
import { Align, Bitmap, Canvas } from "../gfx/interface.js";
import { Assets } from "../core/assets.js";


const DEACTIVATION_DISTANCE : number = 160;
const FADE_TIME : number = 20;


export class HintRenderer {


    private message : string = "";
    private startPos : Vector;
    private active : boolean = false;

    private fadeTimer : number = 0;
    private fadeMode : number = 0;


    constructor() {

        this.startPos = new Vector();
    }


    public update(player : Player, event : ProgramEvent) : void {

        if (this.fadeTimer > 0) {

            this.fadeTimer -= event.tick;
        }

        if (!this.active) {

            return;
        }

        const playerPos : Vector = player.getPosition();
        if (Vector.distance(playerPos, this.startPos) > DEACTIVATION_DISTANCE) {

            this.active = false;
            this.fadeTimer = FADE_TIME;
            this.fadeMode = 0;
        }
    }


    public draw(canvas : Canvas, assets : Assets) : void {

        const YOFF : number = 24;

        if (!this.active && this.fadeTimer <= 0) {

            return;
        }

        const bmpFont : Bitmap | undefined = assets.getBitmap("font_outlines");

        let alpha : number = 1.0;
        if (this.fadeTimer > 0) {

            const t : number = this.fadeTimer/FADE_TIME;
            alpha = this.fadeMode == 0 ? t : 1.0 - t;
        }

        canvas.setColor(255, 255, 73, alpha);
        canvas.drawText(bmpFont, this.message, canvas.width/2, YOFF, -8, 0, Align.Center);
        canvas.setColor();
    }


    public activate(startPos : Vector, message : string) : void {

        this.startPos = startPos.clone();
        this.message = message;

        this.active = true;
        this.fadeTimer = FADE_TIME;
        this.fadeMode = 1;
    }


    public deactivate() : void {

        this.active = false;
        this.fadeTimer = 0;
    }
}
