import { Assets } from "../core/assets.js";
import { ProgramEvent } from "../core/event.js";
import { Scene, SceneParameter } from "../core/scene.js";
import { TransitionType } from "../core/transition.js";
import { Bitmap, Canvas, Effect, Flip } from "../gfx/interface.js";
import { Sprite } from "../gfx/sprite.js";
import { RGBA } from "../math/rgba.js";
import { Vector } from "../math/vector.js";
import { TextBox } from "../ui/textbox.js";
import { Camera } from "./camera.js";
import { Snowflake } from "./snowflake.js";


export class Ending implements Scene {


    private text : TextBox;

    private haloWave : number = 0;
    private grassPos : number = 0;
    private gravePos : number = 0;
    private graveID : number = 0;
    private sprPlayer : Sprite;


    private dummyCamera : Camera;
    private snowflakes : Snowflake[];


    constructor(event : ProgramEvent) {

        this.text = new TextBox();

        this.sprPlayer = new Sprite(24, 24);

        this.snowflakes = new Array<Snowflake> ();
        this.dummyCamera = new Camera(0, 0, event);
    }


    private initializeSnowflakes(event : ProgramEvent) : void {

        const area : number = event.screenWidth*event.screenHeight;
        const count : number = area/(32*32);

        this.snowflakes.length = 0;
        for (let i : number = 0; i < count; ++ i) {

            const x : number = Math.random()*event.screenWidth;
            const y : number = Math.random()*event.screenHeight;

            this.snowflakes.push(new Snowflake(x, y, 1.0));
        }
    } 


    private drawGraves(canvas : Canvas, assets : Assets, y : number) : void {

        const bmp : Bitmap | undefined = assets.getBitmap("tileset_0");

        const dx : number = canvas.width/2 + 128 - this.gravePos;

        if (this.graveID == 0) {

            canvas.drawBitmap(bmp, Flip.None, dx - 16, y - 32, 32, 80, 32, 32);
            return;
        }

        canvas.drawBitmap(bmp, Flip.None, dx - 8, y - 16, 80, 96, 16, 16);
    }


    private drawGrass(canvas : Canvas, assets : Assets, y : number, count : number) : void {

        const bmp : Bitmap | undefined = assets.getBitmap("tileset_0");

        const dx : number = canvas.width/2 - count*16;

        for (let i : number = 0; i < count; ++ i) {

            const x : number = dx + 16 + i*32 - this.grassPos;

            canvas.drawBitmap(bmp, Flip.None, x, y - 16, 0, 0, 32, 32);
        }

        canvas.setColor();
        canvas.fillRect(dx, y + 16, count*32, 64);
    }


    private drawPlayer(canvas : Canvas, assets : Assets, y : number) : void {

        const bmp : Bitmap | undefined = assets.getBitmap("player");

        this.sprPlayer.draw(canvas, bmp, canvas.width/2 - 12, y - 20, Flip.None);
    }


    private drawBackground(canvas : Canvas, assets : Assets) : void {

        const GRASS_OFF_Y : number = 40;
        const CIRCLE_MIDDLE_Y_OFF : number = 12;
        const CIRCLE_RADIUS_BASE : number = 72;
        const CIRCLE_RADIUS_VARY : number = 4;

        const bottom : number = canvas.height - GRASS_OFF_Y;

        // Snowflakes
        canvas.setColor(255, 255, 255, 0.5);
        for (const o of this.snowflakes) {

            o.draw(canvas);
        }

        // Graves
        this.drawGraves(canvas, assets, bottom);

        // Player
        canvas.setColor();
        this.drawPlayer(canvas, assets, bottom);

        // Grass
        canvas.applyEffect(Effect.InvertColors);
        this.drawGrass(canvas, assets, bottom, 8);
        canvas.applyEffect();

        // Circle thing
        const haloRadius : number = CIRCLE_RADIUS_BASE + Math.sin(this.haloWave)*CIRCLE_RADIUS_VARY;
        canvas.setColor(0, 0, 0);
        canvas.fillCircleOutside(canvas.width/2, canvas.height/2 + CIRCLE_MIDDLE_Y_OFF, haloRadius);
        canvas.setColor();
    }


    public init(param : SceneParameter, event : ProgramEvent) : void {

        this.text.addText(event.localization?.getItem("ending") ?? ["null"]);
        this.text.activate(false, null, (event : ProgramEvent) : void => {

            event.transition.activate(true, TransitionType.Fade, 1.0/60.0, event,
                (event : ProgramEvent) : void => {

                    event.scenes.changeScene("title", event);
                }
            )
        });

        this.initializeSnowflakes(event);
    }


    public update(event : ProgramEvent): void {

        const GRASS_SPEED : number = 1.0;
        const GRAVE_DISTANCE : number = 256;
        const HALO_WAVE_SPEED : number = Math.PI*2/120.0;

        this.dummyCamera.forceCenter(new Vector(event.screenWidth/2, event.screenHeight/2));
        this.grassPos = (this.grassPos + GRASS_SPEED*event.tick) % 32;
        this.sprPlayer.animate(0, 1, 4, 6, event.tick);

        this.gravePos += GRASS_SPEED*event.tick;
        if (this.gravePos >= GRAVE_DISTANCE) {

            this.gravePos -= GRAVE_DISTANCE;
            this.graveID = (this.graveID + 1) % 2;
        }

        this.haloWave = (this.haloWave + HALO_WAVE_SPEED*event.tick) % (Math.PI*2);

        for (const o of this.snowflakes) {

            o.cameraCheck(this.dummyCamera, event);
            o.update(event);
        }

        if (event.transition.isActive()) {

            return;
        }
        this.text.update(event);
    }


    public redraw(canvas : Canvas, assets : Assets) : void {

        const TEXT_OFF_Y : number = -48; 

        canvas.clear(0, 0, 0);

        this.drawBackground(canvas, assets);

        canvas.setColor(255, 255, 182);
        this.text.draw(canvas, assets, 0, TEXT_OFF_Y, 2, false);
        canvas.setColor();
    }


    public dispose() : SceneParameter {
        
        return undefined;
    }
}
