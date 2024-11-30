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
const MAX_DISTANCE : number = Math.round(Math.hypot(128, 96));


export class Starfield {


    private initialStars : Vector[];
    private distanceModifier : number = 0.0;


    constructor() {

        this.initialStars = new Array<Vector> (STAR_COUNT);
        this.generateInitialStars();
    }


    private generateInitialStars() : void {

        // Bigger values may cause overflow
        const LCG_MODULUS : number = 2 << 29;
        const LCG_MULTIPLIER : number = 22695477;
        const LCG_INCREMENT : number = 12345;

        let sample : number = 1337;
        for (let i : number = 0; i < STAR_COUNT; ++ i) {

            sample = (LCG_MULTIPLIER*sample + LCG_INCREMENT) % LCG_MODULUS;
            let x : number = -128 + (sample % 256);

            sample = (LCG_MULTIPLIER*sample + LCG_INCREMENT) % LCG_MODULUS;
            let y : number = -96 + (sample % 192);

            if (x == 0 && y == 0) {

                x = 1;
            }

            const direction : Vector = Vector.normalize(new Vector(x, y));

            this.initialStars[i] = new Vector(direction.x, direction.y, Math.hypot(x, y)/MAX_DISTANCE);
        }
    }


    private projectStar(canvas : Canvas, v : Vector, scaledDistanceFactor : number) : void {

        const t : number = (v.z + scaledDistanceFactor) % 1;

        const distance : number = t*t*MAX_DISTANCE;

        const dx : number = v.x*distance;
        const dy : number = v.y*distance;

        canvas.fillRect(dx, dy, 1, 1);
    }


    public update(event : ProgramEvent) : void {

        const DISTANCE_FACTOR_SPEED : number = 1.0/120.0;

        this.distanceModifier = (this.distanceModifier + DISTANCE_FACTOR_SPEED*event.tick) % 1.0;
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
