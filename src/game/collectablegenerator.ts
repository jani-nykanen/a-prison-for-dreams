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
import { Progress } from "./progress.js";


export const sampleTypeFromProgress = (progress : Progress, noCoins : boolean = false) : CollectableType => {

    const HEART_MAX_WEIGHT : number = 0.67;
    const AMMO_MAX_WEIGHT : number = 0.33;

    const heartWeight : number = HEART_MAX_WEIGHT*(1.0 - progress.getHealth()/progress.getMaxHealth());
    const ammoWeight : number = AMMO_MAX_WEIGHT*(1.0 - progress.getBulletCount()/progress.getMaxBulletCount());

    const p : number = Math.random();
    if (p < heartWeight) {

        return CollectableType.Heart;
    }
    else if (p < heartWeight + ammoWeight) {

        return CollectableType.Ammo;
    }
    return CollectableType.Coin;

};


export class CollectableGenerator extends ObjectGenerator<Collectable, void> {


    private readonly flyingText : ObjectGenerator<FlyingText, void>;


    constructor(flyingText : ObjectGenerator<FlyingText, void>) {

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
