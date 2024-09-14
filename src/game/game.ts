import { ProgramEvent } from "../core/event.js";
import { Scene, SceneParameter } from "../core/scene.js";
import { Align, Bitmap, Canvas, Effect, Flip, TransformTarget } from "../gfx/interface.js";
import { Stage } from "./stage.js";
import { Camera } from "./camera.js";
import { Tilemap } from "../tilemap/tilemap.js";
import { TILE_HEIGHT, TILE_WIDTH } from "./tilesize.js";
import { ObjectManager } from "./objectmanager.js";
import { Assets } from "../core/assets.js";


export class Game implements Scene {


    private stage : Stage;
    private camera : Camera;
    private objects : ObjectManager;


    constructor(event : ProgramEvent) { 

        const baseMap : Tilemap | undefined = event.assets.getTilemap("coast");
        const collisionMap : Tilemap | undefined = event.assets.getTilemap("collisions_1");

        if (baseMap === undefined || collisionMap === undefined) {

            throw "Required tilemaps missing!";
        }

        this.stage = new Stage(baseMap, collisionMap);
        this.camera = new Camera(0, 0, event);
        this.objects = new ObjectManager(this.stage, this.camera, event);

        this.camera.forceCenter(this.objects.player.getPosition());
    }

    
    public init(param : SceneParameter, event : ProgramEvent) : void {

        // ...
    }


    public update(event : ProgramEvent) : void {
        
        this.stage.update(event);

        if (event.transition.isActive())
            return;

        this.objects.update(this.camera, this.stage, event);
        this.camera.update(event);
        this.camera.limit(0, this.stage.width*TILE_WIDTH, null, this.stage.height*TILE_HEIGHT);
    }


    public redraw(canvas : Canvas, assets : Assets) : void {

        canvas.moveTo();
        // canvas.clear(109, 182, 255);
        canvas.setColor();

        canvas.transform.setTarget(TransformTarget.Camera);
        canvas.transform.view(canvas.width, canvas.height);

        canvas.transform.setTarget(TransformTarget.Model);
        canvas.transform.loadIdentity();

        this.stage.drawBackground(canvas, assets, this.camera);

        this.camera.apply(canvas);
        this.stage.draw(canvas, assets, this.camera);
        this.objects.draw(canvas, assets);
        this.stage.drawForeground(canvas, assets, this.camera);

        canvas.transform.setTarget(TransformTarget.Model);
        canvas.transform.loadIdentity();
        canvas.transform.apply();
        canvas.moveTo();
    }


    public dispose() : SceneParameter {
        
        return undefined;
    }
}
