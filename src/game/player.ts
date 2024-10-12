import { CollisionObject } from "./collisionobject.js";
import { Vector } from "../math/vector.js";
import { Rectangle } from "../math/rectangle.js";
import { ProgramEvent } from "../core/event.js";
import { Camera } from "./camera.js";
import { Bitmap, Canvas, Effect, Flip } from "../gfx/interface.js";
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


const GRAVITY_MAGNITUDE : number = 5.0;
const UNDERWATER_GRAVITY : number = 0.75;

const SHOOT_RELEASE_TIME : number = 20;
const SHOOT_BASE_TIME : number = 20;
const SHOOT_WAIT_TIME : number = 10.0;

const HURT_TIME : number = 60;
const KNOCKBACK_TIME : number = 20;
const DEATH_TIME : number = 60;

const POWER_ATTACK_TIME : number = 20;
const POWER_ATTACK_HALT_TIME : number = 10;


const enum ChargeType {

    None = 0,
    Sword = 1,
    Gun = 2,
};


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

    private attackID : number = 0;
    private attacking : boolean = false;
    private downAttacking : boolean = false;
    private downAttackWait : number = 0;
    private powerAttackTimer : number = 0;
    private powerAttackStopped : boolean = false;
    private swordHitbox : Rectangle;
    private swordHitBoxActive : boolean = false;

    private sprite : Sprite;
    private flip : Flip;

    private dustTimer : number = 0;
    private deathTimer : number = 0;

    private iconType : number = 0;
    private iconSprite : Sprite;

    private checkpointObject : GameObject | undefined = undefined;

    private readonly projectiles : ProjectileGenerator;
    private readonly particles : ObjectGenerator<AnimatedParticle, void>;
    private readonly flyingText : ObjectGenerator<FlyingText, void>;

    public readonly stats : Progress;


    constructor(x : number, y : number, 
        projectiles : ProjectileGenerator,
        particles : ObjectGenerator<AnimatedParticle, void>,
        flyingText : ObjectGenerator<FlyingText, void>,
        stats : Progress) {

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
    }


    private getGravity = () : number => this.underWater ? UNDERWATER_GRAVITY : GRAVITY_MAGNITUDE;


    private isFullyDown = () : boolean => this.crouching && 
        this.sprite.getRow() == 3 &&
        this.sprite.getColumn() == 5;


    private computeSwordHitbox() : void {

        const SWORD_OFFSET_X : number = 16;
        const SWORD_OFFSET_Y : number = 2;

        const SWORD_ATTACK_BASE_WIDTH : number = 14;
        const SWORD_ATTACK_BASE_HEIGHT : number = 20;

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

        this.swordHitbox.w = this.powerAttackTimer > 0 ? SWORD_ATTACK_SPECIAL_WIDTH : SWORD_ATTACK_BASE_WIDTH;
        this.swordHitbox.h = this.powerAttackTimer > 0 ? SWORD_ATTACK_SPECIAL_HEIGHT : SWORD_ATTACK_BASE_HEIGHT;

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

        this.crouching = this.touchSurface && event.input.stick.y > THRESHOLD;
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
        this.target.x = stick.x*this.computeSlopeSpeedFactor()*speedx;
    }


    private controlJumping(event : ProgramEvent) : void {

        const JUMP_TIME_BASE : number = 13.0;
        const JUMP_TIME_HIGH : number = 13.0;
        const ROCKET_PACK_JUMP : number = 45;
        const MINIMUM_ROCKET_JUMP_SPEED : number = 1.5;

        if (this.attacking) {

            return;
        }

        const jumpButton : InputState = event.input.getAction("jump");
        if (jumpButton == InputState.Pressed && !this.highJumping) {

            if (this.ledgeTimer > 0 || this.underWater) {

                this.highJumping = this.isFullyDown();

                this.jumpTimer = this.highJumping ? JUMP_TIME_HIGH : JUMP_TIME_BASE;
                this.ledgeTimer = 0.0;

                this.crouching = false;
            }
            else if (this.canUseRocketPack) {

                this.canUseRocketPack = false;

                this.rocketPackReleased = false;
                this.rocketPackActive = true;

                this.jumpTimer = ROCKET_PACK_JUMP;

                this.speed.y = Math.min(MINIMUM_ROCKET_JUMP_SPEED, this.speed.y);
            }
            else if (this.rocketPackReleased) {

                this.jumpTimer = 0;
                this.rocketPackActive = true;
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

            // TODO: Play error sound
            return;
        }

        const dx : number = this.pos.x + BULLET_XOFF*this.dir;
        const dy : number = this.pos.y + BULLET_YOFF;

        const power : number = type == 1 ? this.stats.getChargeProjectilePower() : this.stats.getProjectilePower();

        this.projectiles.next(this.stats).spawn(
            this.pos.x, dy, dx, dy, 
            this.speed.x*BULLET_SPEED_FACTOR_X + (BULLET_SPEED[type] ?? 0)*this.dir, 
            this.speed.y*BULLET_SPEED_FACTOR_Y, 
            type, power, true, this.attackID);
        if (type == 1) {

            ++ this.attackID;
        }

        this.stats.updateBulletCount(-1);
    }


    private controlShooting(event : ProgramEvent) : void {

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


    private controlAttacking(event : ProgramEvent) : void {

        const DOWN_ATTACK_JUMP : number = -2.0;
        const DOWN_ATTACK_STICK_Y_THRESHOLD : number = 0.50;
        const FORWARD_SPEED : number = 1.5;
        
        const attackButton : InputState = event.input.getAction("attack");
        if (this.charging && this.chargeType == ChargeType.Sword && 
            (attackButton & InputState.DownOrPressed) == 0) {

            this.jumpTimer = 0;

            this.powerAttackTimer = POWER_ATTACK_TIME;
            this.powerAttackStopped = false;
            this.charging = false;

            this.speed.zeros();
            
            ++ this.attackID;

            return;
        }

        if (this.attacking || this.highJumping) {

            return;
        }
        
        if (attackButton == InputState.Pressed) {

            if (!this.touchSurface && 
                event.input.stick.y >= DOWN_ATTACK_STICK_Y_THRESHOLD) {

                ++ this.attackID;

                this.attacking = false; // Possibly unnecessary
                this.downAttacking = true;
                this.rocketPackActive = false;
                this.speed.y = DOWN_ATTACK_JUMP;
                return;
            }

            if (this.touchSurface) {

                this.speed.x = this.dir*FORWARD_SPEED;
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
        }

        // TODO: Charge attack?
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

        this.friction.x = 0.15;
        this.friction.y = 0.125;
        if (this.underWater) {

            this.friction.x /= 2.0;
            this.friction.y /= 2.0;
        }
/*
        if (this.powerAttackTimer > 0 && this.powerAttackStopped) {

            this.friction.x = 0.025;
        }
*/
    }


    private updateWaterMovement(event : ProgramEvent) : void {

        if ( this.speed.y > UNDERWATER_GRAVITY) {

            this.speed.y = UNDERWATER_GRAVITY;
            // TODO: Splash sound?
        }
    }


    private control(event : ProgramEvent) : void {

        this.setFriction();

        if (this.underWater) {
            
            this.updateWaterMovement(event);
        }

        if (this.knockbackTimer > 0 ||
            (this.attacking && this.touchSurface)) {

            this.target.x = 0.0;
            this.target.y = this.getGravity();
            return;
        }

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
        }
    }


    private animateAttacking(event : ProgramEvent) : void {

        const BASE_ATTACK_SPEED : number = 4;
        const LAST_FRAME : number = 8;
        const LAST_FRAME_LENGTH : number = 16;
        const LAST_FRAME_RELEASE = 8;

        this.sprite.animate(1, 3, LAST_FRAME, 
            this.sprite.getColumn() == LAST_FRAME - 1 ? LAST_FRAME_LENGTH : BASE_ATTACK_SPEED, 
            event.tick);

        const buttonReleased : boolean = (event.input.getAction("attack") & InputState.DownOrPressed) == 0;

        if (this.sprite.getColumn() == LAST_FRAME ||
            (buttonReleased &&
            this.sprite.getColumn() == LAST_FRAME - 1 &&
            this.sprite.getFrameTime() >= LAST_FRAME_RELEASE)) {

            if (this.sprite.getColumn() == LAST_FRAME) {

                this.charging = !buttonReleased;
                this.chargeType = ChargeType.Sword;
            }

            this.attacking = false;
            this.sprite.setFrame(0, 0);
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
        this.jumpTimer -= event.tick;

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
                if (this.shootTimer <= 0) {

                    this.chargeType = ChargeType.Gun;
                    this.charging = true;
                    // TODO: Sound effect
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

        if (this.isFullyDown()) {

            this.crouchFlickerTimer = (this.crouchFlickerTimer + CROUCH_FLICKER_SPEED*event.tick) % 1.0;
        }

        if (this.charging) {

            this.chargeFlickerTimer = (this.chargeFlickerTimer + CHARGE_FLICKER_SPEED*event.tick) % 1.0;
        }
    }


    private updateFlags() : void {

        this.touchSurface = false;
        this.underWater = false;
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
        this.rocketPackActive = false;
        this.powerAttackTimer = 0;

        this.hurtTimer = HURT_TIME;

        damage = -this.stats.updateHealth(-damage);
        this.flyingText?.next()
            .spawn(this.pos.x, this.pos.y - 8, 
                -damage, FlyingTextSymbol.None, new RGBA(255, 73, 0));
    }


    private initializeDeath(event : ProgramEvent) : void {

        this.dying = true;
        this.sprite.setFrame(4, 8);
        
        // TODO: Sound effects
    }


    private drawMuzzleFlash(canvas : Canvas, bmp : Bitmap | undefined) : void {

        const X_OFFSET : number = 10;
        const Y_OFFSET : number = 3;

        const frame : number = Math.floor((1.0 - this.shootWait/SHOOT_WAIT_TIME)*4);

        const dx : number = this.pos.x + this.dir*X_OFFSET - 8;
        const dy : number = this.pos.y + Y_OFFSET - 8;

        canvas.drawBitmap(bmp, this.flip, dx, dy, frame*16, this.flashType*16, 16, 16);
    }


    private drawWeapon(canvas : Canvas, bmp : Bitmap | undefined) : void {

        const dx : number = this.pos.x - 16 + this.dir*10;
        const dy : number = this.pos.y - 14;

        let frame : number = this.attacking ? this.sprite.getColumn() - 3 : 5;
        let row : number = 0;
        if (this.powerAttackTimer > 0) {

            frame = Math.floor(this.powerAttackTimer/4) % 4;
            row = 1;
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

        for (let i = 0; i < ORB_COUNT; ++ i) {

            const angle : number = step*i;

            this.sprite.draw(canvas, bmp,
                dx + Math.round(Math.cos(angle)*t*ORB_DISTANCE) - 12,
                dy + Math.round(Math.sin(angle)*t*ORB_DISTANCE) - 12);
        }
    }


    protected updateEvent(event: ProgramEvent) : void {
        
        this.control(event);
        this.animate(event);
        this.updateTimers(event);
        this.updateJumping(event);
        this.updateDust(event);

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
        
        if (!this.isActive() || this.hurtTimer > 0) {

            return false;
        }
    
        if (this.overlayCollisionArea(x - 1, y - 1, w + 2, h + 2)) {
            
            this.underWater = true;
            this.ledgeTimer = 1;
            this.canUseRocketPack = true;
            this.rocketPackActive = false;
            this.rocketPackReleased = false;
            return true;
        }
        return false;
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

        const crouchJumpFlicker : boolean = (this.isFullyDown() && this.crouchFlickerTimer >= 0.5);
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


    public performDownAttackJump() : boolean {

        const JUMP_SPEED : number = -3.0;

        if (!this.downAttacking || this.downAttackWait > 0) {

            return false;
        }

        this.speed.y = JUMP_SPEED;
        this.downAttacking = false;

        this.swordHitBoxActive = false;

        this.canUseRocketPack = true;
        this.rocketPackReleased = false;
        this.rocketPackActive = false;

        return true;
    }


    public isChargeAttacking = () : boolean => this.powerAttackTimer > 0;


    public getAttackPower() : number {

        if (this.downAttacking && this.downAttackWait <= 0) {

            return this.stats.getDownAttackPower();
        }
        if (this.powerAttackTimer > 0) {

            return this.stats.getChargeAttackPower();
        }
        return this.stats.getAttackPower();
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
}

