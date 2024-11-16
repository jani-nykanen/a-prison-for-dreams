import { Assets } from "../../core/assets.js";
import { Canvas, Bitmap, Flip } from "../../gfx/interface.js";
import { CollisionObject } from "../collisionobject.js"
import { Sprite } from "../../gfx/sprite.js";
import { Vector } from "../../math/vector.js";
import { Rectangle } from "../../math/rectangle.js";
import { ProgramEvent } from "../../core/event.js";
import { Player } from "../player.js";
import { Projectile } from "../projectile.js";
import { ObjectGenerator } from "../objectgenerator.js";
import { FlyingText, FlyingTextSymbol } from "../flyingtext.js";
import { RGBA } from "../../math/rgba.js";
import { CollectableGenerator, sampleTypeFromProgress } from "../collectablegenerator.js";
import { CollectableType } from "../collectable.js";
import { Progress } from "../progress.js";
import { ProjectileGenerator } from "../projectilegenerator.js";
import { sampleWeightedUniform } from "../../math/random.js";


const HURT_TIME : number = 30;

const COIN_TYPE_LOOKUP : CollectableType[] = [CollectableType.Coin, CollectableType.Gem, CollectableType.CoinBag];


export const BASE_GRAVITY : number = 5.0;


export class Enemy extends CollisionObject {


    private hurtID : number = -1;
    private underWater : boolean = false;
   
    private flyingText : ObjectGenerator<FlyingText, void> | undefined = undefined;
    private collectables : CollectableGenerator | undefined = undefined;
    
    protected hurtTimer : number = 0;

    protected initialPos : Vector;

    protected sprite : Sprite;
    protected flip : Flip = Flip.None;

    protected attackPower : number = 1;
    protected health : number = 5;

    protected dropProbability : number = 0.5;
    protected coinTypeWeights : number[];

    protected canBeMoved : boolean = true;
    protected canBeHurt : boolean = true;
    protected radius : number = 6;

    protected didTouchSurface : boolean = false;

    protected knockbackFactor : number = 1.0;

    protected projectiles : ProjectileGenerator | undefined = undefined;


    constructor(x : number, y : number) {

        super(x, y, true);

        this.initialPos = this.pos.clone();
    
        this.sprite = new Sprite(24, 24);

        this.cameraCheckArea = new Vector(32, 32);

        this.collisionBox = new Rectangle(0, 1, 12, 12);
        this.hitbox = new Rectangle(0, 1, 12, 12);

        this.target.y = BASE_GRAVITY;

        this.friction = new Vector(0.10, 0.15);

        this.coinTypeWeights = [1.0, 0.0, 0.0];
    }


    private spawnCollectables(dir : Vector, stats : Progress) : void {

        const LAUNCH_SPEED_X : number = 1.0;
        const LAUNCH_SPEED_Y : number = 2.0;
        const BASE_JUMP : number = -1.0;

        let baseType : CollectableType = sampleTypeFromProgress(stats);
        if (baseType == CollectableType.Coin) {

            baseType = COIN_TYPE_LOOKUP[sampleWeightedUniform(this.coinTypeWeights)] ?? CollectableType.Coin;
        }

        this.collectables.spawn(this.pos.x, this.pos.y, 
            dir.x*LAUNCH_SPEED_X, dir.y*LAUNCH_SPEED_Y + BASE_JUMP, 
            baseType);
    }


    private takeDamage(amount : number, stats : Progress | undefined,
        event : ProgramEvent, dir? : Vector) : void {

        if (!this.canBeHurt) {

            return;
        }

        this.flyingText?.next()
            .spawn(this.pos.x, this.pos.y - 8, 
                -amount, FlyingTextSymbol.None);

        this.health -= amount;
        if (this.health <= 0) {

            if (stats !== undefined && Math.random() < this.dropProbability) {
            
                this.spawnCollectables(dir ?? new Vector(), stats);
            }

            event.audio.playSample(event.assets.getSample("kill"), 0.60);

            this.dying = true;
            this.sprite.setFrame(0, 0);
            return;
        }

        event.audio.playSample(event.assets.getSample("hit"), 0.70);
        this.hurtTimer = HURT_TIME;
    }


    protected updateLogic?(event : ProgramEvent) : void;
    protected playerEvent?(player : Player, event : ProgramEvent) : void;
    protected enemyCollisionEvent?(enemy : Enemy, event : ProgramEvent) : void;


    protected die(event: ProgramEvent): boolean {
        
        const ANIMATION_SPEED : number = 5;

        this.flip = Flip.None;
        this.sprite.animate(0, 0, 4, ANIMATION_SPEED, event.tick);
        return this.sprite.getColumn() >= 4;
    }


    protected slopeCollisionEvent(direction : -1 | 1, event:  ProgramEvent) : void {
        
        if (direction == 1) {
        
            this.touchSurface = true;
        }
    }


