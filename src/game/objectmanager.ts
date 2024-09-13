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



export class ObjectManager {


    private projectiles : ProjectileGenerator;
    private animatedParticles : ParticleGenerator<AnimatedParticle>

    // For easier access this is public. Might change later.
    public readonly player : Player;


    constructor(stage : Stage, camera : Camera, event : ProgramEvent) {

        this.projectiles = new ProjectileGenerator();
        this.animatedParticles = new ParticleGenerator<AnimatedParticle> (AnimatedParticle);

        this.player = new Player(0, 0, this.projectiles, this.animatedParticles);
        this.createObjects(stage);
    }


    private createObjects(stage : Stage) : void {

        // TODO: Create obstacles when they appear in the camera?
        stage.iterateObjectLayer((x : number, y : number, objID : number) : void => {

            const dx : number = (x + 0.5)*TILE_WIDTH;
            const dy : number = (y + 0.5)*TILE_HEIGHT;

            switch (objID) {

            // Player
            case 1:
                this.player.setPosition(dx, dy);
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



    public update(camera : Camera, stage : Stage, event : ProgramEvent) : void {

        this.updatePlayer(camera, stage, event);
        this.projectiles.update(this.player, stage, camera, event);
        this.animatedParticles.update(camera, event);
    }


    public draw(canvas : Canvas, assets : Assets) : void {

        const bmpParticles1 : Bitmap | undefined = assets.getBitmap("particles_1");

        this.animatedParticles.draw(canvas, bmpParticles1);
        this.player.draw(canvas, assets);
        this.projectiles.draw(canvas, assets);
    }
}