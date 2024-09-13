import { ProgramEvent } from "../core/event.js";
import { next } from "./existingobject.js";
import { Projectile } from "./projectile.js";
import { Camera } from "./camera.js";
import { Player } from "./player.js";
import { Stage } from "./stage.js";
import { Assets } from "../core/assets.js";
import { Bitmap, Canvas } from "../gfx/interface.js";


export class ProjectileGenerator {


    private projectiles : Projectile[];


    constructor() {

        this.projectiles = new Array<Projectile> ();
    }


    public spawn(originx : number, originy : number,
        x : number, y : number, 
        speedx : number, speedy : number, 
        id : number, friendly : boolean = true) : Projectile {

        let projectile : Projectile | undefined = next<Projectile> (this.projectiles);
        if (projectile === undefined) {

            projectile = new Projectile();
            this.projectiles.push(projectile);
        }

        projectile.spawn(originx, originy, x, y, speedx, speedy, id, friendly);
        return projectile!;
    }


    public update(player : Player, stage : Stage, camera : Camera, event : ProgramEvent) : void {
        
        for (let o of this.projectiles) {

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

        for (let p of this.projectiles) {

            p.draw(canvas, undefined, bmp);
        }
    }
}
