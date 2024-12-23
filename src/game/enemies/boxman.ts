import { Assets } from "../../core/assets.js";
import { ProgramEvent } from "../../core/event.js";
import { Bitmap, Canvas, Flip } from "../../gfx/interface.js";
import { Vector } from "../../math/vector.js";
import { Player } from "../player.js";
import { TILE_WIDTH } from "../tilesize.js";
import { Enemy } from "./enemy.js";


const BASE_SPEED : number = 0.50;

// For orbitals
const H_RADIUS : number = 20;
const V_RADIUS : number = 20;


export class BoxMan extends Enemy {


    private orbitalTimer : number = 0.0;
    private stonePositions : Vector[];


    constructor(x : number, y : number) {

        super(x, y);

        this.sprite.setFrame(1, 11);

        this.health = 12;
        this.attackPower = 4;

        this.dropProbability = 0.60;

        this.dir = (Math.floor(x/TILE_WIDTH) % 2) == 0 ? 1 : -1;

        this.collisionBox.w = 8;

        this.knockbackFactor = 1.0;

        this.coinTypeWeights[0] = 0.50;
        this.coinTypeWeights[1] = 0.50;

        this.stonePositions = new Array<Vector> (2);
        for (let i : number = 0; i < this.stonePositions.length; ++ i) {

            this.stonePositions[i] = new Vector();
            this.computeStonePosition(i);
        }
    }


    private computeStonePosition(index : number) : void {

        if (index < 0 || index > 1) {

            return;
        }

        const dir : number = index == 0 ? 1 : -1;

        const dx : number = this.pos.x + dir*(Math.sin(this.orbitalTimer)*H_RADIUS);
        const dy : number = this.pos.y + (Math.sin(this.orbitalTimer)*V_RADIUS);

        this.stonePositions[index].x = dx;
        this.stonePositions[index].y = dy;
    }


    private drawOrbital(canvas : Canvas, bmp : Bitmap | undefined, 
        index : number, behind : boolean) : void {

        if (this.dying) {

            return;
        }

        const p : Vector = this.stonePositions[index];

        let size : number = Math.abs(p.x - this.pos.x) < H_RADIUS/2 ? (behind ? 2 : 0) : 1;

        const sx : number = size == 1 ? 180 : 168;
        const sy : number = size == 2 ? 12 : 0;

        canvas.drawBitmap(bmp, Flip.None, p.x - 6, p.y - 6, sx, sy, 12, 12);
    }


    protected wallCollisionEvent(direction : -1 | 1, event : ProgramEvent) : void {
        
        this.dir = -direction;

        this.target.x = BASE_SPEED*this.dir;
        this.speed.x = this.target.x;
    }


    protected updateLogic(event : ProgramEvent) : void {
        
        const WAVE_SPEED : number = Math.PI*2/180.0;
        const ANIMATION_SPEED : number = 8;

        this.sprite.animate(this.sprite.getRow(), 0, 3, ANIMATION_SPEED, event.tick);

        if (this.hurtTimer <= 0 && !this.touchSurface && this.didTouchSurface) {

            this.dir *= -1;
            this.pos.x += BASE_SPEED*this.dir;
            this.pos.y = this.oldPos.y;

            this.speed.x = BASE_SPEED*this.dir;
        }

        this.flip = this.dir > 0 ? Flip.Horizontal : Flip.None;

        this.target.x = this.computeSlopeSpeedFactor()*BASE_SPEED*this.dir;

        this.orbitalTimer = (this.orbitalTimer + WAVE_SPEED*event.tick) % (Math.PI*2);
        for (let i : number = 0; i < this.stonePositions.length; ++ i) {

            this.computeStonePosition(i);
        }
    }


    protected enemyCollisionEvent(enemy : Enemy, event : ProgramEvent) : void {

        this.dir = enemy.getPosition().x > this.pos.x ? -1 : 1;

        this.target.x = BASE_SPEED*this.dir;
        this.speed.x = this.target.x;
    }


    protected playerEvent(player : Player, event : ProgramEvent) : void {
        
        const HURT_RADIUS : number = 1;
        const DAMAGE : number = 3;

        const ppos : Vector = player.getPosition();

        for (const p of this.stonePositions) {

            player.hurtCollision(
                p.x - HURT_RADIUS, p.y - HURT_RADIUS,
                 HURT_RADIUS*2, HURT_RADIUS*2, 
                 event, Math.sign(ppos.x - this.pos.x), DAMAGE);
        }
    }


    public draw(canvas : Canvas, assets : Assets | undefined, bmp : Bitmap | undefined) : void {
            
        if (!this.exist || !this.inCamera) {
    
            return;
        }

        // Flicker if hurt
        if (!this.dying && this.hurtTimer > 0 &&
            Math.floor(this.hurtTimer/4) % 2 != 0) {

            return;
        }

        const dx : number = this.pos.x - this.sprite.width/2;
        const dy : number = this.pos.y - this.sprite.height/2;

        const firstPhase : boolean = this.orbitalTimer >= Math.PI + Math.PI/2 || this.orbitalTimer < Math.PI/2;

        if (firstPhase) {

            this.drawOrbital(canvas, bmp, 0, true);
        }
        if (!firstPhase) {

            this.drawOrbital(canvas, bmp, 1, true);
        }

        this.sprite.draw(canvas, bmp, dx, dy, this.flip);

        if (!firstPhase) {

            this.drawOrbital(canvas, bmp, 0, false);
        }
        if (firstPhase) {

            this.drawOrbital(canvas, bmp, 1, false);
        }
    }
}
