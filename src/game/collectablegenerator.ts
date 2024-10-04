import { ProgramEvent } from "../core/event.js";
import { Camera } from "./camera.js";
import { Stage } from "./stage.js";
import { Assets } from "../core/assets.js";
import { Bitmap, Canvas } from "../gfx/interface.js";
import { Breakable } from "./breakable.js";
import { ObjectGenerator } from "./objectgenerator.js";
import { Collectable, CollectableType } from "./collectable.js";
import { Player } from "./player.js";
import { FlyingText } from "./flyingtext.js";


export class CollectableGenerator extends ObjectGenerator<Collectable> {


    private readonly flyingText : ObjectGenerator<FlyingText>;


    constructor(flyingText : ObjectGenerator<FlyingText>) {

        super(Collectable);

        this.flyingText = flyingText;
    }


    public spawn(x : number, y : number, 
        speedx : number, speedy : number, type : CollectableType) : Collectable {

        const o : Collectable = this.next();
        o.spawn(x, y, speedx, speedy, type, this.flyingText);

        return o
    }


    public update(event : ProgramEvent, camera : Camera, stage : Stage) : void {
        
        for (let i : number = 0; i < this.objects.length; ++ i) {

            const o : Collectable = this.objects[i];

            // TODO: Should be redundant
            if (!o.doesExist()) {

                continue;
            }
            
            o.cameraCheck(camera, event);
            o.update(event);
            if (o.isActive()) {

                stage.objectCollision(o, event);
            }

            if (!o.doesExist() || !o.isInCamera()) {

                this.objects.splice(i, 1);
            }
        }
    }


    public draw(canvas : Canvas, assets : Assets) : void {

        const bmp : Bitmap | undefined = assets.getBitmap("collectables");
        for (const p of this.objects) {

            p.draw(canvas, undefined, bmp);
        }
    }


    public breakableCollision(o : Breakable, event : ProgramEvent) : void {

        for (const p of this.objects) {
           
            o.objectCollision(p, event, false, p.doesIgnoreCrates());
        }
    }


    public playerCollision(player : Player, event : ProgramEvent) : void {

        for (let o of this.objects) {

            if (!o.isActive()) {

                continue;
            }
            o.playerCollision(player, event);
        }
    }
}
