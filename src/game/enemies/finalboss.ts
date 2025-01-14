import { Assets } from "../../core/assets.js";
import { ProgramEvent } from "../../core/event.js";
import { Bitmap, Canvas, Effect, Flip } from "../../gfx/interface.js";
import { sampleInterpolatedWeightedUniform, sampleWeightedUniform } from "../../math/random.js";
import { Rectangle } from "../../math/rectangle.js";
import { clamp } from "../../math/utility.js";
import { Vector } from "../../math/vector.js";
import { Player } from "../player.js";
import { updateSpeedAxis } from "../utility.js";
import { Enemy } from "./enemy.js";


const INITIAL_Y : number = 256;
const HEALTH : number = 512;

const BASE_ATTACK_TIME : number = 240;
const MIN_ATTACK_TIME : number = 120;

const DEATH_TIME : number = 120;


const enum Attack {

    None = -1,

    Shoot1 = 0,
    Shoot2 = 1,
    Crush = 2,
    Dash = 3,

    AttackCount = 4,
}


const ATTACK_WEIGHTS_INITIAL : number[] = [
    0.40,
    0.10,
    0.20,
    0.30
];

const ATTACK_WEIGHTS_FINAL : number[] = [
    0.25,
    0.25,
    0.25,
    0.25
];


export class FinalBoss extends Enemy {


    private initialPosReached : boolean = false;

    private attackTimer : number = BASE_ATTACK_TIME/2;
    private attackType : Attack = Attack.None;
    // private previousAttack : Attack = Attack.None;
    private attacking : boolean = false;
    private phase : number = 0;
    private flickerTimer : number = 0;

    private initialHealth : number = 0;
    private healthBarPos : number = 1.0;

    private playerRef : Player | undefined = undefined;

    private dashing : boolean = false;
    private dashDirection : Vector;

    // Some grade A variable naming here
    private crushing : boolean = false;
    private crushCount : number = 0;
    private recoveringFromCrush : boolean = false;

    private verticalDirection : number = 0;
    private bodyWave : number = 0;

    private ghostSpawnTimer : number = 0;
    private previousDirection : number = 0;
    private deathEvent : (event : ProgramEvent) => void;
    private triggerDeathEvent : (event : ProgramEvent) => void;

    private deathTimer : number = 0;

    private deathTriggered : boolean = false;


    constructor(x : number, y : number, 
        deathEvent : (event : ProgramEvent) => void,
        triggerDeathEvent : (event : ProgramEvent) => void) {

        super(x, y);

        this.sprite.resize(64, 64);
        this.sprite.setFrame(1, 0);

        this.health = HEALTH;
        this.initialHealth = this.health;
        this.attackPower = 5;

        this.dropProbability = 0.0;

        this.collisionBox = new Rectangle(0, 0, 60, 60);
        this.hitbox = new Rectangle(0, 0, 56, 56);
        this.overriddenHurtbox = new Rectangle(0, 0, 40, 40);

        this.target.zeros();

        // this.ignoreBottomLayer = true;
        this.takeCollisions = false;
        // this.canHurtPlayer = false;

        this.friction.x = 0.15;
        this.friction.y = 0.15;

        this.knockbackFactor = 1.0;

        this.dashDirection = new Vector();

        this.deathEvent = deathEvent;
        this.triggerDeathEvent = triggerDeathEvent;

        this.cameraCheckArea.x = 1024;
        this.cameraCheckArea.y = 1024;

        this.deathSound = "eye_death";

        this.dir = Math.random() > 0.5 ? 1 : -1;
        this.verticalDirection = 1;

        this.canBeMoved = false;
    }


    private reachInitialPos(event : ProgramEvent) : void {

        this.speed.y = -0.5 - (this.pos.y - INITIAL_Y)/64;
        this.target.y = this.speed.y;
    }


