import { Assets } from "../core/assets.js";
import { ProgramEvent } from "../core/event.js";
import { Canvas, Bitmap, Flip } from "../gfx/interface.js";
import { Rectangle } from "../math/rectangle.js";
import { Vector } from "../math/vector.js";
import { CollisionObject } from "./collisionobject.js";
import { Sprite } from "../gfx/sprite.js";
import { Player } from "./player.js";
import { ObjectGenerator } from "./objectgenerator.js";
import { FlyingText, FlyingTextSymbol } from "./flyingtext.js";
import { RGBA } from "../math/rgba.js";


const EXISTENCE_TIME : number = 300;
const FLICKER_TIME : number = 60;

const BASE_GRAVITY : number = 3.0;
const IGNORE_CRATE_TIME : number = 8;


export const enum CollectableType {

    Unknown = 0,
    Coin = 1,
    Heart = 2,
    Ammo = 3,
    Gem = 4,
    CoinBag = 5, // Or possible something else
}


export class Collectable extends CollisionObject {


    private type : CollectableType = CollectableType.Unknown;
    private sprite : Sprite;

    private timer : number = 0;

    private ignoreCratesTimer : number = 0;

    private flyingText : ObjectGenerator<FlyingText, void> | undefined = undefined;


    constructor() {

        super(0, 0, false);

        this.collisionBox = new Rectangle(0, 1, 8, 8);
        this.hitbox = new Rectangle(0, 0, 10, 10);

        this.target.x = 0;
        this.target.y = BASE_GRAVITY;

        this.friction.x = 0.025;
        this.friction.y = 0.075;

        this.cameraCheckArea = new Vector(32, 32);

        this.bounceFactor.x = 1.0;
        this.bounceFactor.y = 0.80;

        this.sprite = new Sprite(16, 16);
    }


    protected die(event : ProgramEvent) : boolean {
        
        const ANIMATION_SPEED : number = 4;

        this.sprite.animate(this.type - 1, 4, 8, ANIMATION_SPEED, event.tick);

        return this.sprite.getColumn() >= 8;
    }


    protected updateEvent(event : ProgramEvent) : void {
        
        const ANIMATION_SPEED : number = 6;

        this.timer -= event.tick;
        if (this.timer <= 0) {

            this.exist = false;
        }

        if (this.ignoreCratesTimer > 0) {

            this.ignoreCratesTimer -= event.tick;
        }

        this.sprite.animate(this.sprite.getRow(), 0, 3, ANIMATION_SPEED, event.tick);
    }


    public spawn(x : number, y : number, 
        speedx : number, speedy : number, type : CollectableType,
        flyingText : ObjectGenerator<FlyingText, void>) : void {

        this.pos = new Vector(x, y);
        this.oldPos = this.pos.clone();

        this.speed = new Vector(speedx, speedy);
        // this.target = this.speed.clone();

        this.type = type;

        this.sprite.setFrame(Math.floor(Math.random()*4), Math.max(0, type - 1));

        this.timer = EXISTENCE_TIME;
        this.ignoreCratesTimer = IGNORE_CRATE_TIME;

        this.flyingText = flyingText;

        this.dying = false;
        this.exist = true;
    }


    public draw(canvas: Canvas, assets : Assets | undefined, bmp : Bitmap | undefined) : void {
        
        if (!this.inCamera || !this.exist ||
            (this.timer <= FLICKER_TIME && Math.floor(this.timer/4) % 2 != 0)) {

            return;
        }

        const dx : number = this.pos.x - 8;
        const dy : number = this.pos.y - 8;

        this.sprite.draw(canvas, bmp, dx, dy, Flip.None);
    }


    public playerCollision(player : Player, event : ProgramEvent) : void {

        if (!player.isActive() || !this.isActive() || this.ignoreCratesTimer > 0) {

            return;
        }

        if (player.overlayObject(this)) {

            this.dying = true;
            this.sprite.setFrame(4, this.type - 1);

            let symbol : FlyingTextSymbol = FlyingTextSymbol.None;
            let color : RGBA = new RGBA();
            let count : number = 1;

            switch (this.type) {
                
            case CollectableType.Coin:

                symbol = FlyingTextSymbol.Coin;
                color = new RGBA(255, 255, 182);

                player.stats.updateMoney(1);
                event.audio.playSample(event.assets.getSample("coin"), 0.60);

                break;

            case CollectableType.Heart:

                symbol = FlyingTextSymbol.Heart;
                color = new RGBA(182, 255, 0);

                count = player.stats.updateHealth(5);
                event.audio.playSample(event.assets.getSample("heal"), 0.70);
                // count = 5;

                break;

            case CollectableType.Ammo:

                symbol = FlyingTextSymbol.Ammo;
                color = new RGBA(182, 216, 255);

                player.stats.updateBulletCount(5);
                event.audio.playSample(event.assets.getSample("ammo"), 0.90);
                count = 5;

                break;

            case CollectableType.Gem:

                symbol = FlyingTextSymbol.Coin;
                color = new RGBA(255, 255, 182);

                player.stats.updateMoney(5);
                // TODO: Gem sound?
                event.audio.playSample(event.assets.getSample("coin"), 0.60);
                count = 5;
                
                break;

            default:
                break;
            }

            const ppos : Vector = player.getPosition();
            this.flyingText?.next().spawn(ppos.x, ppos.y - 8, count, symbol, color);
        }
    }


    public doesIgnoreCrates = () : boolean => this.ignoreCratesTimer > 0;
}
