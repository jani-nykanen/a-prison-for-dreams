import { ProgramEvent } from "../../core/event.js";
import { Bitmap, Flip } from "../../gfx/interface.js";
import { Sprite } from "../../gfx/sprite.js";
import { Rectangle } from "../../math/rectangle.js";
import { Vector } from "../../math/vector.js";
import { TextBox } from "../../ui/textbox.js";
import { HintRenderer } from "../hintrenderer.js";
import { Player, WaitType } from "../player.js";
import { Stage } from "../stage.js";
import { Interactable } from "./interactable.js";


export class Switch extends Interactable {


    private id : number = 0;
    private active : boolean = true;
    private initialActivationState : boolean = true;

    private readonly stage : Stage;


    constructor(x : number, y : number, stage : Stage, id : number, active : boolean, bitmap : Bitmap | undefined) {

        super(x, y, bitmap);

        this.sprite = new Sprite(24, 24);
        this.sprite.setFrame(id, Number(!active));

        this.id = id;
        this.active = active;
        this.initialActivationState = active;
        this.stage = stage;

        // this.spriteOffset.y = -8;
    }


    protected updateEvent(event : ProgramEvent) : void {
        
        this.active = this.stage.getSwitchState(this.id) != this.initialActivationState;
        this.sprite.setFrame(this.id, Number(!this.active));
    }


    protected playerEvent(player : Player, event : ProgramEvent, initial : boolean) : void {
        
        // TODO: Perhaps extend "Spring" to avoid duplicate code?

        const SPEED_EPS : number = -0.5;

        const JUMP_SPEED : number = -2.75;

        const WIDTH : number = 16;
        const COLLISION_Y : number = 6;
        const NEAR_MARGIN : number = 2;
        const FAR_MARGIN : number = 8;

        if (!this.active) {

            return;
        }

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

        // TODO: Play "toggle" sound
        event.audio.playSample(event.assets.getSample("lever"), 0.70);

        this.sprite.setFrame(this.sprite.getColumn(), 1);
        this.active = false;
        this.stage.toggleSwitch(this.id);
    }

}
