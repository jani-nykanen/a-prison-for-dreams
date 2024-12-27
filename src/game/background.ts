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
import { Starfield } from "./starfield.js";


const CLOUD_COLOR_MOD_1 : RGBA = new RGBA(1.0);
const CLOUD_COLOR_MOD_2 : RGBA = new RGBA(182/255, 219/255, 1.0);


export const enum BackgroundType {
    
    Unspecified = -1,
    Graveyard = 0,
    Coast = 1,
    Forest = 2,
    Cave = 3,
    NightSky = 4,
    StarField = 5,
    NightSkyWithForest = 6,
    FrozenCave = 7,
};


export class Background {


    private oldType : BackgroundType = BackgroundType.Unspecified;
    private type : BackgroundType;
    private height : number;

    private cloudPos : number = 0;
    private lightMagnitude : number = 0;

    private snowflakes : Snowflake[];
    private starfield : Starfield | undefined = undefined;
    private snowflakeColor : RGBA | undefined = undefined;;


    constructor(height : number, type : BackgroundType | undefined) {

        this.height = height;
        this.type = type ?? BackgroundType.Unspecified;
        this.oldType = this.type;

        this.snowflakes = new Array<Snowflake> ();

        switch (this.type) {

        case BackgroundType.StarField:

            this.starfield = new Starfield();
            break;

        case BackgroundType.Graveyard:

            this.snowflakeColor = new RGBA(0, 0, 0, 0.5);
            break;

        case BackgroundType.NightSkyWithForest:

            this.snowflakeColor = new RGBA(255, 255, 255, 0.5);
            break;

        default:
            break;
        }
    }


    // TODO: Pass from properties
    private hasSnowflakes = () : boolean => this.type == BackgroundType.Graveyard || 
        this.type == BackgroundType.NightSkyWithForest;


