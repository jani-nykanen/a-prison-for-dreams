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
import { ParticleGenerator } from "./particlegenerator.js";
import { AnimatedParticle } from "./animatedparticle.js";


const GRAVITY_MAGNITUDE : number = 5.0;

const SHOOT_RELEASE_TIME : number = 20;
const SHOOT_BASE_TIME : number = 20;
const SHOOT_WAIT_TIME : number = 10.0;

const HURT_TIME : number = 60;
const KNOCKBACK_TIME : number = 20;


export class Player extends CollisionObject {


    private jumpTimer : number = 0.0;
    private ledgeTimer : number = 0.0;
    private touchSurface : boolean = true;
    // TODO: Maybe add "JumpType" enum instead?
    private highJumping : boolean = false;

    private shooting : boolean = false;
    private shootTimer : number = 0.0;
    private shootWait : number = 0.0;
    private flashType : number = 0;

    private chargingGun : boolean = false;
    private chargeFlickerTimer : number = 0;

    private hurtTimer : number = 0.0;
    private knockbackTimer : number = 0.0;

    private crouching : boolean = false;
    private crouchFlickerTimer : number = 0;

    private attacking : boolean = false;

    private faceDir : -1 | 1 = 1;
    private sprite : Sprite;
    private flip : Flip;

    private dustTimer : number = 0;

    private readonly projectiles : ProjectileGenerator;
    private readonly particles : ParticleGenerator<AnimatedParticle>;


    constructor(x : number, y : number, 
        projectiles : ProjectileGenerator,
        particles : ParticleGenerator<AnimatedParticle>) {

        super(x, y, true);

        this.friction = new Vector(0.15, 0.125);

        this.inCamera = true;

        this.collisionBox = new Rectangle(0, 2, 10, 12);
        this.hitbox = new Rectangle(0, 0, 16, 16);

        this.sprite = new Sprite(24, 24);

        this.projectiles = projectiles;
        this.particles = particles;
    }


    private isFullyDown = () : boolean => this.crouching && 
        this.sprite.getRow() == 3 &&
        this.sprite.getColumn() == 5;


    private computeFaceDirection(event : ProgramEvent) : void {

        const STICK_THRESHOLD : number = 0.01;

        if (this.attacking) {

            return;
        }

        const stick : Vector = event.input.stick;
        if (Math.abs(stick.x) > STICK_THRESHOLD) {

            this.faceDir = stick.x > 0 ? 1 : -1;
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

            this.chargingGun = false;

            this.sprite.setFrame(3, 3);
            this.crouchFlickerTimer = 0;
        }
    }


    private updateBaseMovement(event : ProgramEvent) : void {

        const RUN_SPEED : number = 1.0;

        const SLOWDOWN_FACTOR : number = 0.10;
        const SPEEDUP_FACTOR : number = 0.20;

        const baseFactor : number = this.touchSurface ? -this.faceDir*this.steepnessFactor : 0.0;
        const speedFactor : number = baseFactor < 0 ? SLOWDOWN_FACTOR : SPEEDUP_FACTOR;

        const stick : Vector = event.input.stick;

        this.target.y = GRAVITY_MAGNITUDE;
        if (this.crouching) {

            this.target.x = 0.0;
            return;
        }

        this.target.x = stick.x*(1.0 - baseFactor*speedFactor)*RUN_SPEED;
    }


    private controlJumping(event : ProgramEvent) : void {

        const JUMP_TIME_BASE : number = 13.0;
        const JUMP_TIME_HIGH : number = 13.0;

        if (this.attacking) {

            return;
        }

        const jumpButton : InputState = event.input.getAction("jump");

        if (jumpButton == InputState.Pressed) {

            if (this.ledgeTimer > 0) {

                this.highJumping = this.isFullyDown();

                this.jumpTimer = this.highJumping ? JUMP_TIME_HIGH : JUMP_TIME_BASE;
                this.ledgeTimer = 0.0;

                this.crouching = false;
            }
        }
        else if ((jumpButton & InputState.DownOrPressed) == 0) {

            this.jumpTimer = 0;
            // this.highJumping = false;
        }
    }


