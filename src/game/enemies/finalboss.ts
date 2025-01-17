import { Assets } from "../../core/assets.js";
import { ProgramEvent } from "../../core/event.js";
import { Bitmap, Canvas, Effect, Flip } from "../../gfx/interface.js";
import { sampleInterpolatedWeightedUniform, sampleWeightedUniform } from "../../math/random.js";
import { Rectangle } from "../../math/rectangle.js";
import { RGBA } from "../../math/rgba.js";
import { clamp } from "../../math/utility.js";
import { Vector } from "../../math/vector.js";
import { CollectableGenerator } from "../collectablegenerator.js";
import { CollisionObject } from "../collisionobject.js";
import { FlyingText } from "../flyingtext.js";
import { GameObject } from "../gameobject.js";
import { ObjectGenerator } from "../objectgenerator.js";
import { Player } from "../player.js";
import { ProjectileGenerator } from "../projectilegenerator.js";
import { TILE_WIDTH } from "../tilesize.js";
import { updateSpeedAxis } from "../utility.js";
import { Enemy } from "./enemy.js";


const INITIAL_Y : number = 192;
const TOTAL_HEALTH : number = 32*3;

const DEATH_TIME : number = 120;

const BODY_PIECE_SX : number[] = [0, 64, 112, 120];
const BODY_PIECE_SY : number[] = [0, 0, 0, 40];
const BODY_PIECE_DIMENSION : number[] = [64, 48, 32, 16];

const HAND_BASE_DISTANCE : number = 64;

const COLOR_MODS : RGBA[] = [
    new RGBA(),
    new RGBA(256, 160, 112),
    new RGBA(256, 112, 64)
];


const enum HandAttack {

    Unknown = -1,
    ShootFireball = 0,
    Rush = 1,
    Crush = 2,
};


const HAND_ATTACK_WAIT_TIME_MIN : number = 120;
const HAND_ATTACK_WAIT_TIME_MAX : number = 240;


const HAND_ATTACK_PROBABILITIES: number[][] =
[
[

    0.0, // Fireball
    0.0, // Rush
    1.0, // Crush
]
, 
[

    1.0, // Fireball
    0.0, // Rush
    0.0, // Crush
],
[

    1.0, // Fireball
    0.0, // Rush
    0.0, // Crush
]
];


class BodyPiece extends GameObject {


    private followedObject : GameObject;
    private targetRadius : number;

    private id : number;

    public readonly radius : number;


    constructor(x : number, y : number, id : number,
        followedObject : GameObject, selfRadius : number, targetRadius : number) {

        super(x, y, true);

        this.followedObject = followedObject;

        this.targetRadius = targetRadius;
        this.radius = selfRadius;

        this.friction.x = 0.075;
        this.friction.y = 0.075;

        this.id = id;

        this.inCamera = true;
    }


    protected updateEvent(event : ProgramEvent) : void {
        
        const tpos : Vector = this.followedObject.getPosition();
        const dir : Vector = Vector.direction(this.pos, tpos);

        const distance : number = Vector.distance(this.pos, tpos);
        const minDistance : number = this.radius + this.targetRadius;
        /*
        if (distance < minDistance) {

            this.pos.x = tpos.x - dir.x*(minDistance);
            this.pos.y = tpos.y - dir.y*(minDistance);
            return;
        }
        */

        const speed : number = Math.max(0.0, (distance - minDistance)/4.0);
        
        this.target.x = dir.x*speed;
        this.target.y = dir.y*speed;
    }


    public draw(canvas : Canvas, assets : Assets | undefined, bmp : Bitmap | undefined) : void {

        if (!this.isActive() || !this.followedObject.doesExist()) {

            return;
        }

        const sx : number = BODY_PIECE_SX[this.id] ?? 0;
        const sy : number = BODY_PIECE_SY[this.id] ?? 0;
        const dimension : number = BODY_PIECE_DIMENSION[this.id] ?? 64;

        const dx : number = this.pos.x - dimension/2;
        const dy : number = this.pos.y - dimension/2;

        // Body
        canvas.drawBitmap(bmp, Flip.None, dx, dy, sx, sy, dimension, dimension);
    }
}