    private initializeSnowflakes(camera : Camera) : void {

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


    private updateClouds(speedMod : number, event : ProgramEvent) : void {

        const CLOUD_SPEED : number = 1.0/2048.0;

        this.cloudPos = (this.cloudPos + speedMod*CLOUD_SPEED*event.tick) % 1.0;
    }


    private updateCave(event : ProgramEvent) : void {

        const LIGHT_SPEED : number = Math.PI*2/120; // Might want to rename this...

        this.lightMagnitude = (this.lightMagnitude + LIGHT_SPEED*event.tick) % (Math.PI*2);

    }


    private drawDefaultSky(canvas : Canvas, assets : Assets) : void {

        const bmpStars : Bitmap | undefined = assets.getBitmap("stars");
        canvas.drawBitmap(bmpStars, Flip.None, 0, 0, 0, 0, canvas.width, canvas.height, canvas.width, canvas.height);

        const bmpSun : Bitmap | undefined  = assets.getBitmap("sun");
        if (bmpSun !== undefined) {

            canvas.drawBitmap(bmpSun, Flip.None, canvas.width - bmpSun.width - 16, 16);
        }
    }


    private drawMoon(canvas : Canvas, assets : Assets, id : number = 0) : void {

        const bmpMoon : Bitmap | undefined  = assets.getBitmap("moon");
        if (bmpMoon !== undefined) {

            canvas.drawBitmap(bmpMoon, 
                Flip.None, 
                canvas.width - 96, 16, 
                id*64, 0, 64, 64);
        }

    }


    private drawClouds(canvas : Canvas, assets : Assets, camera : Camera, 
        colorMod : RGBA, shifty : number = 0.0) : void {

        const bmpClouds : Bitmap | undefined  = assets.getBitmap("clouds_0");
        if (bmpClouds === undefined) {

            return;
        }

        const camPos : Vector = camera.getCorner();
        const count : number = Math.floor(canvas.width/bmpClouds.width) + 2;

        for (let y : number = 2; y >= 0; -- y) {

            const color : number = 255 - y*73;

            canvas.setColor(colorMod.r*color, colorMod.g*color, colorMod.b*color);

            const shiftx : number = -((camPos.x/(8 + y*8) + this.cloudPos*bmpClouds.width*(3 - y) ) % bmpClouds.width);
            const dy : number = 96 - (camPos.y + shifty)/8 - y*24;

            for (let x : number = -1; x < count; ++ x) {

                canvas.drawBitmap(bmpClouds, Flip.None, x*bmpClouds.width + shiftx, dy);
            }  

            const bottom : number = canvas.height - dy;
            if (y == 0 && bottom > 0) {

                // I made this funny observation that right, I never made fillRect
                // work with special effects. This is a workaround as I cannot
                // fillRect the bottom part...
                canvas.drawBitmap(bmpClouds, Flip.None, 0, dy + bmpClouds.height, 
                    0, 80, bmpClouds.width, 16,
                    canvas.width, bottom);
            }
        }

        canvas.setColor();
    }


    private drawGraveyard(canvas : Canvas, assets : Assets, camera : Camera) : void {

        canvas.clear(255, 255, 255);

        this.drawMoon(canvas, assets, 0);
        this.drawClouds(canvas, assets, camera, CLOUD_COLOR_MOD_1);
    }


    private drawCoast(canvas : Canvas, assets : Assets, camera : Camera) : void {

        this.drawDefaultSky(canvas, assets);

        const bmpClouds : Bitmap | undefined  = assets.getBitmap("clouds_1");
        if (bmpClouds === undefined) {

            return;
        }

        const camPos : Vector = camera.getCorner();
        const count : number = Math.floor(canvas.width/bmpClouds.width) + 2;

        const shiftx : number = -((camPos.x/8 + this.cloudPos*bmpClouds.width) % bmpClouds.width);
        const dy : number = 80 - camPos.y/8;
        for (let x : number = -1; x < count; ++ x) {

            canvas.drawBitmap(bmpClouds, Flip.None, x*bmpClouds.width + shiftx, dy);
        }  
        const bottomHeight : number = this.height - (dy + bmpClouds.height);
        if (bottomHeight > 0) {

            canvas.setColor(36, 146, 255);
            canvas.fillRect(0, dy + bmpClouds.height, canvas.width, bottomHeight);
            canvas.setColor();
        }
    }


    private drawTrees(canvas : Canvas, assets : Assets, camera : Camera, darken : number = 0.0) : void {

        const bmpForest : Bitmap | undefined  = assets.getBitmap("forest");
        if (bmpForest === undefined) {

            return;
        }

        const colorMod : number = 1.0 - darken;

        const camPos : Vector = camera.getCorner();
        const count : number = Math.floor(canvas.width/bmpForest.width) + 2;

        if (colorMod > 0) {

            canvas.setColor(255*colorMod, 255*colorMod, 255*colorMod);
        }

        const shiftx : number = -((camPos.x/8) % bmpForest.width);
        const dy : number = 80 - camPos.y/8;
        for (let x : number = -1; x < count; ++ x) {

            canvas.drawBitmap(bmpForest, Flip.None, x*bmpForest.width + shiftx, dy);
        }  
        const bottomHeight : number = this.height - (dy + bmpForest.height);
        if (bottomHeight > 0) {

            canvas.setColor(0*colorMod, 146*colorMod, 219*colorMod);
            canvas.fillRect(0, dy + bmpForest.height, canvas.width, bottomHeight);
            canvas.setColor();
        }
    }


    private drawForestBackground(canvas : Canvas, assets : Assets, camera : Camera) : void {

        this.drawDefaultSky(canvas, assets);
        this.drawTrees(canvas, assets, camera);
    }


    private drawCaveBackground(canvas : Canvas, assets : Assets, camera : Camera,
        backgroundName : string = "cave_wall") : void {

        const bmpWall : Bitmap | undefined = assets.getBitmap(backgroundName);
        if (bmpWall === undefined) {

            return;
        }

        const camPos : Vector = camera.getCorner();
        const shiftx : number = (camPos.x/4) % bmpWall.width;
        const shifty : number = (camPos.y/4) % bmpWall.height;

        const light : number = 255*(0.50 + 0.15*Math.sin(this.lightMagnitude));

        canvas.setColor(light, light, light);
        canvas.drawBitmap(bmpWall, Flip.None, 
            0, 0, shiftx, shifty, canvas.width, canvas.height, canvas.width, canvas.height);
        canvas.setColor();
    }


    private drawFrozenCaveBackground(canvas : Canvas, assets : Assets, camera : Camera) : void {

        this.drawCaveBackground(canvas, assets, camera, "frozen_cave_wall");
    }


    private drawNightSky(canvas : Canvas, assets : Assets, camera : Camera) : void {

        canvas.clear(0, 0, 0);
        this.drawMoon(canvas, assets, 1);

        this.drawClouds(canvas, assets, camera, CLOUD_COLOR_MOD_2, -240);
    }


    private drawNightSkyForest(canvas : Canvas, assets : Assets, camera : Camera) : void {

        canvas.clear(0, 36, 73);
        this.drawMoon(canvas, assets, 1);

        this.drawTrees(canvas, assets, camera, 0.40);
    }


    private drawSnowflakes(canvas : Canvas) : void {

        canvas.setColor(
            this.snowflakeColor.r, 
            this.snowflakeColor.g, 
            this.snowflakeColor.b, 
            this.snowflakeColor.a);
        for (const o of this.snowflakes) {

            o.draw(canvas);
        }
        canvas.setColor();
    }
    


    public initialize(camera : Camera) : void {

        this.snowflakes.length = 0;

        switch (this.type) {

        case BackgroundType.Graveyard:
        case BackgroundType.NightSkyWithForest:

            this.initializeSnowflakes(camera);
            break;

        default:
            break;
        }
    }


    public update(camera : Camera, event : ProgramEvent) : void {

        switch (this.type) {

        case BackgroundType.Graveyard:

            this.updateClouds(1.0, event);
            break;

        case BackgroundType.Coast:

            this.updateCoast(event);
            break;

        case BackgroundType.FrozenCave:
        case BackgroundType.Cave:

            this.updateCave(event);
            break;

        case BackgroundType.NightSky:

            this.updateClouds(2.0, event);
            break;

        case BackgroundType.StarField:

            this.starfield?.update(event);
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

        case BackgroundType.Forest:

            this.drawForestBackground(canvas, assets, camera);
            break;

        case BackgroundType.Cave:

            this.drawCaveBackground(canvas, assets, camera);
            break;

        case BackgroundType.NightSky:

            this.drawNightSky(canvas, assets, camera);
            break;

        case BackgroundType.StarField:

            canvas.clear(0, 0, 0);
            this.starfield?.draw(canvas);
            break;

        case BackgroundType.NightSkyWithForest:

            this.drawNightSkyForest(canvas, assets, camera);
            break;

        case BackgroundType.FrozenCave:

            this.drawFrozenCaveBackground(canvas, assets, camera);
            break;

        default:

            canvas.clear(0, 0, 0);
            break;
        }
    }


    public postDraw(canvas : Canvas, assets : Assets) : void {

        if (this.snowflakeColor !== undefined) {
            
            this.drawSnowflakes(canvas);
        }
    } 


    public changeType(newType? : BackgroundType) : void {

        if (newType === undefined) {

            newType = this.oldType;
        }
        else {

            this.oldType = this.type;
        }

        this.type = newType;
        if (newType === BackgroundType.StarField) {

            this.starfield = new Starfield();
        }
        else {

            // Let the garbage collector get rid of the 
            // starfield
            this.starfield = undefined;
        }
    }
    
}
