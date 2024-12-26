import { CollisionObject } from "./collisionobject.js";
import { Vector } from "../math/vector.js";
import { Rectangle } from "../math/rectangle.js";
import { ProgramEvent } from "../core/event.js";
import { Camera } from "./camera.js";
import { Align, Bitmap, Canvas, Effect, Flip } from "../gfx/interface.js";
import { InputState } from "../core/inputstate.js";
import { Sprite } from "../gfx/sprite.js";
import { Assets } from "../core/assets.js";
import { Projectile } from "./projectile.js";
import { ProjectileGenerator } from "./projectilegenerator.js";
import { AnimatedParticle } from "./animatedparticle.js";
import { GameObject } from "./gameobject.js";
import { ObjectGenerator } from "./objectgenerator.js";
import { FlyingText, FlyingTextSymbol } from "./flyingtext.js";
import { RGBA } from "../math/rgba.js";
import { Progress } from "./progress.js";
import { Item } from "./items.js";
import { MapTransitionCallback } from "./maptransition.js";
import { TransitionType } from "../core/transition.js";
import { clamp } from "../math/utility.js";


const GRAVITY_MAGNITUDE : number = 5.0;
const UNDERWATER_GRAVITY : number = 0.75;
const UNDERWATER_FRICTION_MODIFIER : number = 2;

const SHOOT_RELEASE_TIME : number = 20;
const SHOOT_BASE_TIME : number = 20;
const SHOOT_WAIT_TIME : number = 10.0;

const HURT_TIME : number = 60;
const KNOCKBACK_TIME : number = 20;
const DEATH_TIME : number = 60;

const POWER_ATTACK_TIME : number = 20;
const POWER_ATTACK_HALT_TIME : number = 10;

const ATTACK_RELEASE_TIME : number = 8;

const CHARGE_VOLUME : number = 0.70;

const RUN_SPEED_BASE_BONUS : number = 0.20;


const enum ChargeType {

    None = 0,
    Sword = 1,
    Gun = 2,
};


export const enum WaitType {

    Unknown = 0,
    HoldingItem = 1,
    WakingUp = 2,
    ToggleLever = 3,
    Licking = 4, // Don't ask
};


export const enum Pose {

    None = 0,
    Sit = 1,
    UseDoor = 2,
    EnterRoom = 3,
    EnterRight = 4,
    EnterLeft = 5,
}


export class Player extends CollisionObject {


    private jumpTimer : number = 0.0;
    private ledgeTimer : number = 0.0;
    // TODO: Maybe add "JumpType" enum instead? (Nah.)
    private highJumping : boolean = false;

    private canUseRocketPack : boolean = false;
    private rocketPackActive : boolean = false; 
    private rocketPackReleased : boolean = false;

    private shooting : boolean = false;
    private shootTimer : number = 0.0;
    private shootWait : number = 0.0;
    private flashType : number = 0;

    private charging : boolean = false;
    private chargeType : ChargeType = ChargeType.None;
    private chargeFlickerTimer : number = 0;

    private hurtTimer : number = 0.0;
    private knockbackTimer : number = 0.0;

    private crouching : boolean = false;
    private crouchFlickerTimer : number = 0;

    private underWater : boolean = false;
    private touchDeepWater : boolean = false;

    private attackID : number = 0;
    private attacking : boolean = false;
    private attackNumber : number = 0;
    private downAttacking : boolean = false;
    private downAttackWait : number = 0;
    private powerAttackTimer : number = 0;
    private powerAttackStopped : boolean = false;
    private swordHitbox : Rectangle;
    private swordHitBoxActive : boolean = false;
    private attackReleaseTimer : number = 0;

    private sprite : Sprite;
    private flip : Flip;

    private dustTimer : number = 0;
    private dustCount : number = 0;

    private deathTimer : number = 0;

    private iconType : number = 0;
    private iconSprite : Sprite;

    private checkpointObject : GameObject | undefined = undefined;

    private waitActive : boolean = false;
    private waitTimer : number = 0;
    private initialWaitTimer : number = 0;
    private waitType : WaitType = WaitType.Unknown;
    private waitParameter : number = 0;
    private waitCeaseEvent : ((event : ProgramEvent) => void) | undefined = undefined;

    private slurpString : string = ""; // Slurp *what now*?

    private readonly projectiles : ProjectileGenerator;
    private readonly particles : ObjectGenerator<AnimatedParticle, void>;
    private readonly flyingText : ObjectGenerator<FlyingText, void>;

    private readonly mapTransition : MapTransitionCallback | undefined = undefined;

    public readonly stats : Progress;


    constructor(x : number, y : number, 
        projectiles : ProjectileGenerator,
        particles : ObjectGenerator<AnimatedParticle, void>,
        flyingText : ObjectGenerator<FlyingText, void>,
        stats : Progress, mapTransition : MapTransitionCallback,
        event : ProgramEvent) {

        super(x, y, true);

        this.friction = new Vector(0.15, 0.125);

        this.inCamera = true;

        this.collisionBox = new Rectangle(0, 2, 10, 12);
        this.hitbox = new Rectangle(0, 2, 10, 12);

        this.sprite = new Sprite(24, 24);

        this.projectiles = projectiles;
        this.particles = particles;
        this.flyingText = flyingText;
        this.stats = stats;

        this.swordHitbox = new Rectangle();

        this.dir = 1;
    
        this.iconSprite = new Sprite(16, 16);

        this.mapTransition = mapTransition;

        this.slurpString = event.localization?.getItem("slurp")?.[0] ?? "null";
    }


    private getGravity = () : number => this.underWater ? UNDERWATER_GRAVITY : GRAVITY_MAGNITUDE;


    private isFullyDown = () : boolean => this.crouching && 
        this.sprite.getRow() == 3 &&
        this.sprite.getColumn() == 5;


    private setHitbox() : void {

        if (!this.crouching) {
            
            this.hitbox.y = 2
            this.hitbox.h = 12;
            return;
        }

        this.hitbox.y = 6;
        this.hitbox.h = 6;
    }


