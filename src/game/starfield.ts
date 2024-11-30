import { Tilemap } from "../tilemap/tilemap.js";
import { CollisionMap } from "./collisionmap.js";
import { ProgramEvent } from "../core/event.js";
import { Bitmap, Canvas, Effect, Flip } from "../gfx/interface.js";
import { RenderLayer } from "./renderlayer.js";
import { Camera } from "./camera.js";
import { CollisionObject } from "./collisionobject.js";
import { TILE_HEIGHT, TILE_WIDTH } from "./tilesize.js";
import { Vector } from "../math/vector.js";
import { Assets } from "../core/assets.js";
import { Sprite } from "../gfx/sprite.js";
import { Snowflake } from "./snowflake.js";
import { RGBA } from "../math/rgba.js";


const STAR_COUNT : number = 256;
const MAX_DISTANCE : number = 192;


export class Starfield {


    private initialStars : Vector[];
    private distanceModifier : number = 0.0;
    private angle : number = 0.0;

    private seed : number = 1337;


    constructor() {

        this.initialStars = new Array<Vector> (STAR_COUNT);
        this.generateInitialStars();
    }


    private nextRandom() : number {

        const LCG_MODULUS : number = 2 << 29;
        const LCG_MULTIPLIER : number = 22695477;
        const LCG_INCREMENT : number = 12345;

        return (this.seed = (LCG_MULTIPLIER*this.seed + LCG_INCREMENT) % LCG_MODULUS);
    }


    private generateInitialStars() : void {

        for (let i : number = 0; i < STAR_COUNT; ++ i) {

            const angle : number = (this.nextRandom() % 3600)/3600*Math.PI*2;
            const distance : number = ((this.nextRandom() % 1000))/1000.0*MAX_DISTANCE; 

            // NOTE: initial location never used, can remove the first two
            // components
            this.initialStars[i] = new Vector(Math.cos(angle), Math.sin(angle), distance, angle);
        }
    }


    private projectStar(canvas : Canvas, v : Vector, scaledDistanceFactor : number) : void {

        const MIN_DISTANCE : number = 2;

        const t : number = (v.z + scaledDistanceFactor) % 1;

        const distance : number = t*t*MAX_DISTANCE;
        if (distance < MIN_DISTANCE) {

            return;
        }

        const angle : number = v.w + this.angle;

        const dx : number = Math.cos(angle)*distance;
        const dy : number = Math.sin(angle)*distance;

        canvas.fillRect(dx, dy, 1, 1);
    }


    public update(event : ProgramEvent) : void {

        const DISTANCE_FACTOR_SPEED : number = 1.0/300.0;
        const ROTATION_SPEED : number = Math.PI*2/600;

        this.distanceModifier = (this.distanceModifier + DISTANCE_FACTOR_SPEED*event.tick) % 1.0;
        this.angle = (this.angle + ROTATION_SPEED*event.tick) % (Math.PI*2);
    }


    public draw(canvas : Canvas) : void {

        canvas.setColor(73, 146, 0);

        // canvas.beginSpriteBatching(undefined);

        const scaledDistanceFactor : number = this.distanceModifier;

        canvas.moveTo(canvas.width/2, canvas.height/2);

        for (const v of this.initialStars) {

            for (let i : number = 0; i < 2; ++ i) {

                this.projectStar(canvas, v, scaledDistanceFactor + i);
            }
        }

        // canvas.endSpriteBatching();
        
        // canvas.drawSpriteBatch();

        canvas.setColor();
        canvas.moveTo();
    }
}