// TODO: Put "Hand" to an external file if the class
// gets too long
class Hand extends CollisionObject {
 

    private side : number = 0;

    private mainBody : GameObject;

    private positionCorrected : boolean = true;
    private targetPos : Vector;

    private wave : number = 0.0;
    private distanceWave : number = 0.0;

    private phase : number = 0;

    private attackPhase : number = 0;
    private attackType : HandAttack = HandAttack.Unknown;
    private attackTimer : number = 0;
    private attackPrepareTimer : number = 0;
    private rushing : boolean = false;
    private crushing : boolean = false;

    private playerRef : GameObject | undefined = undefined;

    private flip : Flip = Flip.None;

    private projectiles : ProjectileGenerator | undefined = undefined;

    private readonly bottom : number = 0;


    constructor(body : GameObject, side : -1 | 1, bottom : number) {

        const bodyPos : Vector = body.getPosition();

        super(bodyPos.x + HAND_BASE_DISTANCE*side, bodyPos.y, true);

        this.targetPos = this.pos.clone();

        this.mainBody = body;
        this.side = side;

        this.inCamera = true;

        this.friction.x = 0.15;
        this.friction.y = 0.15;

        this.flip = side < 0 ? Flip.Horizontal : Flip.None;

        // Left hand always attacks first
        this.attackTimer = side < 0 ? HAND_ATTACK_WAIT_TIME_MIN : HAND_ATTACK_WAIT_TIME_MAX;

        this.bottom = bottom;

        this.takeCollisions = true;

        this.collisionBox = new Rectangle(0, -4, 32, 24);
    }


    private shootFireball(event : ProgramEvent) : void {

        const PROJECTILE_SPEED : number = 2.0;

        if (this.playerRef === undefined) {

            return;
        }

        const dir : Vector = Vector.direction(this.pos, this.playerRef.getPosition());
        this.projectiles?.next().spawn(
            this.pos.x, this.pos.y, 
            this.pos.x, this.pos.y, 
            dir.x*PROJECTILE_SPEED, dir.y*PROJECTILE_SPEED, 
            4, 4, false, -1, undefined, 0.0,
            false, false, 0, true);
            
        event.audio.playSample(event.assets.getSample("throw"), 0.50);
    }


    private initiateRush(event : ProgramEvent) : void {

        if (this.playerRef === undefined) {

            return;
        }

        this.attackPhase = 2;
        this.targetPos = this.playerRef.getPosition();

        this.rushing = true;
    }


    private initiateCrush(event : ProgramEvent) : void {

        const CRUSH_SPEED : number = 4.0;

        this.speed.y = CRUSH_SPEED;
        this.target.y = this.speed.y;

        this.speed.x = 0;
        this.target.x = 0;

        this.attackPhase = 2;
        this.crushing = true;
    }


    private performAttack(event : ProgramEvent) : void {

        this.attackPhase = 0;

        switch (this.attackType) {

        case HandAttack.ShootFireball:

            this.shootFireball(event);
            break;

        case HandAttack.Rush:

            this.initiateRush(event);
            break;

        case HandAttack.Crush:

            this.initiateCrush(event);
            break;

        default:
            break;
        }

    }


    private updateRush(event : ProgramEvent) : void {

        const MOVE_SPEED : number = 3.0;
        const RECOVER_TIME : number = 30;

        if (this.attackPhase == 4) {

            this.attackPhase = 0;
            this.rushing = false;
            this.positionCorrected = false;

            this.attackType = HandAttack.Unknown;
            
            return;
        }

        if (this.attackPhase == 3 && this.attackPrepareTimer > 0) {

            this.attackPrepareTimer -= event.tick;
            if (this.attackPrepareTimer <= 0) {

                this.positionCorrected = false;
                this.attackPhase = 4;
            }
            return;
        }

        // Note: from now on this is basically duplicate of reachTargetPosition,
        // maybe merge this two?

        const dir : Vector = Vector.direction(this.pos, this.targetPos);
        if (Vector.distance(this.pos, this.targetPos) < MOVE_SPEED*2*event.tick) {

            this.attackPhase = 3;
            this.attackPrepareTimer = RECOVER_TIME;
            this.speed.zeros();
            this.target.zeros();
            return;
        }

        this.target.x = dir.x*MOVE_SPEED;
        this.target.y = dir.y*MOVE_SPEED;

        if (this.attackPhase == 2) {

            this.speed.cloneFrom(this.target);
        }
    }


