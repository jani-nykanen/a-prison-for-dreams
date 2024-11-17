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
    private width : number = 0;
    private height : number = 0;

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

        const TOP_OFF : number = 28;
        const TEXT_YOFF_MODIFIER : number = -4;

        if (!this.active && this.fadeTimer <= 0) {

            return;
        }

        const bmpFont : Bitmap | undefined = assets.getBitmap("font_outlines");

        let alpha : number = 1.0;
        if (this.fadeTimer > 0) {

            const t : number = this.fadeTimer/FADE_TIME;
            alpha = this.fadeMode == 0 ? t : 1.0 - t;
        }

        const dx : number = canvas.width/2 - this.width*4;
        const dy : number = TOP_OFF - this.height*(16 + TEXT_YOFF_MODIFIER)/2;

        canvas.setColor(255, 255, 73, alpha);
        canvas.drawText(bmpFont, this.message, dx, dy, -8, TEXT_YOFF_MODIFIER, Align.Left);
        canvas.setColor();
    }


    public activate(startPos : Vector, message : string) : void {

        this.startPos = startPos.clone();
        this.message = message;

        this.active = true;
        this.fadeTimer = FADE_TIME;
        this.fadeMode = 1;

        const lines : string[] = this.message.split("\n");
        this.width = Math.max(...lines.map((s : string) => s.length));
        this.height = lines.length;

        console.log(message, this.width, this.height);
    }


    public deactivate() : void {

        this.active = false;
        this.fadeTimer = 0;
    }
}
