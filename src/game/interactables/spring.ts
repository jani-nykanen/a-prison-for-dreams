import { ProgramEvent } from "../../core/event.js";
import { Bitmap, Flip } from "../../gfx/interface.js";
import { Sprite } from "../../gfx/sprite.js";
import { Rectangle } from "../../math/rectangle.js";
import { Vector } from "../../math/vector.js";
import { TextBox } from "../../ui/textbox.js";
import { HintRenderer } from "../hintrenderer.js";
import { Player, WaitType } from "../player.js";
import { Interactable } from "./interactable.js";


export class Spring extends Interactable {


    constructor(x : number, y : number, bitmap : Bitmap | undefined) {

        super(x, y, bitmap);

        this.sprite = new Sprite(32, 24);

        // this.spriteOffset.y = -8;
    }



    protected updateEvent(event : ProgramEvent) : void {
        
        const FRAME_TIME : number = 6.0;

        if (this.sprite.getColumn() != 0) {

            this.sprite.animate(0, 1, 4, FRAME_TIME, event.tick);
            if (this.sprite.getColumn() == 4) {

                this.sprite.setFrame(0, 0);
            }
        }
    }


    protected playerEvent(player : Player, event : ProgramEvent, initial : boolean) : void {
        
        const SPEED_EPS : number = -0.5;

        const JUMP_SPEED : number = -4.75;

        const WIDTH : number = 24;
        const COLLISION_Y : number = 8;
        const NEAR_MARGIN : number = 2;
        const FAR_MARGIN : number = 8;

        // TODO: Act as a "spring"

        const yspeed : number = player.getSpeed().y;
        if (yspeed < SPEED_EPS) {

            return;
        }

        const ppos : Vector = player.getPosition();

        const cbox : Rectangle = player.getCollisionBox();
        const bottom : number = ppos.y + cbox.y + cbox.h/2;

        const left : number = ppos.x + cbox.x - cbox.w/2;
        const right : number = left + cbox.w;

        const level : number = this.pos.y - COLLISION_Y;
        
        if (right < this.pos.x - WIDTH/2 || left > this.pos.x + WIDTH/2 ||
            bottom < level - NEAR_MARGIN*event.tick ||
            bottom > level + (FAR_MARGIN + Math.abs(yspeed))*event.tick) {

            return;
        }

        player.bounce(JUMP_SPEED);
        event.audio.playSample(event.assets.getSample("jump"), 0.80);

        this.sprite.setFrame(1, 0);
    }

}
