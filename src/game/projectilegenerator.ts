import { ProgramEvent } from "../core/event.js";
import { next } from "./existingobject.js";
import { Projectile } from "./projectile.js";
import { Camera } from "./camera.js";
import { Player } from "./player.js";
import { Stage } from "./stage.js";
import { Assets } from "../core/assets.js";
import { Bitmap, Canvas } from "../gfx/interface.js";
import { Breakable } from "./breakable.js";
import { ObjectGenerator } from "./objectgenerator.js";
import { Enemy } from "./enemies/enemy.js";


export class ProjectileGenerator extends ObjectGenerator<Projectile> {


    constructor() {

        super(Projectile);
    }


    public update(player : Player, stage : Stage, camera : Camera, event : ProgramEvent) : void {
        
        for (let o of this.objects) {

            if (!o.doesExist()) {

                continue;
            }

            o.cameraCheck(camera, event);
            o.update(event);
            if (o.isActive()) {

                stage.objectCollision(o, event);
                
                if (player.isActive()) {

                    player.projectileCollision(o, event);
                }
            
                // TODO: Enemy collisions somewhere!
            }
        }
    }


    public draw(canvas : Canvas, assets : Assets) : void {

        const bmp : Bitmap | undefined = assets.getBitmap("projectiles");

        for (let p of this.objects) {

            p.draw(canvas, undefined, bmp);
        }
    }


    // TODO: This versus iterate over?
    public breakableCollision(o : Breakable, event : ProgramEvent) : void {

        for (const p of this.objects) {

            o.projectileCollision(p, event);
            // o.objectCollision(p, event, false, true);
        }
    }


    public enemyCollision(e : Enemy, event : ProgramEvent) : void {

        for (const p of this.objects) {

            e.projectileCollision(p, event);
        }
    }
}
