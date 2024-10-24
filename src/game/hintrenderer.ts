import { Vector } from "../math/vector.js";
import { ProgramEvent } from "../core/event.js";
import { Player } from "./player.js";
import { Align, Bitmap, Canvas } from "../gfx/interface.js";
import { Assets } from "../core/assets.js";


const DEACTIVATION_DISTANCE : number = 160;


export class HintRenderer {


    private message : string = "";
    private startPos : Vector;
    private active : boolean = false;


    constructor() {

        this.startPos = new Vector();
    }


    public update(player : Player, event : ProgramEvent) : void {

        if (!this.active) {

            return;
        }

        const playerPos : Vector = player.getPosition();
        if (Vector.distance(playerPos, this.startPos) > DEACTIVATION_DISTANCE) {

            this.active = false;
        }
    }


    public draw(canvas : Canvas, assets : Assets) : void {

        const YOFF : number = 24;

        if (!this.active) {

            return;
        }

        const bmpFont : Bitmap | undefined = assets.getBitmap("font_outlines");

        canvas.setColor(255, 255, 73);
        canvas.drawText(bmpFont, this.message, canvas.width/2, YOFF, -8, 0, Align.Center);
        canvas.setColor();
    }


    public activate(startPos : Vector, message : string) : void {

        this.startPos = startPos.clone();
        this.message = message;

        this.active = true;
    }


    public deactivate() : void {

        this.active = false;
    }
}