    private updateCrush(event : ProgramEvent) : void {

        if (this.attackPhase == 2) {

            if (this.pos.y > this.bottom) {

                this.crushing = false;
                this.attackPhase = 0;
                this.positionCorrected = false;

                this.attackType = HandAttack.Unknown;

                this.speed.zeros();
                this.target.zeros();
            }
            return;
        }

        if (this.attackPhase == 3) {

            this.attackPrepareTimer -= event.tick;
            if (this.attackPrepareTimer <= 0) {

                this.crushing = false;
                this.attackPhase = 0;
                this.positionCorrected = false;

                this.attackType = HandAttack.Unknown;
            }
        }
    }


    private updateAttacking(event : ProgramEvent) : void {

        const PREPARE_TIME : number = 60;

        if (this.attackPhase == 1) {

            this.attackPrepareTimer += event.tick;
            if (this.attackPrepareTimer >= PREPARE_TIME) {

                this.attackPrepareTimer = 0;
                this.performAttack(event);
            }
            return;
        }

        if (!this.positionCorrected) {

            return;
        }

        this.attackTimer -= event.tick;
        if (this.attackTimer <= 0) {

            this.attackPhase = 1;
            this.attackTimer = HAND_ATTACK_WAIT_TIME_MIN +
                Math.random()*(HAND_ATTACK_WAIT_TIME_MAX - HAND_ATTACK_WAIT_TIME_MIN);
            this.attackPrepareTimer = 0;

            this.attackType = sampleWeightedUniform(HAND_ATTACK_PROBABILITIES[this.phase] ?? [1.0]);
        }
    }


    private updateFirstPhase(event : ProgramEvent) : void {

        const WAVE_SPEED : number = Math.PI*2/300.0;
        const AMPLITUDE_Y : number = 24.0;
        const AMPLITUDE_X : number = 12.0;

        this.wave = (this.wave + WAVE_SPEED*event.tick) % (Math.PI*2);
        if (this.rushing) {

            return;
        }

        const bodyPos : Vector = this.mainBody.getPosition();
        
        this.targetPos.x = bodyPos.x + 
            (HAND_BASE_DISTANCE - Math.abs(Math.sin(this.wave)*AMPLITUDE_X))*this.side;
        this.targetPos.y = bodyPos.y + Math.sin(this.wave)*AMPLITUDE_Y;

        this.flip = this.side < 0 ? Flip.Horizontal : Flip.None;
    }


    private updateSecondPhase(event : ProgramEvent) : void {

        const WAVE_SPEED : number = Math.PI*2/360.0;
        const DISTANCE : number = 56;

        this.wave = (this.wave + WAVE_SPEED*event.tick) % (Math.PI*2);
        if (this.rushing) {

            return;
        }

        const bodyPos : Vector = this.mainBody.getPosition();
        
        this.targetPos.x = bodyPos.x + Math.cos(this.wave)*this.side*DISTANCE;
        this.targetPos.y = bodyPos.y + Math.sin(this.wave)*this.side*DISTANCE;

        this.flip = this.pos.x < bodyPos.x ? Flip.Horizontal : Flip.None;
    }