    private computeSwordHitbox() : void {

        const SWORD_OFFSET_X : number = 16;
        const SWORD_OFFSET_Y : number = 2;

        const SWORD_ATTACK_BASE_WIDTH : number[] = [14, 18];
        const SWORD_ATTACK_BASE_HEIGHT : number[] = [20, 14];

        const SWORD_ATTACK_SPECIAL_WIDTH : number = 16;
        const SWORD_ATTACK_SPECIAL_HEIGHT : number = 16;

        const DOWN_ATTACK_OFFSET_X : number = 1;
        const DOWN_ATTACK_OFFSET_Y : number = 14;

        const DOWN_ATTACK_WIDTH : number = 6;
        const DOWN_ATTACK_HEIGHT : number = 16;

        this.swordHitBoxActive = false;

        if (this.downAttacking && this.downAttackWait <= 0) {

            this.swordHitbox.x = this.pos.x + DOWN_ATTACK_OFFSET_X*this.dir;
            this.swordHitbox.y = this.pos.y + DOWN_ATTACK_OFFSET_Y;

            this.swordHitbox.w = DOWN_ATTACK_WIDTH;
            this.swordHitbox.h = DOWN_ATTACK_HEIGHT;

            this.swordHitBoxActive = true;

            return;
        }

        if (!this.attacking && this.powerAttackTimer <= 0) {

            return;
        }

        this.swordHitbox.x = this.pos.x + this.dir*SWORD_OFFSET_X;
        this.swordHitbox.y = this.pos.y + SWORD_OFFSET_Y;

        this.swordHitbox.w = this.powerAttackTimer > 0 ? SWORD_ATTACK_SPECIAL_WIDTH : SWORD_ATTACK_BASE_WIDTH[this.attackNumber];
        this.swordHitbox.h = this.powerAttackTimer > 0 ? SWORD_ATTACK_SPECIAL_HEIGHT : SWORD_ATTACK_BASE_HEIGHT[this.attackNumber];

        this.swordHitBoxActive = true;
    }


    private computeFaceDirection(event : ProgramEvent) : void {

        const STICK_THRESHOLD : number = 0.01;

        if (this.attacking) {

            return;
        }

        const stick : Vector = event.input.stick;
        if (Math.abs(stick.x) > STICK_THRESHOLD) {

            this.dir = stick.x > 0 ? 1 : -1;
        }
    }


    private checkCrouching(event : ProgramEvent) : void {

        const THRESHOLD : number = 0.5;

        if (this.attacking) {

            return;
        }

        const wasCrouching : boolean = this.crouching;

        this.crouching = !this.underWater && this.touchSurface && event.input.stick.y > THRESHOLD;
        if (this.crouching && !wasCrouching) {

            this.charging = false;

            this.sprite.setFrame(3, 3);
            this.crouchFlickerTimer = 0;
        }
    }


    private updateBaseMovement(event : ProgramEvent) : void {

        const RUN_SPEED : number = 1.0;
        const SWIM_SPEED : number = 0.75;

        const stick : Vector = event.input.stick;

        this.target.y = this.getGravity();
        if (this.crouching) {

            this.target.x = 0.0;
            return;
        }

        const speedx : number = this.underWater ? SWIM_SPEED : RUN_SPEED;
        const speedBonus : number = 1.0 + this.stats.getSpeedBonus()*RUN_SPEED_BASE_BONUS;

        this.target.x = stick.x*this.computeSlopeSpeedFactor()*speedx*speedBonus;
    }


    private controlJumping(event : ProgramEvent) : void {

        const JUMP_TIME_BASE : number = 15.0;
        const JUMP_TIME_HIGH : number = 14.0;
        const ROCKET_PACK_JUMP : number = 45;
        const MINIMUM_ROCKET_JUMP_SPEED : number = 1.5;

        if (this.attacking) {

            return;
        }

        const hasRocketPack : boolean = 
            this.stats.hasItem(Item.WeakRocketPack) || 
            this.stats.hasItem(Item.StrongRocketPack);

        const jumpButton : InputState = event.input.getAction("jump");
        if (jumpButton == InputState.Pressed && !this.highJumping) {

            if (this.ledgeTimer > 0 || this.underWater) {

                this.highJumping = this.stats.hasItem(Item.SpringBoots) && this.isFullyDown();

                this.jumpTimer = this.highJumping ? JUMP_TIME_HIGH : JUMP_TIME_BASE;
                this.ledgeTimer = 0.0;

                this.crouching = false;

                if (this.referenceObject !== undefined) {

                    const refSpeed : Vector = this.referenceObject.getSpeed();
                    this.speed.x += refSpeed.x;
                    this.speed.y += refSpeed.y;
                }

                event.audio.playSample(event.assets.getSample("jump"), 0.80);
            }
            else if (hasRocketPack && this.canUseRocketPack) {

                this.canUseRocketPack = false;
                this.rocketPackReleased = !this.stats.hasItem(Item.StrongRocketPack);
                this.rocketPackActive = true;

                if (this.stats.hasItem(Item.StrongRocketPack)) {

                    this.jumpTimer = ROCKET_PACK_JUMP;
                    this.speed.y = Math.min(MINIMUM_ROCKET_JUMP_SPEED, this.speed.y);
                }
            
                // To make the sound effect appear immediately
                this.dustCount = 0;
            }
            else if (hasRocketPack && this.rocketPackReleased) {

                this.jumpTimer = 0;
                this.rocketPackActive = true;

                this.dustCount = 0;
            }
        }
        else if ((jumpButton & InputState.DownOrPressed) == 0) {

            this.jumpTimer = 0;
            this.rocketPackActive = false;
            this.rocketPackReleased = true;
        }
    }


    private shootBullet(type : number, event : ProgramEvent) : void {

        const BULLET_SPEED : number[] = [4.0, 2.5];

        const BULLET_YOFF : number = 3;
        const BULLET_XOFF : number = 8;

        const BULLET_SPEED_FACTOR_X : number = 0.5;
        const BULLET_SPEED_FACTOR_Y : number = 0.0; // Makes collisions work better...

        if (this.stats.getBulletCount() <= 0) {

            this.flashType = -1;

            event.audio.playSample(event.assets.getSample("empty"), 0.90);
            return;
        }

        const dx : number = this.pos.x + BULLET_XOFF*this.dir;
        const dy : number = this.pos.y + BULLET_YOFF;

        const power : number = type == 1 ? this.stats.getChargeProjectilePower() : this.stats.getProjectilePower();

        this.projectiles.next(this.stats).spawn(
            this.pos.x, dy, dx, dy, 
            this.speed.x*BULLET_SPEED_FACTOR_X + (BULLET_SPEED[type] ?? 0)*this.dir, 
            this.speed.y*BULLET_SPEED_FACTOR_Y, 
            type, power, true, this.attackID + 1);
        if (type == 1) {

            ++ this.attackID;
            event.audio.playSample(event.assets.getSample("charge_shot"), 0.60);
        }
        else {

            event.audio.playSample(event.assets.getSample("shoot"), 0.40);
        }

        this.stats.updateBulletCount(-1);
    }


