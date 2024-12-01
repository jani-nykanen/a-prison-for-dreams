import { Assets } from "../../core/assets.js";
import { ProgramEvent } from "../../core/event.js";
import { Bitmap, Canvas, Effect, Flip } from "../../gfx/interface.js";
import { sampleWeightedUniform } from "../../math/random.js";
import { Rectangle } from "../../math/rectangle.js";
import { Vector } from "../../math/vector.js";
import { Player } from "../player.js";
import { Enemy } from "./enemy.js";


const INITIAL_Y : number = 80;


const BASE_ATTACK_TIME : number = 180;
const MIN_ATTACK_TIME : number = 90;


const enum Attack {

    None = -1,

    Shoot1 = 0,
    Shoot2 = 1,
    Crush = 2,
    Dash = 3,
}


const ATTACK_WEIGHTS : number[] = [
    0.70,
    0.30,
    0.0,
    0.0
];


export class Eye extends Enemy {


    private initialPosReached : boolean = false;

    private attackTimer : number = BASE_ATTACK_TIME/2;
    private attackType : Attack = Attack.None;
    private attacking : boolean = false;
    private phase : number = 0;

    private initialHealth : number = 0;

    private playerRef : Player | undefined = undefined;


    constructor(x : number, y : number) {

        super(x, y);

        this.sprite.resize(64, 64);
        this.sprite.setFrame(1, 0);

        this.health = 100;
        this.initialHealth = this.health;
        this.attackPower = 0;

        this.dropProbability = 0.0;

        this.collisionBox = new Rectangle(0, 0, 48, 48);
        this.hitbox = new Rectangle(0, 0, 56, 56);

        this.target.zeros();

        this.ignoreBottomLayer = true;
        this.canHurtPlayer = false;
    }


    private reachInitialPos(event : ProgramEvent) : void {

        this.speed.y = -0.5 - (this.pos.y - INITIAL_Y)/64;
        this.target.y = this.speed.y;
    }


    private multishot(event : ProgramEvent) : void {

        const PROJECTILE_SPEED : number = 2.0;

        for (let i : number = 0; i < 8; ++ i) {

            const angle = Math.PI*2/8*i;
            const dx : number = Math.cos(angle);
            const dy : number = Math.sin(angle);

            this.projectiles.next().spawn(
                this.pos.x, this.pos.y, this.pos.x, this.pos.y,
                dx*PROJECTILE_SPEED, dy*PROJECTILE_SPEED, 3, 2, false);
        }
    }


    private gigaShot(event : ProgramEvent) : void {

        const PROJECTILE_SPEED : number = 1.5;

        if (this.playerRef === undefined) {

            return;
        }

        const dir : Vector = Vector.direction(this.pos, this.playerRef.getPosition());
        this.projectiles.next().spawn(
            this.pos.x, this.pos.y, this.pos.x, this.pos.y,
            dir.x*PROJECTILE_SPEED, dir.y*PROJECTILE_SPEED, 
            4, 4, false, -1, this.playerRef, PROJECTILE_SPEED);
    }


    private performAttack(event : ProgramEvent) : void {

        const CLOSE_EYE_SPEED : number = 6;

        switch (this.attackType) {

        case Attack.Shoot2:
        case Attack.Shoot1:

            if (this.phase == 0) {

                this.sprite.animate(0, 2, 5, CLOSE_EYE_SPEED, event.tick);
                if (this.sprite.getColumn() == 5) {

                    this.sprite.setFrame(4, 0);
                    ++ this.phase;
                }
            }
            else {

                const oldColumn : number = this.sprite.getColumn();
                this.sprite.animate(0, 4, 1, CLOSE_EYE_SPEED, event.tick);
                if (oldColumn == 4 && this.sprite.getColumn() == 3) {

                    event.audio.playSample(event.assets.getSample("throw"), 0.50);
                    if (this.attackType == Attack.Shoot1) {
                        
                        this.multishot(event);
                    }
                    else {

                        this.gigaShot(event);
                    }
                }

                if (this.sprite.getColumn() == 1) {

                    this.attacking = false;
                }
            }
            break;

        default:
            break;
        }
    }


    protected updateLogic(event : ProgramEvent) : void {
        
        if (!this.initialPosReached) {

            this.reachInitialPos(event);
            return;
        }

        if (this.attacking) {

            this.performAttack(event);
            return;
        }

        this.attackTimer -= event.tick;
        if (this.attackTimer <= 0) {

            const t : number = this.health/this.initialHealth;

            this.attackType = sampleWeightedUniform(ATTACK_WEIGHTS);
            this.attackTimer += t*BASE_ATTACK_TIME + (1.0 - t)*MIN_ATTACK_TIME;
            this.attacking = true;
            this.phase = 0;
        }
    }


    protected postMovementEvent(event: ProgramEvent): void {
        
        if (!this.initialPosReached && this.pos.y < INITIAL_Y) {

            this.pos.y = INITIAL_Y;
            this.initialPosReached = true;

            this.target.zeros();
            this.speed.zeros();
        }
    }
    

    protected playerEvent(player : Player, event : ProgramEvent) : void {
        
        this.playerRef = player;
    }


    public draw(canvas : Canvas, assets : Assets | undefined, bmp : Bitmap | undefined) : void {
        
        if (!this.exist || !this.inCamera) {

            return;
        }

        const bmpEye : Bitmap | undefined = assets.getBitmap("eye");

        const flicker : boolean = !this.dying && this.hurtTimer > 0 &&
            Math.floor(this.hurtTimer/4) % 2 != 0;

        // Flicker if hurt
        if (flicker) {

            canvas.applyEffect(Effect.FixedColor);
            canvas.setColor(255, 255, 255);
        }

        const dx : number = this.pos.x - this.sprite.width/2;
        const dy : number = this.pos.y - this.sprite.height/2;

        this.sprite.draw(canvas, bmpEye, dx, dy, this.flip);

        if (flicker) {

            canvas.applyEffect(Effect.None);
        }
    }


    public hasReachedInitialPos() : boolean {

        return this.initialPosReached;
    }
}