    private updateThirdPhase(event : ProgramEvent) : void {

        const WAVE_SPEED : number = Math.PI*2/300.0;
        const DISTANCE_WAVE_SPEED : number = Math.PI*2/430.0;

        const BASE_DISTANCE : number = 80;
        const DISTANCE_VARY : number = 24;

        this.wave = (this.wave + WAVE_SPEED*event.tick) % (Math.PI*2);
        this.distanceWave = (this.distanceWave + DISTANCE_WAVE_SPEED*event.tick) % (Math.PI*2);

        if (this.rushing) {

            return;
        }

        const bodyPos : Vector = this.mainBody.getPosition();
        
        const distance : number = BASE_DISTANCE - Math.cos(this.distanceWave)*DISTANCE_VARY;
        this.targetPos.x = bodyPos.x + Math.cos(this.wave)*this.side*distance;
        this.targetPos.y = bodyPos.y + Math.sin(this.wave)*this.side*distance;

        this.flip = this.pos.x < bodyPos.x ? Flip.Horizontal : Flip.None;
    }


    private reachTargetPosition(event : ProgramEvent) : void {

        const MOVE_SPEED : number = 2.0;

        if (Vector.distance(this.pos, this.targetPos) < MOVE_SPEED*2*event.tick) {

            this.pos = this.targetPos.clone();
            this.positionCorrected = true;
            return;
        }

        const dir : Vector = Vector.direction(this.pos, this.targetPos);

        this.target.x = dir.x*MOVE_SPEED;
        this.target.y = dir.y*MOVE_SPEED;
    }


    private determineFrame() : number {

        if ((this.attackPhase == 1 && this.attackType == HandAttack.ShootFireball) ||
            (this.attackPhase == 3 && this.attackType == HandAttack.Rush) ||
            (this.attackType == HandAttack.Crush)) {

            return 1;
        }
        return 0;
    }


    private determineFlip() : Flip {

        let flip : Flip = this.flip;
        if (this.attackType == HandAttack.Crush) {

            flip |= Flip.Vertical;
        }
        return flip;
    }


    protected updateEvent(event : ProgramEvent) : void {

        // this.takeCollisions = this.crushing;

        switch (this.phase) {

        case 0:

            this.updateFirstPhase(event);
            break;

        case 1:

            this.updateSecondPhase(event);
            break;

        case 2:

            this.updateThirdPhase(event);
            break;

        default:

            break;
        }

        if (this.crushing) {

            this.updateCrush(event);
            return;
        }

        if (this.rushing) {

            this.updateRush(event);
            return;
        }
        
        if (this.positionCorrected) {

            this.pos.x = this.targetPos.x;
             this.pos.y = this.targetPos.y;
        }
        else {

            this.reachTargetPosition(event);
        }
        
        this.updateAttacking(event);
    }


    protected slopeCollisionEvent(direction : -1 | 1, event : ProgramEvent) : void {

        const RECOVER_TIME : number = 60;

        if (this.crushing && this.attackPhase == 2) {

            this.attackPhase = 3;
            this.attackPrepareTimer = RECOVER_TIME;

            this.speed.zeros();
            this.target.zeros();

            // TODO: S H A K E!
        }
    }


    public draw(canvas : Canvas, assets : Assets | undefined, bmp : Bitmap | undefined) : void {
        
        if (!this.isActive()) {

            return;
        }

        const flicker : boolean = this.attackPhase == 1 &&
            Math.floor(this.attackPrepareTimer/4) % 2 != 0;

        const dx : number = this.pos.x - 24;
        const dy : number = this.pos.y - 24;

        const frame : number = this.determineFrame();
        const flip : Flip = this.determineFlip();

        if (flicker) {

            canvas.applyEffect(Effect.FixedColor);
        }

        canvas.drawBitmap(bmp, flip, dx, dy, frame*48, 64, 48, 48);

        if (flicker) {

            canvas.applyEffect(Effect.None);
        }
    }


    public setPhase(phase : number) : void {

        if (this.phase != phase && phase == 1) {

            this.positionCorrected = false;
        }
        this.phase = clamp(phase, 0, 2);
    }


    public setPlayerReference(player : GameObject) : void {

        this.playerRef = player;
    }


    public passProjectileGenerator(projectiles : ProjectileGenerator | undefined) : void {

        this.projectiles = projectiles;
    }

}