    private controlShooting(event : ProgramEvent) : void {

        if (!this.stats.hasItem(Item.Gun)) {

            return;
        }

        if (this.attacking || 
            this.highJumping || 
            this.shootWait > 0 || 
            this.crouching) {

            return;
        }

        const shootButton : InputState = event.input.getAction("shoot");
        if (shootButton == InputState.Pressed || 
            (this.charging && this.chargeType == ChargeType.Gun &&
                (shootButton & InputState.DownOrPressed) == 0)) {

            this.shooting = true;
            this.shootTimer = SHOOT_BASE_TIME + SHOOT_RELEASE_TIME;
            this.shootWait = SHOOT_WAIT_TIME;
           
            this.flashType = this.charging ? 1 : 0;

            this.sprite.setFrame(this.sprite.getColumn(), 2 + (this.sprite.getRow() % 2), true);

            this.shootBullet(this.flashType, event);

            this.charging = false;
            this.chargeFlickerTimer = 0.0;
        }
    }


    private controlAttacking(event : ProgramEvent, forceSecondAttack : boolean = false) : void {

        const DOWN_ATTACK_JUMP : number = -2.0;
        const DOWN_ATTACK_STICK_Y_THRESHOLD : number = 0.50;
        const FORWARD_SPEED : number[] = [1.5, 2.0];

        if (!this.stats.hasItem(Item.Sword)) {

            return;
        }
        
        const attackButton : InputState = event.input.getAction("attack");
        // Charge attack
        if (this.stats.hasItem(Item.EternalFlame) &&
            !forceSecondAttack &&
            this.charging && this.chargeType == ChargeType.Sword && 
            (attackButton & InputState.DownOrPressed) == 0) {

            this.jumpTimer = 0;

            this.powerAttackTimer = POWER_ATTACK_TIME;
            this.powerAttackStopped = false;
            this.charging = false;

            this.speed.zeros();
            
            ++ this.attackID;

            event.audio.playSample(event.assets.getSample("charge_attack"), 0.60);

            return;
        }

        if ((this.attacking && !forceSecondAttack) || this.highJumping) {

            return;
        }
        
        if (attackButton == InputState.Pressed) {

            event.audio.playSample(event.assets.getSample("sword"), 0.90);

            // Down attack
            if (this.stats.hasItem(Item.ThumbDown) &&
                !this.underWater &&
                !forceSecondAttack &&
                !this.touchSurface && 
                event.input.stick.y >= DOWN_ATTACK_STICK_Y_THRESHOLD) {

                ++ this.attackID;

                this.attacking = false; // Possibly unnecessary
                this.downAttacking = true;
                this.rocketPackActive = false;
                this.speed.y = DOWN_ATTACK_JUMP;
                this.charging = false;
                
                this.jumpTimer = 0;

                return;
            }

            this.attacking = true;
            // this.attackDir = this.dir;

            this.crouching = false;
            this.shooting = false;
            this.charging = false;

            if (this.rocketPackActive) {

                this.jumpTimer = 0;
            }
            this.rocketPackActive = false;
            this.rocketPackReleased = true;

            this.sprite.setFrame(3, 1);

            ++ this.attackID;
            this.attackNumber = 0;
            if (forceSecondAttack || this.attackReleaseTimer > 0) {

                this.attackNumber = 1;
            }

            if (this.touchSurface) {

                this.speed.x = this.dir*FORWARD_SPEED[this.attackNumber];
            }
        }
    }


    private updateDownAttack(event : ProgramEvent) : void {

        const ATTACK_SPEED_MAX : number = 6.0;
        const FRICTION_Y : number = 0.33;

        this.friction.y = FRICTION_Y;

        this.target.x = 0.0;
        this.target.y = ATTACK_SPEED_MAX;

        if (this.downAttackWait > 0) {

            this.downAttackWait -= event.tick;
        }
    }


    private updatePowerAttack(event : ProgramEvent) : void {

        const RUSH_SPEED : number = 2.5;

        this.powerAttackTimer -= event.tick;
        if (this.powerAttackTimer <= 0 || this.powerAttackStopped) {

            this.speed.x = 0;
            return;
        }
        
        this.target.x = this.dir*RUSH_SPEED;
        this.speed.x = this.target.x;
        
        this.target.y = this.touchSurface ? this.getGravity() : 0.0;
    }


    private setFriction() : void {

        const speedBonus : number = 1.0 + this.stats.getSpeedBonus()*RUN_SPEED_BASE_BONUS;

        this.friction.x = 0.15*speedBonus;
        this.friction.y = 0.125;
        if (this.underWater) {

            this.friction.x /= UNDERWATER_FRICTION_MODIFIER;
            this.friction.y /= UNDERWATER_FRICTION_MODIFIER;
        }
/*
        if (this.powerAttackTimer > 0 && this.powerAttackStopped) {

            this.friction.x = 0.025;
        }
*/
    }


    private updateWaterMovement(event : ProgramEvent) : void {

        if (!this.underWater) {

            return;
        }

        this.speed.y = Math.min(this.speed.y, UNDERWATER_GRAVITY);
        this.target.y = Math.min(this.target.y, UNDERWATER_GRAVITY);
        // TODO: Splash sound?

        // Just for sure
        this.downAttacking = false;
        this.downAttackWait = 0;
    }


