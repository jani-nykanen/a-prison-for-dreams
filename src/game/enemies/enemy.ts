import { Assets } from "../../core/assets.js";
import { Canvas, Bitmap, Flip } from "../../gfx/interface.js";
import { CollisionObject } from "../collisionobject.js"
import { Sprite } from "../../gfx/sprite.js";
import { Vector } from "../../math/vector.js";
import { Rectangle } from "../../math/rectangle.js";
import { ProgramEvent } from "../../core/event.js";
import { Player } from "../player.js";
import { Projectile } from "../projectile.js";


const HURT_TIME : number = 30;


export const BASE_GRAVITY : number = 5.0;


export class Enemy extends CollisionObject {


    private hurtID : number = -1;
    private hurtTimer : number = 0;

    protected sprite : Sprite;
    protected flip : Flip = Flip.None;

    protected attackPower : number = 1;
    protected health : number = 5;

    protected touchSurface : boolean = false;


    constructor(x : number, y : number) {

        super(x, y, true);
    
        this.sprite = new Sprite(24, 24);

        this.cameraCheckArea = new Vector(32, 32);

        this.collisionBox = new Rectangle(0, 1, 12, 12);
        this.hitbox = new Rectangle(0, 0, 12, 12);

        this.target.y = BASE_GRAVITY;

        this.friction = new Vector(0.10, 0.15);
    }


    private takeDamage(amount : number, event : ProgramEvent) : void {

        this.health -= amount;
        if (this.health <= 0) {

            this.dying = true;
            this.sprite.setFrame(0, 0);
            return;
        }

        this.hurtTimer = HURT_TIME;
    }


    protected updateLogic?(event : ProgramEvent) : void;
    protected playerEvent?(player : Player, event : ProgramEvent) : void;


    protected die(event: ProgramEvent): boolean {
        
        const ANIMATION_SPEED : number = 5;

        this.sprite.animate(0, 0, 4, ANIMATION_SPEED, event.tick);
        return this.sprite.getColumn() >= 4;
    }


    protected slopeCollisionEvent(direction : -1 | 1, event:  ProgramEvent) : void {
        
        if (direction == 1) {
        
            this.touchSurface = true;
        }
    }


    protected updateEvent(event : ProgramEvent) : void {
            
        this.updateLogic?.(event);

        if (this.hurtTimer > 0) {

            this.hurtTimer -= event.tick;
        }
        this.touchSurface = false;
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

        const dx : number = this.pos.x - 12;
        const dy : number = this.pos.y - 12;

        this.sprite.draw(canvas, bmp, dx, dy, this.flip);
    }


    public playerCollision(player : Player, event : ProgramEvent) : void {

        const KNOCKBACK_SPEED : number = 1.5;

        if (!this.isActive() || !player.isActive()) {

            return;
        }

        this.playerEvent?.(player, event);

        const attackID : number = player.getAttackID();
        if (this.hurtID != attackID && player.overlaySwordAttackArea(this)) {
           
            this.hurtID = attackID;
            this.takeDamage(player.getAttackPower(), event);

            if (player.performDownAttackJump()) {

                return;
            }

            let knockback : number = KNOCKBACK_SPEED*(this.friction.x/0.10);
            if (player.isChargeAttacking()) {

                knockback *= 2;
            }
            this.speed.x = Math.sign(this.pos.x - player.getPosition().x)*knockback;
        }

        if (this.overlayObject(player)) {

            player.forceHurt(this.attackPower, Math.sign(player.getPosition().x - this.pos.x), event);
        }
    }


    public projectileCollision(p : Projectile, event : ProgramEvent) : void {

        const KNOCKBACK_SPEED : number = 1.0;

        if (!this.isActive() || !p.isActive()) {

            return;
        }

        if (p.overlayObject(this)) {

            p.kill(event);
            this.speed.x = Math.sign(this.pos.x - p.getPosition().x)*KNOCKBACK_SPEED*(this.friction.x/0.10);

            this.takeDamage(p.getPower(), event);
        }
    }
}