export class FinalBoss extends Enemy {


    private initialPosReached : boolean = false;

    private initialHealth : number = TOTAL_HEALTH;
    private healthBarPos : number = 0.0;

    private playerRef : Player | undefined = undefined;

    private wave : number = 0.0;
    private phase : number = 0;

    private deathEvent : (event : ProgramEvent) => void;
    private triggerDeathEvent : (event : ProgramEvent) => void;
    private deathTimer : number = 0;
    private deathTriggered : boolean = false;

    private bodyPieces : BodyPiece[];
    private hands : Hand[];


    constructor(x : number, y : number, bottom : number,
        deathEvent : (event : ProgramEvent) => void,
        triggerDeathEvent : (event : ProgramEvent) => void) {

        super(x, y);

        this.sprite.resize(64, 64);
        this.sprite.setFrame(1, 0);

        this.health = TOTAL_HEALTH;
        this.initialHealth = this.health;
        this.attackPower = 5;

        this.dropProbability = 0.0;

        this.collisionBox = new Rectangle(0, 0, 60, 60);
        this.hitbox = new Rectangle(0, 0, 56, 56);
        this.overriddenHurtbox = new Rectangle(0, 0, 40, 40);

        this.target.zeros();

        this.ignoreBottomLayer = true;
        this.takeCollisions = true;
        // this.canHurtPlayer = false;
        // this.canBeMoved = false;

        this.friction.x = 0.05;
        this.friction.y = 0.05;

        this.knockbackFactor = 0.75;

        this.deathEvent = deathEvent;
        this.triggerDeathEvent = triggerDeathEvent;

        this.cameraCheckArea.x = 1024;
        this.cameraCheckArea.y = 1024;

        this.deathSound = "eye_death";

        this.dir = Math.random() > 0.5 ? 1 : -1;

        this.bodyPieces = new Array<BodyPiece> (3);
        this.createBodyPieces();

        this.hands = new Array<Hand> (2);
        this.hands[0] = new Hand(this, -1, bottom);
        this.hands[1] = new Hand(this, 1, bottom);
    }


    private createBodyPieces() : void {

        this.bodyPieces[0] = new BodyPiece(this.pos.x, this.pos.y + 24, 1, this, 12, 16);
        this.bodyPieces[1] = new BodyPiece(this.pos.x, this.pos.y + 48, 2, this.bodyPieces[0], 8, 12);
        this.bodyPieces[2] = new BodyPiece(this.pos.x, this.pos.y + 64, 3, this.bodyPieces[1], 8, 8);
    }


    private reachInitialPos(event : ProgramEvent) : void {

        this.speed.y = -0.5 - (this.pos.y - INITIAL_Y)/64;
        this.target.y = this.speed.y;
    }


    private updateBaseMovement(event : ProgramEvent) : void {

        const HORIZONTAL_RADIUS : number = TILE_WIDTH*9; 

        const WAVE_SPEED : number = Math.PI*2/300.0;
        const AMPLITUDE_Y : number = 1.25;
        const SPEED_X : number = 1.0;

        this.wave = (this.wave + WAVE_SPEED*event.tick) % (Math.PI*2);
        this.target.y = Math.sin(this.wave)*AMPLITUDE_Y;

        this.target.x = SPEED_X*this.dir;
        if ((this.dir < 0 && this.pos.x < this.initialPos.x - HORIZONTAL_RADIUS) ||
            (this.dir > 0 && this.pos.x > this.initialPos.x + HORIZONTAL_RADIUS)) {

            this.dir = this.pos.x < this.initialPos.x ? 1 : -1;
            this.target.x *= -1;
        }
    }


    private updateHealthbarPos(event : ProgramEvent) : void {

        const speed : number = this.health < this.initialHealth ? 0.005 : 0.015;

        this.healthBarPos = clamp(updateSpeedAxis(
            this.healthBarPos, this.health/this.initialHealth, speed*event.tick), 
            0.0, 1.0);
    }


    private drawDeath(canvas : Canvas, bmp : Bitmap | undefined) : void {

        // const t : number = this.deathTimer/DEATH_TIME;
    }