    private control(event : ProgramEvent) : void {

        this.setFriction();

        if (this.knockbackTimer > 0 ||
            (this.attacking && this.touchSurface)) {

            if (this.attacking) {

                // If possible, start a second attack
                const canPerformSecondAttack : boolean = this.attacking && 
                    this.attackNumber == 0 &&
                    this.touchSurface &&
                    this.sprite.getColumn() >= 6;
                this.controlAttacking(event, canPerformSecondAttack);
            }
                
            this.target.x = 0.0;
            this.target.y = this.getGravity();
            // Also needed here (but it has no effect???)
            this.updateWaterMovement(event);

            return;
        }
        this.updateWaterMovement(event);

        if (this.powerAttackTimer > 0) {

            this.updatePowerAttack(event);
            return;
        }

        if (this.downAttacking || this.downAttackWait > 0) {

            this.updateDownAttack(event);
            return;
        }

        this.computeFaceDirection(event);
        this.checkCrouching(event);
        this.updateBaseMovement(event);
        this.controlJumping(event);
        this.controlShooting(event);
        this.controlAttacking(event);
    }


    private animateJumping(rowModifier : number, event : ProgramEvent) : void {

        const JUMP_ANIM_THRESHOLD : number = 0.40;

        if (this.highJumping) {

            this.sprite.animate(4, 0, 7, 3, event.tick)
            return;
        }

        let frame : number = 1;
        if (this.speed.y < -JUMP_ANIM_THRESHOLD) {

            -- frame;
        }
        else if (this.speed.y > JUMP_ANIM_THRESHOLD) {

            ++ frame;
        }

        if (this.rocketPackActive) {

            this.sprite.setFrame(6 + frame, rowModifier);
            return;
        }
        this.sprite.setFrame(frame, 1 + rowModifier);
    }


    private animateRunningAndStanding(rowModifier : number, event : ProgramEvent) : void {

        const EPS : number = 0.01;

        if (Math.abs(this.target.x) < EPS && Math.abs(this.speed.x) < EPS) {

            this.sprite.setFrame(0, rowModifier);
            return;
        }

        const speed : number = Math.max(0, 10 - Math.abs(this.speed.x)*4);
        this.sprite.animate(rowModifier, 1, 4, speed, event.tick);
            
    }


    private animateCrouching(event : ProgramEvent) : void {

        const ANIMATION_SPEED : number = 8;

        if (this.sprite.getRow() != 3 || this.sprite.getColumn() != 5) {

            this.sprite.animate(3, 3, 5, ANIMATION_SPEED, event.tick);
            if (this.stats.hasItem(Item.SpringBoots) && this.sprite.getColumn() == 5) {

                event.audio.playSample(event.assets.getSample("charge"), CHARGE_VOLUME);
            }
        }
    }


    private animateAttacking(event : ProgramEvent) : void {

        const BASE_ATTACK_SPEED : number = 4;
        const LAST_FRAME : number = 8;
        const LAST_FRAME_LENGTH : number = 16;
        const LAST_FRAME_RELEASE = 8;

        const row : number = 1 + this.attackNumber*4;

        this.sprite.animate(row, 3, LAST_FRAME, 
            this.sprite.getColumn() == LAST_FRAME - 1 ? LAST_FRAME_LENGTH : BASE_ATTACK_SPEED, 
            event.tick);

        const buttonReleased : boolean = (event.input.getAction("attack") & InputState.DownOrPressed) == 0;

        if (this.sprite.getColumn() == LAST_FRAME ||
            (buttonReleased &&
            this.sprite.getColumn() == LAST_FRAME - 1 &&
            this.sprite.getFrameTime() >= LAST_FRAME_RELEASE)) {

            if (this.stats.hasItem(Item.EternalFlame) && this.sprite.getColumn() == LAST_FRAME) {

                this.charging = !buttonReleased;
                if (this.charging) {

                    event.audio.playSample(event.assets.getSample("charge"), CHARGE_VOLUME);
                }
                this.chargeType = ChargeType.Sword;
            }

            this.attacking = false;
            this.sprite.setFrame(0, 0);

            this.attackReleaseTimer = (1 - this.attackNumber)*ATTACK_RELEASE_TIME;
        }
    }   


    private animateDownAttack() : void {

        this.sprite.setFrame(8, 1);
    }


    private animatePowerAttack() : void {

        this.sprite.setFrame(5, 2);
    }


    private animateSwimming(rowModifier : number, event : ProgramEvent) : void {
        
        const EPS : number = 0.01;

        const row : number = rowModifier + (this.jumpTimer > 0 ? 1 : 0);

        if (Math.abs(this.target.x) > EPS) {

            this.sprite.animate(row, 9, 10, 8, event.tick);
            return;
        }
        this.sprite.setFrame(9, row);
    }


    private animateIcon(event : ProgramEvent) : void {

        const ANIMATION_SPEED : number = 20;

        this.iconSprite.animate(this.iconType - 1, 0, 1, ANIMATION_SPEED, event.tick);
    }   

    
    private animate(event : ProgramEvent) : void {

        
        this.flip = this.dir > 0 ? Flip.None : Flip.Horizontal;

        if (this.iconType > 0) {

            this.animateIcon(event);
        }

        if (this.powerAttackTimer > 0) {

            this.animatePowerAttack();
            return;
        }

        if (this.downAttacking || this.downAttackWait > 0) {

            this.animateDownAttack();
            return;
        }

        if (this.knockbackTimer > 0) {

            this.sprite.setFrame(5, 0);
            return;
        }

        if (this.attacking) {

            this.animateAttacking(event);
            return;
        }

        if (this.crouching) {

            this.animateCrouching(event);
            return;
        }

        const rowModifier : number = this.shooting ? 2 : 0;

        if (this.underWater) {

            this.animateSwimming(rowModifier, event);
            return;
        }

        if (!this.touchSurface) {

            this.animateJumping(rowModifier, event);
            return;
        }
        this.animateRunningAndStanding(rowModifier, event);
    }


