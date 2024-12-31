import { Assets } from "../../core/assets.js";
import { ProgramEvent } from "../../core/event.js";
import { Bitmap, Canvas, Flip } from "../../gfx/interface.js";
import { Sprite } from "../../gfx/sprite.js";
import { Player } from "../player.js";
import { TILE_WIDTH } from "../tilesize.js";
import { Enemy } from "./enemy.js";


const JUMP_TIME : number = 30;
const GRAVITY : number = 3.0;
const MOVE_SPEED : number = 0.75;
const SHOOT_TIME : number = 15;


export class Orb extends Enemy {


    private jumpTimer : number = 0;
    private shootTimer : number = 0;

    private flameSprite : Sprite;


    constructor(x : number, y : number) {

        super(x, y);

        this.sprite.setFrame(0, 13);

        this.health = 10;
        this.attackPower = 4;

        this.dropProbability = 0.60;
        this.knockbackFactor = 1.5;

        this.friction.x = 0.15;
        this.friction.y = 0.075;

        this.target.y = GRAVITY;

        this.bounceFactor.x = 1.0;

        this.collisionBox.w = 8;

        this.jumpTimer = Math.floor(x/TILE_WIDTH) % 2 == 0 ? JUMP_TIME/2 : JUMP_TIME;

        this.coinTypeWeights[0] = 0.30;
        this.coinTypeWeights[1] = 0.70;

        this.flameSprite = new Sprite(24, 24);
        this.flameSprite.setFrame(4, 12);

        this.immuneToLava = true;

        // To make sure jumping won't make inactive
        this.cameraCheckArea.y = 80;
    }


    protected updateLogic(event : ProgramEvent) : void {
        
        const JUMP_HEIGHT : number = -3.0;
        const FRAME_EPS : number = 0.5;
        const FLAME_FRAME_LENGTH : number = 6;
        const FLAME_PROJECTILE_SPEED : number = 1.0;

        //const ANIMATION_SPEED : number = 8;

        // this.sprite.animate(this.sprite.getRow(), 0, 3, ANIMATION_SPEED, event.tick);

        if (this.touchSurface) {

            this.target.x = 0;

            this.jumpTimer -= event.tick;
            if (this.jumpTimer <= 0) {

                this.jumpTimer = JUMP_TIME;
                this.shootTimer = 0;
                this.speed.y = JUMP_HEIGHT;

                this.speed.x = MOVE_SPEED*this.dir;

                event.audio.playSample(event.assets.getSample("jump2"), 0.30);
            }

            this.sprite.setFrame(0, 13);
        }
        else {

            this.target.x = MOVE_SPEED*this.dir;

            let frame : number = 0;
            if (this.speed.y < -FRAME_EPS) {

                frame = 1;
            }
            else if (this.speed.y > FRAME_EPS) {

                frame = 2;
            }
            this.sprite.setFrame(frame, 13);

            if (this.speed.y < FRAME_EPS) {

                this.shootTimer += event.tick;
                if (this.shootTimer >= SHOOT_TIME) {

                    this.projectiles.next().spawn(this.pos.x, this.pos.y,
                        this.pos.x, this.pos.y + 8, 0, Math.max(0, this.speed.y) + FLAME_PROJECTILE_SPEED,
                        6, 3, false, -1, undefined, 0.0, false, true);
                    this.shootTimer -= SHOOT_TIME;

                    event.audio.playSample(event.assets.getSample("throw"), 0.50);
                }
            }
        }

        this.flameSprite.animate(this.flameSprite.getRow(), 4, 7, FLAME_FRAME_LENGTH, event.tick);
    }


    protected playerEvent(player : Player, event : ProgramEvent) : void {
        
        if (this.touchSurface) {

            const onRight : boolean = player.getPosition().x > this.pos.x;

            this.dir = onRight ? 1 : -1;
            this.flip = onRight ? Flip.Horizontal : Flip.None;
        }
    }


    protected wallCollisionEvent(direction : -1 | 1, event : ProgramEvent): void {

        this.dir = -direction;

        if (!this.didTouchSurface) {

            this.speed.x = MOVE_SPEED*this.dir;
            this.flip = direction > 0 ? Flip.None : Flip.Horizontal;
        }
    }


    protected enemyCollisionEvent(enemy : Enemy, event : ProgramEvent) : void {
        
        if (!this.didTouchSurface) {

            this.dir = -this.dir;

            this.speed.x = MOVE_SPEED*this.dir;
            this.flip = this.dir < 0 ? Flip.None : Flip.Horizontal;
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

        if (!this.dying) {
            
            this.flameSprite.draw(canvas, bmp, dx, dy - 1, this.flip);
        }
        this.sprite.draw(canvas, bmp, dx, dy, this.flip);
    }
}