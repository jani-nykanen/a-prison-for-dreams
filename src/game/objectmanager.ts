import { ProgramEvent } from "../core/event.js";
import { Camera } from "./camera.js";
import { Player } from "./player.js";
import { Stage } from "./stage.js";
import { TILE_HEIGHT, TILE_WIDTH } from "./tilesize.js";
import { Assets } from "../core/assets.js";
import { Bitmap, Canvas } from "../gfx/interface.js";
import { ProjectileGenerator } from "./projectilegenerator.js";
import { ParticleGenerator } from "./particlegenerator.js";
import { AnimatedParticle } from "./animatedparticle.js";
import { Breakable, BreakableType } from "./breakable.js";
import { VisibleObjectBuffer } from "./visibleobjectbuffer.js";


export class ObjectManager {


    private projectiles : ProjectileGenerator;
    private animatedParticles : ParticleGenerator<AnimatedParticle>
    
    private breakables : Breakable[];
    private visibleBreakables : VisibleObjectBuffer<Breakable>;

    // For easier access this is public. Might change later.
    public readonly player : Player;


    constructor(stage : Stage, camera : Camera, event : ProgramEvent) {

        this.projectiles = new ProjectileGenerator();
        this.animatedParticles = new ParticleGenerator<AnimatedParticle> (AnimatedParticle);

        this.breakables = new Array<Breakable> ();
        this.visibleBreakables = new VisibleObjectBuffer<Breakable> ();

        this.player = new Player(0, 0, this.projectiles, this.animatedParticles);
        this.createObjects(stage);
    }


    private createObjects(stage : Stage) : void {

        stage.iterateObjectLayer((x : number, y : number, objID : number) : void => {

            const dx : number = (x + 0.5)*TILE_WIDTH;
            const dy : number = (y + 0.5)*TILE_HEIGHT;

            switch (objID) {

            // Player
            case 1:
                this.player.setPosition(dx, dy);
                break;

            // Crate
            case 2:
                this.breakables.push(new Breakable(dx, dy, BreakableType.Crate));
                break;

            default:
                break;
            }
        });
    }


    private updatePlayer(camera : Camera, stage : Stage, event : ProgramEvent) : void {

        this.player.update(event);
        this.player.targetCamera(camera);
        stage.objectCollision(this.player, event);
    }


    private updateBreakables(camera : Camera, stage : Stage, event : ProgramEvent) : void {

        for (let o of this.breakables) {

            o.cameraCheck(camera, event);
        }

        let somethingBroken : boolean = false;

        this.visibleBreakables.refresh(this.breakables);
        this.visibleBreakables.iterateThroughVisibleObjects((o1 : Breakable, i : number) : void => {

            o1.update(event);
            stage.objectCollision(o1, event);

            this.visibleBreakables.iterateThroughVisibleObjects((o2 : Breakable) : void => {

                o1.objectCollision(o2, event, true);
            }, i + 1);

            o1.objectCollision(this.player, event);
            this.projectiles.breakableCollision(o1, event);

            if (!o1.doesExist()) {

                somethingBroken = true;
            }
        });

        if (somethingBroken) {

            for (let i = 0; i < this.breakables.length; ++ i) {

                if (!this.breakables[i].doesExist()) {

                    this.breakables.splice(i, 1);
                    // console.log("Index %d removed!", i);
                }
            }
        }
    }


    public update(camera : Camera, stage : Stage, event : ProgramEvent) : void {

        this.updateBreakables(camera, stage, event);
        this.updatePlayer(camera, stage, event);
        this.projectiles.update(this.player, stage, camera, event);
        this.animatedParticles.update(camera, event);
    }


    public draw(canvas : Canvas, assets : Assets) : void {

        const bmpParticles1 : Bitmap | undefined = assets.getBitmap("particles_1");

        for (let o of this.breakables) {

            const bmpBreakable : Bitmap | undefined = assets.getBitmap("breakable");
            o.draw(canvas, undefined, bmpBreakable);
        }

        this.animatedParticles.draw(canvas, bmpParticles1);
        this.player.draw(canvas, assets);
        this.projectiles.draw(canvas, assets);
    }
}