    private updateJumping(event : ProgramEvent) : void {

        const JUMP_SPEED_BASE : number = -2.25;
        const JUMP_UNDERWATER_SPEED : number = -1.25;
        const JUMP_SPEED_HIGH : number = -3.0;
        const MAX_HIGH_JUMP_SPEED : number = 1.0;
        const ROCKET_PACK_DELTA : number = -0.20;
        const ROCKET_PACK_MIN : number = -2.0;
        const ROCKET_PACK_LANDING_SPEED : number = 0.5;

        if (this.rocketPackActive && this.jumpTimer <= 0) {

            this.speed.y = Math.min(ROCKET_PACK_LANDING_SPEED, this.speed.y);
            return;
        }

        if (this.highJumping && this.speed.y > MAX_HIGH_JUMP_SPEED) {

            this.highJumping = false;
        }

        if (this.jumpTimer <= 0) {
            
            if (this.rocketPackActive) {

                this.rocketPackReleased = true;
            }
            return;
        }

        if (!this.underWater || 
            (this.underWater && this.stats.hasItem(Item.Snorkel) && this.touchDeepWater)) {
        
            this.jumpTimer -= event.tick;
        }

        if (this.rocketPackActive) {

            this.speed.y = Math.max(ROCKET_PACK_MIN, this.speed.y + ROCKET_PACK_DELTA*event.tick);
            return;
        }

        this.speed.y = this.highJumping ? JUMP_SPEED_HIGH : JUMP_SPEED_BASE;
        if (this.underWater) {

            this.speed.y = JUMP_UNDERWATER_SPEED;
        }

        this.target.y = this.speed.y;
    }


    private updateShootTimers(event : ProgramEvent) : void {

        if (this.shootTimer > 0) {

            const shootButton : InputState = event.input.getAction("shoot");

            this.shootTimer -= event.tick;
            if (this.shootTimer <= 0 || 
                (this.shootTimer <= SHOOT_RELEASE_TIME && (shootButton & InputState.DownOrPressed) == 0)) {

                this.shooting = false;
                if (this.shootTimer <= 0 && this.stats.hasItem(Item.ChargeShot)) {

                    this.chargeType = ChargeType.Gun;
                    this.charging = true;
                    event.audio.playSample(event.assets.getSample("charge"), CHARGE_VOLUME);
                }
                this.shootTimer = 0;
            }
        }

        if (this.shootWait > 0) {

            this.shootWait -= event.tick;
        }
    }


    private updateTimers(event : ProgramEvent) : void {

        const CROUCH_FLICKER_SPEED : number = 1.0/8.0;
        const CHARGE_FLICKER_SPEED : number = 1.0/8.0;

        this.updateShootTimers(event);

        if (this.ledgeTimer > 0) {

            this.ledgeTimer -= event.tick;
        }

        if (this.knockbackTimer > 0) {

            this.knockbackTimer -= event.tick;
            if (this.knockbackTimer <= 0 && this.stats.getHealth() <= 0) {

                this.initializeDeath(event);
            }
        }
        else if (this.hurtTimer > 0) {

            this.hurtTimer -= event.tick;
        }

        if (this.stats.hasItem(Item.SpringBoots) && this.isFullyDown()) {

            this.crouchFlickerTimer = (this.crouchFlickerTimer + CROUCH_FLICKER_SPEED*event.tick) % 1.0;
        }

        if (this.charging) {

            this.chargeFlickerTimer = (this.chargeFlickerTimer + CHARGE_FLICKER_SPEED*event.tick) % 1.0;
        }

        if (this.attackReleaseTimer > 0) {

            this.attackReleaseTimer -= event.tick;
            if (!this.touchSurface) {

                this.attackReleaseTimer = 0;
            }
        }
    }


    private updateSwimming(event : ProgramEvent) : void {

        const RISE_SPEED : number = -0.1;
        const RISE_MAX : number = -1.0;

        if (this.stats.hasItem(Item.Snorkel) || !this.touchDeepWater) {

            return;
        }

        this.speed.y += RISE_SPEED*event.tick;
        this.speed.y = Math.max(RISE_MAX, this.speed.y);
    }


    private updateFlags() : void {

        this.touchSurface = false;
        this.underWater = false;
        this.touchDeepWater = false;
        this.iconType = 0;
    }


    private updateDust(event : ProgramEvent) : void {

        const X_OFFSET : number = -4;
        const Y_OFFSET : number = 7;
        const DUST_TIME : number = 10.0;
        const ROCKET_PACK_DUST_TIME : number = 4.0;
        const ROCKET_PACK_LANDING_DUST_TIME : number = 6.0;
        const MIN_SPEED : number = 0.1;
        const ROCKET_PACK_DUST_SPEED_Y : number = 0.5;
        const ROCKET_PACK_DUST_LANDING_SPEED_Y : number = 1.0;

        if ((this.powerAttackTimer <= 0 &&
            this.knockbackTimer <= 0 &&
            this.touchSurface && 
            Math.abs(this.speed.x) > MIN_SPEED) ||
            this.rocketPackActive) {

            this.dustTimer -= event.tick;
        }

        if (this.dustTimer <= 0) {

            this.dustTimer = DUST_TIME;

            let speedy : number = 0;
            let id : number = 0;
            if (this.rocketPackActive) {
                
                id = 1;
                if (this.jumpTimer > 0) {

                    speedy = ROCKET_PACK_DUST_SPEED_Y;
                    this.dustTimer = ROCKET_PACK_DUST_TIME;
                }
                else {

                    speedy = ROCKET_PACK_DUST_LANDING_SPEED_Y;
                    this.dustTimer = ROCKET_PACK_LANDING_DUST_TIME;
                }

                // Calling the sound effect each time a dust particle
                // is too frequent, hence we only call it every other
                // frame.
                this.dustCount = (this.dustCount + 1) % 2;
                if (this.dustCount == 1) {

                    event.audio.playSample(event.assets.getSample("buzz"), 0.70);
                }
            }

            this.particles.next().spawn(
                this.pos.x + X_OFFSET*this.dir,
                this.pos.y + Y_OFFSET,
                0.0, speedy, id, Flip.None);
            
        }
    } 


    private hurt(damage : number, event : ProgramEvent) : void {

        this.shooting = false;
        this.shootTimer = 0;
        this.jumpTimer = 0;
        this.charging = false;
        this.attacking = false;
        this.downAttacking = false;
        this.downAttackWait = 0;
        this.rocketPackActive = false;
        this.powerAttackTimer = 0;

        this.hurtTimer = HURT_TIME;

        damage = -this.stats.updateHealth(-damage);
        this.flyingText?.next()
            .spawn(this.pos.x, this.pos.y - 8, 
                -damage, FlyingTextSymbol.None, new RGBA(255, 73, 0));

        event.audio.playSample(event.assets.getSample("hurt"), 0.90);
    }