    private shootBullet(type : number, event : ProgramEvent) : void {

        const BULLET_SPEED : number[] = [4.0, 2.5];

        const BULLET_YOFF : number = 3;
        const BULLET_XOFF : number = 8;

        const BULLET_SPEED_FACTOR_X : number = 0.5;
        const BULLET_SPEED_FACTOR_Y : number = 0.0; // Makes collisions work better...

        const dx = this.pos.x + BULLET_XOFF*this.faceDir;
        const dy = this.pos.y + BULLET_YOFF;

        this.projectiles.spawn(
            this.pos.x, dy, dx, dy, 
            this.speed.x*BULLET_SPEED_FACTOR_X + (BULLET_SPEED[type] ?? 0)*this.faceDir, 
            -this.speed.y*BULLET_SPEED_FACTOR_Y, 
            type, true);
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
            this.chargingGun && (shootButton & InputState.DownOrPressed) == 0) {

            this.shooting = true;
            this.shootTimer = SHOOT_BASE_TIME + SHOOT_RELEASE_TIME;
            this.shootWait = SHOOT_WAIT_TIME;
           
            this.flashType = this.chargingGun ? 1 : 0;

            this.sprite.setFrame(this.sprite.getColumn(), 2 + (this.sprite.getRow() % 2), true);

            this.shootBullet(this.flashType, event);

            this.chargingGun = false;
            this.chargeFlickerTimer = 0.0;
        }
    }


    private controlAttacking(event : ProgramEvent) : void {

        if (this.attacking) {

            return;
        }

        const attackButton : InputState = event.input.getAction("attack");
        if (attackButton == InputState.Pressed) {

            this.attacking = true;
            // this.attackDir = this.faceDir;

            this.crouching = false;
            this.shooting = false;
            this.chargingGun = false;

            this.sprite.setFrame(3, 1);
        }

        // TODO: Charge attack?
    }


    private control(event : ProgramEvent) : void {

        if (this.knockbackTimer > 0 ||
            (this.attacking && this.touchSurface)) {

            this.target.x = 0.0;
            this.target.y = GRAVITY_MAGNITUDE;
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

        this.sprite.animate(1, 3, LAST_FRAME, 
            this.sprite.getColumn() == LAST_FRAME - 1 ? BASE_ATTACK_SPEED*2 : BASE_ATTACK_SPEED, 
            event.tick);
        if (this.sprite.getColumn() == LAST_FRAME) {

            this.attacking = false;
            this.sprite.setFrame(0, 0);
        }
    }   

    
    private animate(event : ProgramEvent) : void {

        this.flip = this.faceDir > 0 ? Flip.None : Flip.Horizontal;

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
        if (!this.touchSurface) {

            this.animateJumping(rowModifier, event);
            return;
        }
        this.animateRunningAndStanding(rowModifier, event);
    }


    private updateJumping(event : ProgramEvent) : void {

        const JUMP_SPEED_BASE : number = -2.25;
        const JUMP_SPEED_HIGH : number = -3.0;
        const MAX_HIGH_JUMP_SPEED : number = 1.0;

        if (this.highJumping && this.speed.y > MAX_HIGH_JUMP_SPEED) {

            this.highJumping = false;
        }

        if (this.jumpTimer <= 0) {
            
            return;
        }

        this.speed.y = this.highJumping ? JUMP_SPEED_HIGH : JUMP_SPEED_BASE;
        this.target.y = this.speed.y;
        
        this.jumpTimer -= event.tick;
    }


    private updateShootTimers(event : ProgramEvent) : void {

        if (this.shootTimer > 0) {

            const shootButton : InputState = event.input.getAction("shoot");

            this.shootTimer -= event.tick;
            if (this.shootTimer <= 0 || 
                (this.shootTimer <= SHOOT_RELEASE_TIME && (shootButton & InputState.DownOrPressed) == 0)) {

                this.shooting = false;
                if (this.shootTimer <= 0) {
                    
                    this.chargingGun = true;
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
        }
        else if (this.hurtTimer > 0) {

            this.hurtTimer -= event.tick;
        }

        if (this.isFullyDown()) {

            this.crouchFlickerTimer = (this.crouchFlickerTimer + CROUCH_FLICKER_SPEED*event.tick) % 1.0;
        }

        if (this.chargingGun) {

            this.chargeFlickerTimer = (this.chargeFlickerTimer + CHARGE_FLICKER_SPEED*event.tick) % 1.0;
        }
    }


    private updateFlags() : void {

        this.touchSurface = false;

        // Ignore the bottom layer slopes if dashing.
        // this.ignoreBottomLayer = this.dashWait <= 0 && this.dashing;
    }


    private updateDust(event : ProgramEvent) : void {

        const X_OFFSET : number = -4;
        const Y_OFFSET : number = 7;
        const DUST_TIME : number = 10.0;
        const MIN_SPEED : number = 0.1;

        if (this.knockbackTimer <= 0 &&
            this.touchSurface && 
            Math.abs(this.speed.x) > MIN_SPEED) {

            this.dustTimer -= event.tick;
        }

        if (this.dustTimer <= 0) {

            this.particles.spawn(
                this.pos.x + X_OFFSET*this.faceDir,
                this.pos.y + Y_OFFSET,
                0.0, 0.0, 0, Flip.None);
            this.dustTimer = DUST_TIME;
        }
    } 


    private hurt(damage : number, event : ProgramEvent) : void {

        this.shooting = false;
        this.shootTimer = 0;
        this.jumpTimer = 0;
        this.chargingGun = false;
        this.attacking = false;

        this.hurtTimer = HURT_TIME;
    }


    private overlayCollisionArea(x : number, y : number, w : number, h : number) : boolean {

        return this.pos.x + this.collisionBox.x + this.collisionBox.w/2 >= x &&
               this.pos.x + this.collisionBox.x - this.collisionBox.w/2 <= x + w && 
               this.pos.y + this.collisionBox.y + this.collisionBox.h/2 >= y &&
               this.pos.y + this.collisionBox.y - this.collisionBox.h/2 <= y + h;
    }


    private drawMuzzleFlash(canvas : Canvas, bmp : Bitmap | undefined) : void {

        const X_OFFSET : number = 10;
        const Y_OFFSET : number = 3;

        const frame : number = Math.floor((1.0 - this.shootWait/SHOOT_WAIT_TIME)*4);

        const dx : number = this.pos.x + this.faceDir*X_OFFSET - 8;
        const dy : number = this.pos.y + Y_OFFSET - 8;

        canvas.drawBitmap(bmp, this.flip, dx, dy, frame*16, this.flashType*16, 16, 16);
    }


    private drawWeapon(canvas : Canvas, bmp : Bitmap | undefined) : void {

        const frame : number = this.sprite.getColumn() - 3;

        canvas.drawBitmap(bmp, this.flip, this.pos.x - 16 + this.faceDir*10, this.pos.y - 14, frame*32, 0, 32, 32);
    }


    protected updateEvent(event: ProgramEvent) : void {
        
        this.control(event);
        this.animate(event);
        this.updateTimers(event);
        this.updateJumping(event);
        this.updateDust(event);

        this.updateFlags();
    }


    protected slopeCollisionEvent(direction : 1 | -1, event : ProgramEvent) : void {
        
        const LEDGE_TIME : number = 8.0;

        if (direction == 1) {

            this.ledgeTimer = LEDGE_TIME;
            this.touchSurface = true;
            this.highJumping = false;

            return;
        }
        
        this.jumpTimer = 0;
    }


    public projectileCollision(p : Projectile, event : ProgramEvent) : boolean {

        return false;
    }


    public hurtCollision(x : number, y : number, w : number, h : number,
        event : ProgramEvent, direction : -1 | 0 | 1 = 0,  damage : number = 0) : boolean {
        
        const KNOCKBACK_SPEED : number = 2.5;

        if (!this.isActive() || this.hurtTimer > 0) {

            return false;
        }

        if (this.overlayCollisionArea(x - 1, y - 1, w + 2, h + 2)) {

            this.knockbackTimer = KNOCKBACK_TIME;

            const knockbackDirection : number = direction == 0 ? (-this.faceDir) : direction;
            this.speed.x = knockbackDirection*KNOCKBACK_SPEED;

            this.hurt(damage, event);

            return true;
        }
        return false;
    }


    public draw(canvas : Canvas, assets : Assets): void {
        
        const FLICKER_ALPHA : number = 0.25;

        const px : number = this.pos.x - 12;
        const py : number = this.pos.y - 11;

        const flicker : boolean = this.knockbackTimer <= 0 &&
             this.hurtTimer > 0 && 
             Math.floor(this.hurtTimer/4) % 2 != 0;

        const crouchJumpFlicker : boolean = (this.isFullyDown() && this.crouchFlickerTimer >= 0.5);
        const chargeFlicker : boolean = this.chargingGun && this.chargeFlickerTimer < 0.5;

        if (flicker) {

            canvas.setColor(255.0, 255.0, 255.0, FLICKER_ALPHA);
        }

        if (crouchJumpFlicker) {

            canvas.applyEffect(Effect.FixedColor);
            canvas.setColor(255, 255, 255);
        }

        if (chargeFlicker) {

            canvas.applyEffect(Effect.InvertColors);
        }

        if (this.attacking) {

            this.drawWeapon(canvas, assets.getBitmap("weapons"));
        }

        const bmp : Bitmap | undefined = assets.getBitmap("player");
        this.sprite.draw(canvas, bmp, px, py, this.flip);

        if (flicker) {

            canvas.setColor();
        }

        if (crouchJumpFlicker || chargeFlicker) {

            canvas.applyEffect(Effect.None);
        }

        if (this.shooting && !this.crouching && this.shootWait > 0) {

            this.drawMuzzleFlash(canvas, assets.getBitmap("muzzle_flash"));
        }
    }


    public targetCamera(camera : Camera): void {

        camera.followPoint(this.pos);
    }


    public setPosition(x : number, y : number) : void {

        this.pos.x = x;
        this.pos.y = y;
    }
}

