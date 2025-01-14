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


const INITIAL_Y : number = 80;
const HEALTH : number = 128;

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


export class Eye extends Enemy {


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
    private spawnGhostCallback : (dir : number) => void; 
    private deathEvent : (event : ProgramEvent) => void;
    private triggerDeathEvent : (event : ProgramEvent) => void;

    private deathTimer : number = 0;

    private deathTriggered : boolean = false;


    constructor(x : number, y : number, 
        spawnGhostCallback : (dir : number) => void,
        deathEvent : (event : ProgramEvent) => void,
        triggerDeathEvent : (event : ProgramEvent) => void) {

        super(x, y);

        this.sprite.resize(64, 64);
        this.sprite.setFrame(1, 0);

        this.health = HEALTH;
        this.initialHealth = this.health;
        this.attackPower = 3;

        this.dropProbability = 0.0;

        this.collisionBox = new Rectangle(0, 0, 60, 60);
        this.hitbox = new Rectangle(0, 0, 56, 56);
        this.overriddenHurtbox = new Rectangle(0, 0, 40, 40);

        this.target.zeros();

        this.ignoreBottomLayer = true;
        // this.canHurtPlayer = false;

        this.friction.x = 0.15;
        this.friction.y = 0.15;

        this.knockbackFactor = 1.0;

        this.dashDirection = new Vector();

        this.spawnGhostCallback = spawnGhostCallback;
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


    private multishot(event : ProgramEvent) : void {

        const PROJECTILE_SPEED : number = 1.5;

        const count : number = this.health < this.initialHealth/2 ? 8 : 6;
        const angleOff : number = count == 6 ? Math.PI/12 : 0;

        for (let i : number = 0; i < count; ++ i) {

            const angle = angleOff + Math.PI*2/count*i;
            const dx : number = Math.cos(angle);
            const dy : number = Math.sin(angle);

            this.projectiles?.next().spawn(
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
        this.projectiles?.next().spawn(
            this.pos.x, this.pos.y, this.pos.x, this.pos.y,
            dir.x*PROJECTILE_SPEED, dir.y*PROJECTILE_SPEED, 
            4, 3, false, -1, this.playerRef, PROJECTILE_SPEED);
        
    }


    private spawnCrushProjectiles() : void {

        const BASE_SPEED : number = 0.33;
        const JUMP_SPEED : number = -2.75;
        const YOFF : number = 24;

        for (let i : number = -2; i <= 2; ++ i) {

            if (i == 0) {

                continue;
            }

            const speedx : number = Math.sign(i)*i*i*BASE_SPEED;
            const speedy : number = (Math.abs(i) == 1 ? 1.25 : 1.0)*JUMP_SPEED;

            this.projectiles?.next().spawn(
                this.pos.x, this.pos.y + YOFF, 
                this.pos.x, this.pos.y + YOFF,
                speedx, speedy, 
                3, 2, false, -1, undefined, 0.0, 
                true);
        }
    }


    private initiateDash(event : ProgramEvent) : void {

        const DASH_BASE_SPEED : number = 3.0;
        const DASH_BONUS : number = 2.0;

        const speed : number = DASH_BASE_SPEED + (1.0 - this.health/this.initialHealth)*DASH_BONUS;

        this.speed.x = this.dashDirection.x*speed;
        this.speed.y = this.dashDirection.y*speed;

        this.dashing = true;
    }


    private initiateCrush(event : ProgramEvent) : void {

        const DISTANCE_DIVISOR : number = 128;

        this.crushing = true;
        this.crushCount = (4 - Math.ceil(this.health/this.initialHealth*3)) + 1;
        this.recoveringFromCrush = true;

        this.target.x = ((this.playerRef?.getPosition().x ?? 0) - this.pos.x)/DISTANCE_DIVISOR;
        this.speed.y = 0.01;

        this.bounceFactor.x = 1.0;
    }


    private updateDash(event : ProgramEvent) : void {

        const STOP_THRESHOLD : number = 0.1;

        this.friction.x = 0.025;
        this.friction.y = 0.025;

        this.bounceFactor.x = 1.0;
        this.bounceFactor.y = 1.0;

        this.canBeMoved = false;

        if (this.speed.length <= STOP_THRESHOLD) {

            this.dashing = false;
        }
    }


    private updateCrushAttack(event : ProgramEvent) : void {

        const TARGET_GRAVITY : number = 8.0;

        this.target.y = TARGET_GRAVITY;

        this.friction.y = 0.15; // this.speed.y > 0 ? 0.5 : 0.15;
        
        if (this.recoveringFromCrush && this.speed.y > 0) {

            this.recoveringFromCrush = false;
            -- this.crushCount;

            if (this.crushCount <= 0) {

                this.crushing = false;
                this.sprite.setFrame(1, 0);

                this.target.zeros();
                return;
            } 
        }
        
        // this.bounceFactor.y = 1.0;
    }


    private performAttack(event : ProgramEvent) : void {

        const FLICKER_TIME : number = 60;
        const CLOSE_EYE_SPEED : number = 6;
        const LOAD_SPEED : number = 0.5;

        if (this.playerRef === undefined) {

            return;
        }

        switch (this.attackType) {

        case Attack.Shoot2:
        case Attack.Shoot1:

            if (this.phase == 0) {

                this.sprite.animate(0, 2, 5, 
                    this.sprite.getColumn() == 4 ? CLOSE_EYE_SPEED*3 : CLOSE_EYE_SPEED, 
                    event.tick);
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

        case Attack.Crush:
        case Attack.Dash:

            if (this.flickerTimer == 0) {

                this.flickerTimer = FLICKER_TIME;
                this.dashDirection = Vector.direction(this.pos, this.playerRef.getPosition());

                if (this.attackType == Attack.Dash) {

                    this.target.x = -this.dashDirection.x*LOAD_SPEED; 
                    this.target.y = -this.dashDirection.y*LOAD_SPEED;
                }
                else {

                    this.sprite.setFrame(2, 0);
                }
                event.audio.playSample(event.assets.getSample("charge2"), 0.50);

                break;
            }

            this.flickerTimer -= event.tick;
            if (this.flickerTimer <= 0) {

                this.target.zeros();
                this.attacking = false;

                if (this.attackType == Attack.Dash) {

                    this.initiateDash(event);
                    break;
                }
                this.initiateCrush(event);
            }
            break;

        default:
            break;
        }
    }


    private resetStats() : void {

        const t : number = 1.0 - this.health/this.initialHealth;

        this.friction.x = 0.15*(1.0 + 0.5*t);
        this.friction.y = 0.025*(1.0 + 0.5*t); //this.friction.x;

        this.knockbackFactor = 1.0;
        this.bounceFactor.x = 1.0;
        this.bounceFactor.y = 1.0;

        this.canBeMoved = true;

        this.flip = Flip.None;
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


    private updateGhostGenerator(event : ProgramEvent) : void {

        const BASE_GHOST_TIME : number = 240;

        const count : number = this.health < this.initialHealth/2 ? 2 : 1;

        this.ghostSpawnTimer += event.tick;
        if (this.ghostSpawnTimer < BASE_GHOST_TIME) {

            return;
        }

        let dir : number = 0;
        if (this.previousDirection == 0) {

            dir = Math.random() < 0.5 ? 1 : -1;
        }
        else {

            dir = -this.previousDirection;
        }
        this.previousDirection = dir;

        for (let i : number = 0; i < count; ++ i) {

            this.spawnGhostCallback(this.previousDirection);
            this.previousDirection *= -1;
        }

        this.ghostSpawnTimer -= BASE_GHOST_TIME;
    }


    private updateHealthbarPos(event : ProgramEvent) : void {

        this.healthBarPos = clamp(updateSpeedAxis(
            this.healthBarPos, this.health/this.initialHealth, 0.005*event.tick), 
            0.0, 1.0);
    }


    private drawDeath(canvas : Canvas, bmp : Bitmap | undefined) : void {

        const t : number = this.deathTimer/DEATH_TIME;

        canvas.drawFunnilyAppearingBitmap(bmp, Flip.None, 
            this.pos.x - 32, this.pos.y - 32, 64, 0, 64, 64, t, 128, 4, 4);
    }


    protected slopeCollisionEvent(direction : -1 | 1, event : ProgramEvent) : void {
        
        const CRUSH_JUMP_SPEED : number = -5.0;

        if (direction == 1 && this.crushing) {

            this.recoveringFromCrush = true;

            event.audio.playSample(event.assets.getSample("thwomp"), 0.50);

            this.speed.y = CRUSH_JUMP_SPEED;

            this.spawnCrushProjectiles();
            this.shakeEvent?.(30, 4);
        }
        
        if (this.dashing) {

            event.audio.playSample(event.assets.getSample("thwomp"), 0.50);
        }
    }


    protected wallCollisionEvent(direction : -1 | 1, event : ProgramEvent) : void {
        
        if (this.dashing) {

            event.audio.playSample(event.assets.getSample("thwomp"), 0.50);
        }

        if (!this.dashing && !this.crushing && !this.attacking) {

            this.dir *= -1;
        }
    }


    protected updateLogic(event : ProgramEvent) : void {
        
        this.updateGhostGenerator(event);
        this.updateBodyWave(event);
        this.updateHealthbarPos(event);

        if (!this.initialPosReached) {

            this.reachInitialPos(event);
            return;
        }

        if (this.attacking) {

            this.performAttack(event);
            return;
        }

        if (this.dashing) {

            this.updateDash(event);
            return;
        }

        if (this.crushing) {

            this.updateCrushAttack(event);
            return;
        }

        this.resetStats();
        this.updateWaving(event);

        this.attackTimer -= event.tick;
        if (this.attackTimer <= 0) {

            const t : number = this.health/this.initialHealth;

            this.target.zeros();

            this.attackType = sampleInterpolatedWeightedUniform(
                ATTACK_WEIGHTS_INITIAL, 
                ATTACK_WEIGHTS_FINAL, 
                1.0 - this.health/this.initialHealth);
            /*
            if (this.attackType == this.previousAttack) {

                this.attackType = (this.attackType + 1) % Attack.AttackCount;
            }
            this.previousAttack = this.attackType;
            */
           
            this.attackTimer += t*BASE_ATTACK_TIME + (1.0 - t)*MIN_ATTACK_TIME;
            this.attacking = true;
            this.phase = 0;
            this.flickerTimer = 0;

            this.dir = 0;

            this.bounceFactor.zeros();
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


    protected downAttackEvent(player : Player, event : ProgramEvent) : void {
        
        const KNOCKBACK : number = 1.5;

        /*
        if (this.dashing || this.crushing) {

            return;
        }
        */

        // this.speed.x = (this.pos.x - player.getPosition().x)/24*KNOCKBACK;
        this.speed.y = KNOCKBACK;

        this.attackTimer = Math.min(this.attackTimer, 30);
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

        const bmpEye : Bitmap | undefined = assets?.getBitmap("eye");

        if (this.dying) {

            this.drawDeath(canvas, bmpEye);
            return;
        }

        const hurtFlicker : boolean = !this.dying && 
            this.hurtTimer > 0 &&
            Math.floor(this.hurtTimer/4) % 2 != 0;
        const chargeFlicker : boolean = !this.dying && this.flickerTimer > 0 &&
            Math.floor(this.flickerTimer/4) % 2 != 0;

        if (hurtFlicker) {

            canvas.applyEffect(Effect.FixedColor);
            canvas.setColor(255, 255, 255);
        }
        if (chargeFlicker) {

            // canvas.applyEffect(Effect.FixedColor);
            canvas.setColor(255, 0, 0);
        }

        const dx : number = this.pos.x - this.sprite.width/2;
        const dy : number = this.pos.y - this.sprite.height/2;

        // this.sprite.draw(canvas, bmpEye, dx, dy, this.flip);

        const sx : number = this.sprite.getColumn()*64;
        const sy : number = this.sprite.getRow()*64;

        const t : number = (1.0 - this.health/this.initialHealth);
        const amplitude : number = t*8;
        const period : number = 32 + 32*(1.0 - t);

        canvas.drawHorizontallyWavingBitmap(bmpEye, 
            amplitude, period, this.bodyWave, 
            Flip.None, dx, dy, sx, sy, 64, 64);


        if (hurtFlicker || chargeFlicker) {

            canvas.applyEffect(Effect.None);
            canvas.setColor();
        }
    }


    public hasReachedInitialPos() : boolean {

        return this.initialPosReached;
    }


    public getHealthbarHealth() : number {

        return Math.max(0.0, this.healthBarPos);
    }
}