    private initializeDeath(event : ProgramEvent) : void {

        this.dying = true;
        this.sprite.setFrame(4, 8);
        
        event.audio.stopMusic();
        event.audio.playSample(event.assets.getSample("die"), 0.80);
    }


    private updateWaiting(event : ProgramEvent) : void {

        this.target.zeros();
        this.speed.zeros();

        this.waitTimer -= event.tick;
        if (this.waitTimer <= 0) {

            this.waitCeaseEvent?.(event);
        }

        switch (this.waitType) {

        case WaitType.WakingUp: 
            {
                const t : number = 1.0 - this.waitTimer/this.initialWaitTimer;
                const frame : number = Math.floor(t*3.0);
                if (frame < 2) {

                    this.sprite.setFrame(frame, 5);
                    break;
                }
                this.sprite.setFrame(0, 0);
            }
            break;

        default:
            break;
        }
    }


    private drawMuzzleFlash(canvas : Canvas, bmp : Bitmap | undefined) : void {

        const X_OFFSET : number = 10;
        const Y_OFFSET : number = 3;

        if (this.flashType < 0) {

            return;
        }

        const frame : number = Math.floor((1.0 - this.shootWait/SHOOT_WAIT_TIME)*4);

        const dx : number = this.pos.x + this.dir*X_OFFSET - 8;
        const dy : number = this.pos.y + Y_OFFSET - 8;

        canvas.drawBitmap(bmp, this.flip, dx, dy, frame*16, this.flashType*16, 16, 16);
    }


    private drawWeapon(canvas : Canvas, bmp : Bitmap | undefined) : void {

        const dx : number = this.pos.x - 16 + this.dir*10;
        const dy : number = this.pos.y - 14;

        let frame : number = this.attacking ? this.sprite.getColumn() - 3 : 5;
        let row : number = this.downAttacking ? 0 : this.attackNumber*2;
        if (this.powerAttackTimer > 0) {

            frame = Math.floor(this.powerAttackTimer/4) % 4;
            row = 1;
        }

        // Since weird things can happen
        if (this.downAttackWait > 0) {

            frame = 5;
            row = 0;
        }

        canvas.drawBitmap(bmp, this.flip, dx, dy, frame*32, row*32, 32, 32);
    }


    private drawDeath(canvas : Canvas, bmp : Bitmap | undefined) : void {

        const ORB_COUNT : number = 8;
        const ORB_DISTANCE : number = 64;

        const t : number = this.deathTimer / DEATH_TIME;
        const step : number = Math.PI*2 / ORB_COUNT;

        const dx : number = Math.round(this.pos.x);
        const dy : number = Math.round(this.pos.y);

        for (let i : number = 0; i < ORB_COUNT; ++ i) {

            const angle : number = step*i;

            this.sprite.draw(canvas, bmp,
                dx + Math.round(Math.cos(angle)*t*ORB_DISTANCE) - 12,
                dy + Math.round(Math.sin(angle)*t*ORB_DISTANCE) - 12);
        }
    }


    private drawHoldingItem(canvas : Canvas, assets : Assets) : void {

        const ITEM_LIFT : number = 16;
        const ITEM_START_YOFF : number = 8;
        // Don't ask
        const ANIMATION_STOP_MODIFIER : number = 2.5;

        if (!this.waitActive || this.waitType != WaitType.HoldingItem) {
            
            return;
        }

        const bmpItemIcons: Bitmap | undefined = assets.getBitmap("item_icons");

        const t : number = Math.min((1.0 - this.waitTimer/this.initialWaitTimer)*ANIMATION_STOP_MODIFIER, 1.0);
        const yoff: number = ITEM_START_YOFF + t*ITEM_LIFT;

        const column : number = this.waitParameter % 16;
        const row : number = Math.floor(this.waitParameter/16);

        canvas.drawBitmap(bmpItemIcons, Flip.None,
            this.pos.x - 8, this.pos.y - yoff,
            column*16, row*16, 16, 16);
    }


    private drawSlurping(canvas : Canvas, assets : Assets) : void {

        if (!this.waitActive || this.waitType != WaitType.Licking) {
            
            return;
        }

        const bmpFontOutlines : Bitmap | undefined = assets.getBitmap("font_outlines");

        const t : number = 1.0 - this.waitTimer/this.initialWaitTimer;

        const count : number = 1 + Math.min(2, Math.floor(t*3));

        canvas.setColor(182, 255, 146);
        for (let i : number = 0; i < count; ++ i) {

            let shiftx : number = 0;
            if (i == 1) {

                shiftx = 8;
            }
            else if (i == 2) {

                shiftx = -8;
            }

            canvas.drawText(bmpFontOutlines, this.slurpString, 
                this.pos.x + shiftx, 
                this.pos.y - 24 - i*12, -8, 0, Align.Center);
        }
        canvas.setColor();
    }


    protected updateEvent(event: ProgramEvent) : void {
        
        if (this.waitTimer > 0) {

            this.updateWaiting(event);
            return;
        }
        this.waitActive = false;

        this.control(event);
        this.setHitbox();
        this.animate(event);
        this.updateTimers(event);
        this.updateJumping(event);
        this.updateDust(event);
        this.updateSwimming(event);

        this.updateFlags();
        this.computeSwordHitbox();
    }


    protected slopeCollisionEvent(direction : 1 | -1, event : ProgramEvent) : void {
        
        const LEDGE_TIME : number = 8.0;
        const DOWN_ATTACK_WAIT : number = 15.0;

        if (direction == 1) {

            this.ledgeTimer = LEDGE_TIME;
            this.touchSurface = true;
            this.highJumping = false;

            this.canUseRocketPack = true;
            this.rocketPackActive = false;
            this.rocketPackReleased = false;

            this.jumpTimer = 0;

            if (this.downAttacking) {

                this.downAttackWait = DOWN_ATTACK_WAIT;
            }
            this.downAttacking = false;

            return;
        }
        
        this.jumpTimer = 0;
        this.rocketPackReleased = true;
    }