    public waterCollision(x : number, y : number, w : number, h : number, 
        event : ProgramEvent, surface : boolean = false) : boolean {
        
        if (!this.isActive()) {

            return false;
        }
    
        if (this.overlayCollisionArea(x - 1, y - 1, w + 2, h + 2)) {
            
            this.underWater = true;
            return true;
        }
        return false;
    }


    protected updateEvent(event : ProgramEvent) : void {
            
        const UNDERWATER_GRAVITY : number = 0.75;

        this.updateLogic?.(event);
        if (this.underWater) {

            this.target.y = Math.min(this.target.y, UNDERWATER_GRAVITY);
            this.speed.y = Math.min(this.speed.y, UNDERWATER_GRAVITY);
        }

        if (this.hurtTimer > 0) {

            this.hurtTimer -= event.tick;
        }

        this.didTouchSurface = this.touchSurface;
        this.touchSurface = false;
        this.underWater = false;
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

        this.sprite.draw(canvas, bmp, dx, dy, this.flip);
    }


    public playerCollision(player : Player, event : ProgramEvent) : void {

        const KNOCKBACK_SPEED : number = 1.5;
        const POWER_ATTACK_PICKUP_SPEED_FACTOR : number = 1.5;

        if (!this.isActive() || !player.isActive()) {

            return;
        }

        this.playerEvent?.(player, event);

        const attackID : number = player.getAttackID();
        if (this.hurtID != attackID && player.overlaySwordAttackArea(this)) {
           
            const ppos : Vector = player.getPosition();
            const dir : Vector = Vector.direction(ppos, this.pos);

            let knockback : number = KNOCKBACK_SPEED*this.knockbackFactor*player.getKnockbackFactor();
            if (player.isChargeAttacking()) {

                // knockback *= POWER_ATTACK_KNOCK_MULTIPLIER;

                dir.x *= POWER_ATTACK_PICKUP_SPEED_FACTOR;
                dir.y *= POWER_ATTACK_PICKUP_SPEED_FACTOR;
            }
            this.hurtID = attackID;
            this.takeDamage(player.getAttackPower(), player.stats, event, dir);
            if (!this.dying) {
                
                player.stopPowerAttack();
            }

            if (player.performDownAttackJump()) {

                return;
            }

            if (this.canBeHurt) {

                this.speed.x = Math.sign(this.pos.x - ppos.x)*knockback;
            }
        }

        if (this.overlayObject(player)) {

            player.applyDamage(this.attackPower, Math.sign(player.getPosition().x - this.pos.x), event);
        }
    }


    public projectileCollision(p : Projectile, event : ProgramEvent) : void {

        const KNOCKBACK_SPEED : number = 1.25;

        if (!this.isActive() || !p.isActive() || !p.isFriendly()) {

            return;
        }   

        const attackID : number = p.getAttackID();
        if (p.overlayObject(this) && (p.destroyOnTouch() || attackID != this.hurtID )) {

            const ppos : Vector = p.getPosition();

            if (p.destroyOnTouch()) {
                
                p.kill(event);
            }
            else {

                this.hurtID = attackID;
            }

            if (this.canBeMoved) {
                
                this.speed.x = Math.sign(this.pos.x - p.getPosition().x)*KNOCKBACK_SPEED*this.knockbackFactor;
            }

            this.takeDamage(p.getPower(), p.stats, event, Vector.direction(ppos, this.pos));
        }
    }


    public enemyCollision(enemy : Enemy, event : ProgramEvent) : void {

        if (!this.isActive() || !enemy.isActive()) {

            return;
        }

        const dist : number = Vector.distance(enemy.pos, this.pos);
        const collisionDistance : number = this.radius + enemy.radius;

        if (dist >= collisionDistance) {

            return;
        }
            
        const dir : Vector = Vector.direction(enemy.pos, this.pos);
        const div : number = Number(this.canBeMoved) + Number(enemy.canBeMoved);

        if (this.canBeMoved) {

            this.pos.x += dir.x*(collisionDistance - dist)/div;
            this.pos.y += dir.y*(collisionDistance - dist)/div;

            this.enemyCollisionEvent?.(enemy, event);
        }

        if (enemy.canBeMoved) {

            enemy.pos.x -= dir.x*(collisionDistance - dist)/div;
            enemy.pos.x -= dir.y*(collisionDistance - dist)/div;

            enemy.enemyCollisionEvent?.(this, event);
        }
    }


    public passGenerators(
        flyingText : ObjectGenerator<FlyingText, void>, 
        collectables : CollectableGenerator,
        projectiles : ProjectileGenerator) : void {

        this.flyingText = flyingText;
        this.collectables = collectables;
        this.projectiles = projectiles;
    }
}