    private updateWaving(event : ProgramEvent) : void {

        const VERTICAL_SPEED : number = 0.25;
        const HORIZONTAL_SPEED : number = 0.33; 
        const TRIGGER_DISTANCE : number = 16;
        const MIDDLE_Y : number = 7*16;

        const t : number = 1.0 - this.health/this.initialHealth;
        const bonus : number = 1.0 + 0.5*t; 

        if (this.dir == 0) {

            this.dir = (this.playerRef?.getPosition().x ?? 0) > this.pos.x ? 1 : -1;
            this.verticalDirection = this.pos.y > MIDDLE_Y ? -1 : 1;
        }
        this.target.x = this.dir*HORIZONTAL_SPEED*bonus;

        if ((this.verticalDirection > 0 && this.pos.y - MIDDLE_Y > TRIGGER_DISTANCE) ||
            (this.verticalDirection < 0 && MIDDLE_Y - this.pos.y > TRIGGER_DISTANCE)) {

            this.verticalDirection *= -1;
        }
        this.target.y = this.verticalDirection*VERTICAL_SPEED*bonus;
    }


    private updateBodyWave(event : ProgramEvent) : void {

        const BODY_WAVE : number = Math.PI*2/120.0;

        const t : number = 1.0 - this.health/this.initialHealth;
        const bonus : number = 1.0 + t;

        this.bodyWave = (this.bodyWave + BODY_WAVE*bonus*event.tick) % (Math.PI*2);
    }


    private updateHealthbarPos(event : ProgramEvent) : void {

        this.healthBarPos = clamp(updateSpeedAxis(
            this.healthBarPos, this.health/this.initialHealth, 0.005*event.tick), 
            0.0, 1.0);
    }


    private drawDeath(canvas : Canvas, bmp : Bitmap | undefined) : void {

        // const t : number = this.deathTimer/DEATH_TIME;
    }


    protected updateLogic(event : ProgramEvent) : void {
        
        if (!this.initialPosReached) {

            this.reachInitialPos(event);
            return;
        }

        this.updateBodyWave(event);
        this.updateWaving(event);
    }


    protected postMovementEvent(event: ProgramEvent): void {
        
        if (!this.initialPosReached && this.pos.y < INITIAL_Y) {

            this.pos.y = INITIAL_Y;
            this.initialPosReached = true;

            this.target.zeros();
            this.speed.zeros();
        }
    }


    protected die(event : ProgramEvent) : boolean {
        
        if (event.audio.isMusicPlaying()) {
                
            event.audio.stopMusic();
        }

        if (!this.deathTriggered) {

            this.triggerDeathEvent?.(event);
            this.deathTriggered = true;
        }

        const shakeAmount : number = Math.floor(this.deathTimer/6);
        this.shakeEvent?.(2, shakeAmount);

        this.updateHealthbarPos(event);

        this.deathTimer += event.tick;

        if (this.deathTimer >= DEATH_TIME) {

            this.deathEvent(event);
            return true;
        }
        return false;
    }
    

    protected playerEvent(player : Player, event : ProgramEvent) : void {
        
        this.playerRef = player;
    }


    public draw(canvas : Canvas, assets : Assets | undefined, bmp : Bitmap | undefined) : void {
        
        if (!this.exist || !this.inCamera) {

            return;
        }

        const bmpFinalboss : Bitmap | undefined = assets?.getBitmap("finalboss");

        if (this.dying) {

            this.drawDeath(canvas, bmpFinalboss);
            return;
        }

        const hurtFlicker : boolean = !this.dying && 
            this.hurtTimer > 0 &&
            Math.floor(this.hurtTimer/4) % 2 != 0;
        if (hurtFlicker) {

            canvas.applyEffect(Effect.FixedColor);
            canvas.setColor(255, 255, 255);
        }

        const dx : number = this.pos.x - 32;
        const dy : number = this.pos.y - 32;

        canvas.drawBitmap(bmpFinalboss, Flip.None, dx, dy, 0, 0, 64, 64);

        if (hurtFlicker) {

            canvas.applyEffect(Effect.None);
        }
    }


    public hasReachedInitialPos() : boolean {

        return this.initialPosReached;
    }


    public getHealthbarHealth() : number {

        return Math.max(0.0, this.healthBarPos);
    }
}