    protected die(event : ProgramEvent) : boolean {
        
        const ANIMATION_SPEED : number = 3;

        this.deathTimer += event.tick;
        this.sprite.animate(4, 8, 10, ANIMATION_SPEED, event.tick);

        return this.deathTimer >= DEATH_TIME;
    }


    public projectileCollision(p : Projectile, event : ProgramEvent) : boolean {

        if (!this.isActive() || !p.isActive() || p.isFriendly()) {

            return false;
        }   

        if (p.overlayObject(this)) {

            const ppos : Vector = p.getPosition();

            p.kill(event);
            this.applyDamage(p.getPower(), ppos.x >= this.pos.x ? -1 : 1, event);

            return true;
        }
        return false;
    }


    public applyDamage(damage : number, direction : number, event : ProgramEvent) : void {

        if (!this.isActive() || this.hurtTimer > 0) {

            return;
        }

        const KNOCKBACK_SPEED : number = 2.5;

        this.knockbackTimer = KNOCKBACK_TIME;

        const knockbackDirection : number = direction == 0 ? (-this.dir) : direction;
        this.speed.x = knockbackDirection*KNOCKBACK_SPEED;
        if (this.underWater) {

            // Didn't work as intended
            // this.speed.x /= UNDERWATER_FRICTION_MODIFIER;
        }

        this.hurt(damage, event);
    }


    public hurtCollision(x : number, y : number, w : number, h : number,
        event : ProgramEvent, direction : number = 0,  damage : number = 0) : boolean {
        
        if (!this.isActive() || this.hurtTimer > 0) {

            return false;
        }

        if (this.overlayCollisionArea(x - 1, y - 1, w + 2, h + 2)) {

            this.applyDamage(damage, direction, event);
            return true;
        }
        return false;
    }


    public waterCollision(x : number, y : number, w : number, h : number, 
        event : ProgramEvent, surface : boolean = false) : boolean {
        
        if (!this.isActive()) {

            return false;
        }
    
        if (this.overlayCollisionArea(x - 1, y - 1, w + 2, h + 2)) {
            
            this.underWater = true;
            this.touchDeepWater = this.touchDeepWater || (!surface);

            this.ledgeTimer = 1;
            this.canUseRocketPack = true;
            this.rocketPackActive = false;
            this.rocketPackReleased = false;

            return true;
        }
        return false;
    }


    public lavaCollision(y : number, event : ProgramEvent) : boolean {

        if (!this.isActive()) {

            return false;
        }

        if (this.pos.y + this.collisionBox.y + this.collisionBox.h/2 < y) {

            return false;
        }

        this.instantKill(event);

        return true;
    }


    public screenTransitionEvent(x : number, direction : -1 | 1, nextMap : string, event : ProgramEvent) : void {

        const TRIGGER_WIDTH : number = 16;

        if (!this.isActive() || this.knockbackTimer > 0) {

            return;
        }

        if ((direction > 0 && this.speed.x > 0 && this.pos.x + TRIGGER_WIDTH/2 >= x) ||
            (direction < 0 && this.speed.x < 0 && this.pos.x - TRIGGER_WIDTH/2 <= x)   ) {

            event.transition.activate(true, TransitionType.Fade, 1.0/20.0, event,
                (event : ProgramEvent) : void => {

                    this.mapTransition?.(nextMap, 
                        direction > 0 ? 0 : 1, 
                        direction > 0 ? Pose.EnterRight : Pose.EnterLeft, 
                        true, event, true);
                });

            event.audio.pauseMusic();
            event.audio.playSample(event.assets.getSample("transition"), 0.70);
        }
    }


    public draw(canvas : Canvas, assets : Assets): void {
        
        if (!this.exist) {

            return;
        }

        const bmp : Bitmap | undefined = assets.getBitmap("player");

        if (this.dying) {

            this.drawDeath(canvas, bmp);
            return;
        }

        if (this.iconType > 0) {

            const bmpIcon : Bitmap | undefined = assets.getBitmap("icons");

            canvas.setAlpha(0.75);
            this.iconSprite.draw(canvas, bmpIcon, this.pos.x - 8, this.pos.y - 24);
            canvas.setAlpha();
        }

        const flicker : boolean = 
            this.knockbackTimer <= 0 &&
            this.hurtTimer > 0 && 
            Math.floor(this.hurtTimer/4) % 2 != 0;
        if (flicker) {

            // canvas.setColor(255.0, 255.0, 255.0, FLICKER_ALPHA);
            return;
        }

        const px : number = this.pos.x - 12;
        const py : number = this.pos.y - 11;

        const crouchJumpFlicker : boolean = this.stats.hasItem(Item.SpringBoots) &&
            this.isFullyDown() && 
            this.crouchFlickerTimer >= 0.5;
        const chargeFlicker : boolean = this.charging && this.chargeFlickerTimer < 0.5;

        if (crouchJumpFlicker) {

            canvas.applyEffect(Effect.FixedColor);
            canvas.setColor(255, 255, 255);
        }

        if (chargeFlicker) {

            // canvas.applyEffect(Effect.InvertColors);
            canvas.applyEffect(Effect.FixedColor);
            if (this.chargeType == ChargeType.Gun) {

                canvas.setColor(219, 182, 255);
            }
            else {

                canvas.setColor(255, 146, 0);
            }
        }

        if (this.attacking || this.powerAttackTimer > 0) {

            this.drawWeapon(canvas, assets.getBitmap("weapons"));
        }
        this.sprite.draw(canvas, bmp, px, py, this.flip);

        if (crouchJumpFlicker || chargeFlicker) {

            canvas.applyEffect(Effect.None);
            canvas.setColor();
        }

        if (this.downAttacking || this.downAttackWait > 0) {

            this.drawWeapon(canvas, assets.getBitmap("weapons"));
        }

        if (this.shooting && !this.crouching && this.shootWait > 0) {

            this.drawMuzzleFlash(canvas, assets.getBitmap("muzzle_flash"));
        }

        
        // Draws sword hitbox area
        /*
        canvas.setColor(255, 0, 0, 0.5);
        canvas.fillRect(this.swordHitbox.x - this.swordHitbox.w/2, this.swordHitbox.y - this.swordHitbox.h/2, this.swordHitbox.w, this.swordHitbox.h);
        canvas.setColor();
        */
        
    }


