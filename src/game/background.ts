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


export const enum BackgroundType {

    Graveyard = 0,
    Coast = 1,
    Forest = 2,
    Cave = 3,
    Mountains = 4,
    CastleInterior = 5,
    CastleOuterior = 6,
};


export class Background {


    private type : BackgroundType;
    private height : number;

    private cloudPos : number = 0;

    private snowflakes : Snowflake[];


    constructor(height : number, type : BackgroundType) {

        this.height = height;
        this.type = type;

        this.snowflakes = new Array<Snowflake> ();
    }


    private hasSnowflakes = () : boolean => 
        this.type == BackgroundType.Graveyard ||
        this.type == BackgroundType.Mountains ||
        this.type == BackgroundType.CastleOuterior;


    private initializeGraveyard(camera : Camera) : void {

        const area : number = camera.width*camera.height;
        const count : number = area/(32*32);

        for (let i : number = 0; i < count; ++ i) {

            const x : number = Math.random()*camera.width;
            const y : number = Math.random()*camera.height;

            this.snowflakes.push(new Snowflake(x, y, 1.0));
        }
    } 


    private updateCoast(event : ProgramEvent) : void {

        const CLOUD_SPEED : number = 1.0/1024.0;

        this.cloudPos = (this.cloudPos + CLOUD_SPEED*event.tick) % 1.0;
    }


    private updateGraveyard(event : ProgramEvent) : void {

        const CLOUD_SPEED : number = 1.0/2048.0;

        this.cloudPos = (this.cloudPos + CLOUD_SPEED*event.tick) % 1.0;
    }

    private drawGraveyard(canvas : Canvas, assets : Assets, camera : Camera) : void {

        canvas.clear(255, 255, 255);

        const bmpMoon : Bitmap | undefined  = assets.getBitmap("moon");
        if (bmpMoon !== undefined) {

            canvas.drawBitmap(bmpMoon, Flip.None, canvas.width - bmpMoon.width - 16, 16);
        }

        const bmpClouds : Bitmap | undefined  = assets.getBitmap("clouds_0");
        if (bmpClouds === undefined) {

            return;
        }

        const camPos : Vector = camera.getCorner();
        const count : number = Math.floor(canvas.width/bmpClouds.width) + 2;

        for (let y : number = 2; y >= 0; -- y) {

            const color : number = 255 - y*73;

            canvas.setColor(color, color, color);

            const shiftx : number = -((camPos.x/(8 + y*8) + this.cloudPos*bmpClouds.width*(3 - y) ) % bmpClouds.width);
            const dy : number = 96 - camPos.y/8 - y*24;

            for (let x : number = -1; x < count; ++ x) {

                canvas.drawBitmap(bmpClouds, Flip.None, x*bmpClouds.width + shiftx, dy);
            }  
        }

        canvas.setColor();
    }


    private drawCoast(canvas : Canvas, assets : Assets, camera : Camera) : void {

        const bmpStars : Bitmap | undefined = assets.getBitmap("stars");
        canvas.drawBitmap(bmpStars, Flip.None, 0, 0, 0, 0, canvas.width, canvas.height, canvas.width, canvas.height);

        const bmpSun : Bitmap | undefined  = assets.getBitmap("sun");
        if (bmpSun !== undefined) {

            canvas.drawBitmap(bmpSun, Flip.None, canvas.width - bmpSun.width - 16, 16);
        }

        const bmpClouds : Bitmap | undefined  = assets.getBitmap("clouds_1");
        if (bmpClouds === undefined) {

            return;
        }

        const camPos : Vector = camera.getCorner();
        const count : number = Math.floor(canvas.width/bmpClouds.width) + 2;

        const shiftx : number = -((camPos.x/8 + this.cloudPos*bmpClouds.width) % bmpClouds.width);
        const dy : number = 80 - camPos.y/8;
        for (let x = -1; x < count; ++ x) {

            canvas.drawBitmap(bmpClouds, Flip.None, x*bmpClouds.width + shiftx, dy);
        }  
        const bottomHeight : number = this.height - (dy + bmpClouds.height);
        if (bottomHeight > 0) {

            canvas.setColor(73, 146, 219);
            canvas.fillRect(0, dy + bmpClouds.height, canvas.width, bottomHeight);
            canvas.setColor();
        }
    }


    private postDrawGraveyard(canvas : Canvas) : void {

        canvas.setColor(0, 0, 0, 0.5);
        for (const o of this.snowflakes) {

            o.draw(canvas);
        }
        canvas.setColor();
    }


    public initialize(camera : Camera) : void {

        this.snowflakes.length = 0;

        switch (this.type) {

        case BackgroundType.Graveyard:

            this.initializeGraveyard(camera);
            break;

        default:
            break;
        }
    }


    public update(camera : Camera, event : ProgramEvent) : void {

        switch (this.type) {

        case BackgroundType.Graveyard:

            this.updateGraveyard(event);
            break;

        case BackgroundType.Coast:

            this.updateCoast(event);
            break;

        default:
            break;
        }

        if (this.hasSnowflakes()) {

            for (const o of this.snowflakes) {

                o.cameraCheck(camera, event);
                o.update(event);
            }
        }
    }


    public draw(canvas : Canvas, assets : Assets, camera : Camera) : void {

        switch (this.type) {

        case BackgroundType.Graveyard:

            this.drawGraveyard(canvas, assets, camera);
            break;

        case BackgroundType.Coast:

            this.drawCoast(canvas, assets, camera);
            break;

        default:
            break;
        }
    }


    public postDraw(canvas : Canvas, assets : Assets) : void {

        switch (this.type) {

        case BackgroundType.Graveyard:

            this.postDrawGraveyard(canvas);
            break;

        default:
            break;
        }
    } 
    
}