    private setColorMod(canvas : Canvas) : void {

        const color : RGBA = COLOR_MODS[this.phase] ?? COLOR_MODS[0];
        canvas.setColor(color.r, color.g, color.b);
    }


    protected updateLogic(event : ProgramEvent) : void {
        
        this.phase = 2 - Math.min(2, Math.floor(this.health/(TOTAL_HEALTH/3)));

        for (const o of this.bodyPieces) {

            o.update(event);
        }

        this.updateHealthbarPos(event);

        if (!this.initialPosReached) {

            this.reachInitialPos(event);
            return;
        }

        this.updateBaseMovement(event);
    }


    protected postMovementEvent(event: ProgramEvent): void {
        
        if (!this.initialPosReached && this.pos.y < INITIAL_Y) {

            this.pos.y = INITIAL_Y;
            this.initialPosReached = true;

            this.target.zeros();
            this.speed.zeros();
        }
    
        for (const o of this.hands) {

            o.update(event);
            o.setPhase(this.phase);
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

        for (const o of this.hands) {

            o.setPlayerReference(player);
        }
    }


    public draw(canvas : Canvas, assets : Assets | undefined, bmp : Bitmap | undefined) : void {
        
        if (!this.exist || !this.inCamera) {

            return;
        }

        const bmpFinalboss : Bitmap | undefined = assets?.getBitmap("finalboss");
        const bmpMouth : Bitmap | undefined = assets?.getBitmap("mouth");

        if (this.dying) {

            this.drawDeath(canvas, bmpFinalboss);
            return;
        }

        this.setColorMod(canvas);

        const hurtFlicker : boolean = !this.dying && 
            this.hurtTimer > 0 &&
            Math.floor(this.hurtTimer/4) % 2 != 0;
        if (hurtFlicker) {

            canvas.applyEffect(Effect.FixedColor);
            canvas.setColor(255, 255, 255);
        }

        // Body pieces
        for (let i : number = this.bodyPieces.length - 1; i >= 0; -- i) {

            this.bodyPieces[i].draw(canvas, assets, bmpFinalboss);
        }

        const dx : number = this.pos.x - 32;
        const dy : number = this.pos.y - 32;

        // Body
        canvas.drawBitmap(bmpFinalboss, Flip.None, dx, dy, 0, 0, 64, 64);
        // Mouth
        canvas.drawBitmap(bmpMouth, Flip.None, dx, dy + 24, 64, 0, 64, 32);
        // Hat
        canvas.drawBitmap(bmpFinalboss, Flip.None, dx + 8, dy - 16, 0, 112, 48, 24);

        if (hurtFlicker) {

            canvas.applyEffect(Effect.None);
        }

        for (const o of this.hands) {

            o.draw(canvas, assets, bmpFinalboss);
        }

        canvas.setColor();
    }


    public hasReachedInitialPos() : boolean {

        return this.initialPosReached;
    }


    public getHealthbarHealth() : number {

        return Math.max(0.0, this.healthBarPos);
    }


    // Override
    public passGenerators(
        flyingText : ObjectGenerator<FlyingText, void>, 
        collectables : CollectableGenerator,
        projectiles : ProjectileGenerator) : void {

        this.flyingText = flyingText;
        this.collectables = collectables;
        this.projectiles = projectiles;

        for (const o of this.hands) {

            o.passProjectileGenerator(this.projectiles);
        }
    }


    public slopeCollision(x1 : number, y1 : number, x2 : number, y2 : number, 
        direction : -1 | 1, event : ProgramEvent, 
        leftMargin? : number, rightMargin? : number, safeMarginNear? : number, 
        safeMarginFar? : number, setReference? : GameObject | undefined) : boolean {
        
        for (const o of this.hands) {

            o.slopeCollision(
                x1, y1, x2, y2, 
                direction, event, 
                leftMargin, rightMargin, 
                safeMarginNear, safeMarginFar, 
                setReference);
        }
        return false;
    }
}
