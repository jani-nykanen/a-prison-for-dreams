import { Vector } from "../math/vector.js";
import { ProgramEvent } from "../core/event.js";
import { Player } from "./player.js";
import { Align, Bitmap, Canvas } from "../gfx/interface.js";
import { Assets } from "../core/assets.js";


const DEACTIVATION_DISTANCE : number = 160;
const FADE_TIME : number = 20;


class Message {

    public body : string = "";
    public width : number = 0;
    public height : number = 0;


    constructor(body : string) {

        this.body = body;

        const lines : string[] = body.split("\n");
        this.width = Math.max(...lines.map((s : string) => s.length));
        this.height = lines.length;
    }
}


export class HintRenderer {


    private activeMessage : Message | undefined = undefined;
    private messages : Message[];

    private startPos : Vector;
    private active : boolean = false;

    private fadeTimer : number = 0;
    private fadeMode : number = 0;


    constructor() {

        this.startPos = new Vector();

        this.messages = new Array<Message> (2);
    }


    public update(player : Player, event : ProgramEvent) : void {

        if (this.fadeTimer > 0) {

            this.fadeTimer -= event.tick;
        }

        if (!this.active) {

            return;
        }

        // The third option hopefully never happens!
        if (event.input.isGamepadActive()) {

            this.activeMessage = this.messages[1];
        }
        else if (event.input.isKeyboardActive()) {

            this.activeMessage = this.messages[0];
        }

        const playerPos : Vector = player.getPosition();
        if (Vector.distance(playerPos, this.startPos) > DEACTIVATION_DISTANCE) {

            this.active = false;
            this.fadeTimer = FADE_TIME;
            this.fadeMode = 0;
        }
    }


    public draw(canvas : Canvas, assets : Assets) : void {

        const TOP_OFF : number = 36;
        const TEXT_YOFF_MODIFIER : number = -4;

        if ((!this.active && this.fadeTimer <= 0) || this.activeMessage === undefined) {

            return;
        }

        const bmpFont : Bitmap | undefined = assets.getBitmap("font_outlines");

        let alpha : number = 1.0;
        if (this.fadeTimer > 0) {

            const t : number = this.fadeTimer/FADE_TIME;
            alpha = this.fadeMode == 0 ? t : 1.0 - t;
        }

        const width : number = (this.activeMessage.width + 1)*8;
        const height : number = this.activeMessage.height*(16 + TEXT_YOFF_MODIFIER);

        const dx : number = canvas.width/2 - width/2;
        const dy : number = TOP_OFF - height/2;

        canvas.setColor(0, 0, 0, 0.33*alpha);
        canvas.fillRect(dx - 2, dy - 2, width + 4, height + 8)
        canvas.setColor();

        canvas.setAlpha(alpha);
        canvas.drawText(bmpFont, this.activeMessage.body, 
            dx, dy, -8, TEXT_YOFF_MODIFIER, Align.Left);
        canvas.setAlpha();
    }


    public activate(startPos : Vector, keyboardMessage : string, gamepadMessage? : string) : void {

        this.messages[0] = new Message(keyboardMessage);
        this.messages[1] = new Message(gamepadMessage ?? keyboardMessage);
        this.activeMessage = this.messages[0];

        this.startPos = startPos.clone();

        this.active = true;
        this.fadeTimer = FADE_TIME;
        this.fadeMode = 1;
    }


    public deactivate() : void {

        this.active = false;
        this.fadeTimer = 0;
    }
}