    public postDraw(canvas : Canvas, assets : Assets): void {
        
        if (!this.exist) {

            return;
        }
        
        this.drawHoldingItem(canvas, assets);
        this.drawSlurping(canvas, assets);
    }


    public targetCamera(camera : Camera): void {

        camera.followPoint(this.pos);
    }


    public setPosition(x : number, y : number, resetProperties : boolean = false) : void {

        this.pos.x = x;
        this.pos.y = y;
        this.oldPos = this.pos.clone();

        this.speed.zeros();
        this.target.zeros();

        if (!resetProperties) {

            return;
        }

        this.dying = false;
        this.exist = true;

        this.attacking = false;
        this.jumpTimer = 0;
        this.touchSurface = true;
        this.shooting = false;
        this.charging = false;
        this.downAttacking = false;
        this.iconType = 0;
        
        this.downAttackWait = 0;
        this.hurtTimer = 0;
        this.knockbackTimer = 0;
        this.deathTimer = 0;

        this.sprite.setFrame(6, 3);
        this.flip = Flip.None;
        this.dir = 1;
    }


    public getAttackID = () : number => this.attackID;

    
    public overlaySwordAttackArea(o : GameObject) : boolean {

        if (!this.swordHitBoxActive ||
            (this.attacking && this.sprite.getColumn() >= 6)) {

            return false;
        }
        return o.overlayRect(new Vector(), this.swordHitbox);
    } 


    public bounce(amount : number) : void {
        
        this.speed.y = amount;
        this.downAttacking = false;

        this.swordHitBoxActive = false;

        this.canUseRocketPack = true;
        this.rocketPackReleased = false;
        this.rocketPackActive = false;
    }


    public performDownAttackJump() : boolean {

        const JUMP_SPEED : number = -3.0;

        if (!this.downAttacking || this.downAttackWait > 0) {

            return false;
        }
        this.bounce(JUMP_SPEED);
        this.highJumping = true;

        return true;
    }


    public getAttackPower() : number {

        const SECOND_ATTACK_BONUS : number = 1;

        if (this.downAttacking && this.downAttackWait <= 0) {

            return this.stats.getDownAttackPower();
        }
        if (this.powerAttackTimer > 0) {

            return this.stats.getChargeAttackPower();
        }

        let attackBonus : number = 0;
        if (this.attackNumber == 1) {

            attackBonus = SECOND_ATTACK_BONUS;
        }

        return this.stats.getAttackPower() + attackBonus;
    }


    public stopPowerAttack() : void {

        if (this.powerAttackTimer <= 0) {

            return;
        }

        this.powerAttackStopped = true;

        this.target.zeros();
        this.powerAttackTimer = Math.min(POWER_ATTACK_HALT_TIME, this.powerAttackTimer);
    }


    public instantKill(event : ProgramEvent) : void {
        
        this.stats.updateHealth(-this.stats.getHealth());
        this.initializeDeath(event);
    }


    public showIcon(type : number = 0) : void {

        this.iconType = type;
    }


    public setCheckpointObject(o : GameObject | undefined, shift : Vector = new Vector()) : void {

        this.checkpointObject = o;
        
        this.stats.setCheckpointPosition(Vector.add(o.getPosition(), shift));
    }


    public isCheckpointObject = (o : GameObject | undefined) : boolean => this.checkpointObject === o;
    

    public startWaiting(time : number, 
        type : WaitType = WaitType.Unknown, 
        waitParam : number = 0,
        event? : (event : ProgramEvent) => void) : void {

        this.waitActive = true;

        this.waitTimer = time;
        this.initialWaitTimer = time;

        this.waitType = type;
        this.waitParameter = waitParam ?? 0;
        this.waitCeaseEvent = event;

        this.hurtTimer = 0;
        this.charging = false;
        this.crouching = false;
        this.crouchFlickerTimer = 0;

        switch (type) {

        case WaitType.HoldingItem:

            this.sprite.setFrame(7, 3);
            break;

        case WaitType.ToggleLever:

            this.sprite.setFrame(8, 5);
            break;

        case WaitType.Licking:

            this.sprite.setFrame(10, 5);
            break;

        default:
            break;
        }
    }


    public isWaiting = () : boolean => this.waitTimer > 0;
    public isChargeAttacking = () : boolean => this.powerAttackTimer > 0;
    public isOrdinarilyAttacking = () : boolean => this.attacking && 
        this.powerAttackTimer <= 0 && 
        !this.downAttacking;
    // TODO: I guess down attack is not attacking, then?
    public isAttacking = () : boolean => this.attacking || this.shooting || this.powerAttackTimer > 0;


    public getKnockbackFactor() : number {

        if (this.powerAttackTimer > 0) {

            return 1.5;
        }
        if (this.downAttacking) {

            return 0.0;
        }

        if (!this.attacking) {

            return 0.0;
        }

        return 1.0 + this.attackNumber*0.25;
    }       


    public setPose(pose : Pose) {

        switch (pose) {

        case Pose.Sit:

            this.sprite.setFrame(0, 5);
            this.flip = Flip.None;
            break;

        case Pose.EnterLeft:

            this.sprite.setFrame(0, 0);
            this.flip = Flip.Horizontal;
            break;

        case Pose.EnterRight:

            this.sprite.setFrame(0, 0);
            this.flip = Flip.None;
            break;

        case Pose.UseDoor:

            this.sprite.setFrame(8, 5);
            this.flip = Flip.None;
            break;

        case Pose.EnterRoom:

            this.sprite.setFrame(9, 5);
            this.flip = Flip.None;
            break;

        default:
            break;
        }

        this.touchSurface = true;
        this.attacking = false;
        this.powerAttackTimer = 0;
        this.downAttacking = false;
        this.downAttackWait = 0;
    }


    public startHarmlessKnockback(time : number) : void {

        this.knockbackTimer = time;
        this.hurtTimer = HURT_TIME;
        this.speed.zeros();
    }


    public alterSpeed(deltax : number, deltay : number, 
        minx : number, maxx : number,
        miny : number, maxy : number) : void {

        this.speed.x = clamp(this.speed.x + deltax, minx, maxx);
        this.speed.y = clamp(this.speed.y + deltay, miny, maxy);

        this.downAttacking = false;
        this.downAttackWait = 0;
    }
}

