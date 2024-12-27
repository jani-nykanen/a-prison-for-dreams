import { ProgramEvent } from "../../core/event.js";
import { Bitmap, Canvas, Flip } from "../../gfx/interface.js";
import { Vector } from "../../math/vector.js";
import { TextBox } from "../../ui/textbox.js";
import { Player } from "../player.js";
import { Progress } from "../progress.js";
import { TILE_HEIGHT } from "../tilesize.js";
import { Interactable } from "./interactable.js";


export class Beam extends Interactable {


    private id : number = 0;

    private width : number = 0;
    private widthModifier : number = 0;


    constructor(x : number, y : number, id : number) {

        super(x, y);

        this.id = id - 1;

        this.hitbox.w = 12;

        this.cameraCheckArea = new Vector(32, 128);
    }


    private disable(stats : Progress) : boolean {

        if ((this.id == 8 && stats.hasDefeatedMiniboss()) ||
            (this.id <= 2 && stats.hasItem(this.id)) ||
            (this.id >= 3 && stats.hasPulledLever(this.id - 3))) {

            this.exist = false;
            return true;
        } 
        return false;
    }


    protected updateEvent(event : ProgramEvent) : void {
        
        const MIN_WIDTH : number = 2;
        const MAX_WIDTH : number = 8;

        const ANIMATION_SPEED : number = Math.PI*2/12;

        this.widthModifier = (this.widthModifier + ANIMATION_SPEED*event.tick) % (Math.PI);
        this.width = MIN_WIDTH + Math.round((1 + Math.sin(this.widthModifier))*(MAX_WIDTH - MIN_WIDTH));
    }


    protected playerEvent(player : Player, event : ProgramEvent, initial : boolean) : void {
        
        if (this.disable(player.stats)) {

            return;
        }

        if (!initial) {

            player.wallCollision(this.pos.x - 4, this.pos.y + TILE_HEIGHT/2, TILE_HEIGHT*3, 1, event);
            player.wallCollision(this.pos.x + 4, this.pos.y + TILE_HEIGHT/2, TILE_HEIGHT*3, -1, event);
        }
    }


    public draw(canvas : Canvas) : void {
        
        if (!this.isActive()) {

            return;
        }

        const halfWidth : number = Math.floor(this.width/2);
        const foreColorOffset : number = 2; // Math.max(1, Math.round(this.width/3) - 2);

        canvas.setColor(0, 109, 182);
        canvas.fillRect(
            this.pos.x - halfWidth, 
            this.pos.y + TILE_HEIGHT/2, 
            this.width, TILE_HEIGHT*3);

        canvas.setColor(109, 182, 255);
        canvas.fillRect(
            this.pos.x - halfWidth + 1, 
            this.pos.y + TILE_HEIGHT/2, 
            this.width - 2, TILE_HEIGHT*3);

        const middleBarWidth : number = this.width - 2 - foreColorOffset*2; 
        if (middleBarWidth > 0) {

            canvas.setColor(219, 255, 255);
            canvas.fillRect(
                this.pos.x - halfWidth + 1 + foreColorOffset, 
                this.pos.y + TILE_HEIGHT/2, 
                middleBarWidth, TILE_HEIGHT*3);
        }

        canvas.setColor();
    }
}
