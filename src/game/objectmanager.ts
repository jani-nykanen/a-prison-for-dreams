import { ProgramEvent } from "../core/event.js";
import { Camera } from "./camera.js";
import { Player } from "./player.js";
import { Stage } from "./stage.js";
import { TILE_HEIGHT, TILE_WIDTH } from "./tilesize.js";
import { Assets } from "../core/assets.js";
import { Bitmap, Canvas } from "../gfx/interface.js";
import { ProjectileGenerator } from "./projectilegenerator.js";
import { CollectableGenerator } from "./collectablegenerator.js";
import { Breakable, BreakableType } from "./breakable.js";
import { VisibleObjectBuffer } from "./visibleobjectbuffer.js";
import { SplinterGenerator } from "./splintergenerator.js";
import { Enemy } from "./enemies/enemy.js";
import { getEnemyByID } from "./enemies/index.js";
import { ObjectGenerator } from "./objectgenerator.js";
import { FlyingText } from "./flyingtext.js";
import { AnimatedParticle } from "./animatedparticle.js";
import { Progress } from "./progress.js";


export class ObjectManager {


    private flyingText : ObjectGenerator<FlyingText>;
    private projectiles : ProjectileGenerator;
    private splinters : SplinterGenerator;
    private collectables : CollectableGenerator;
    private animatedParticles : ObjectGenerator<AnimatedParticle>;

    private breakables : Breakable[];
    private visibleBreakables : VisibleObjectBuffer<Breakable>;

    private enemies : Enemy[];
    private visibleEnemies : VisibleObjectBuffer<Enemy>;

    
    // For easier access this is public. Might change later.
    public readonly player : Player;


    constructor(progress : Progress, stage : Stage, camera : Camera, event : ProgramEvent) {

        this.flyingText = new ObjectGenerator<FlyingText> (FlyingText);
        this.projectiles = new ProjectileGenerator();
        this.splinters = new SplinterGenerator();
        this.animatedParticles = new ObjectGenerator<AnimatedParticle> (AnimatedParticle);
        this.collectables = new CollectableGenerator(this.flyingText);

        this.breakables = new Array<Breakable> ();
        this.visibleBreakables = new VisibleObjectBuffer<Breakable> ();

        this.enemies = new Array<Enemy> ();
        this.visibleEnemies = new VisibleObjectBuffer<Enemy> ();

        this.player = new Player(0, 0, this.projectiles, this.animatedParticles, this.flyingText, progress);
        this.createObjects(stage);

        this.initialCameraCheck(camera, event);
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
                this.breakables.push(new Breakable(dx, dy, BreakableType.Crate, 
                    this.splinters, this.collectables));
                break;

            default:
                
                if (objID >= 17 && objID <= 48) {

                    const o : Enemy = (new (getEnemyByID(objID)).prototype.constructor(dx, dy)) as Enemy;
                    this.enemies.push(o);

                    o.passGenerators(this.flyingText, this.collectables);
                }
                break;
            }
        });
    }


    private updatePlayer(camera : Camera, stage : Stage, event : ProgramEvent) : void {

        this.player.update(event);
        this.player.targetCamera(camera);
        stage.objectCollision(this.player, event);
    }


    private updateEnemies(camera : Camera, stage : Stage, event : ProgramEvent) : void {

        for (let o of this.enemies) {

            o.cameraCheck(camera, event);
        }

        let somethingDied : boolean = false;

        this.visibleEnemies.refresh(this.enemies);
        this.visibleEnemies.iterateThroughVisibleObjects((o1 : Enemy, i : number) : void => {

            o1.update(event);
            stage.objectCollision(o1, event);

            this.visibleEnemies.iterateThroughVisibleObjects((o2 : Enemy) : void => {

                // TODO: Enemy-to-enemy collision
            }, i + 1);

            o1.playerCollision(this.player, event);
            if (!o1.doesExist()) {

                somethingDied = true;
                return;
            }

            this.projectiles.enemyCollision(o1, event);

        });

        if (somethingDied) {

            for (let i = 0; i < this.enemies.length; ++ i) {

                if (!this.enemies[i].doesExist()) {

                    this.enemies.splice(i, 1);
                }
            }
        }
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

            o1.playerCollision(this.player, event);
            o1.objectCollision(this.player, event);

            if (!o1.doesExist()) {

                somethingBroken = true;
                return;
            }

            this.projectiles.breakableCollision(o1, event);
            this.splinters.breakableCollision(o1, event);
            this.collectables.breakableCollision(o1, event);

            this.visibleEnemies.iterateThroughVisibleObjects((e : Enemy) : void => {

                o1.objectCollision(e, event, false);
            });
        });

        if (somethingBroken) {

            for (let i = 0; i < this.breakables.length; ++ i) {

                if (!this.breakables[i].doesExist()) {

                    this.breakables.splice(i, 1);
                }
            }
        }
    }


    public update(camera : Camera, stage : Stage, event : ProgramEvent) : void {

        this.updateEnemies(camera, stage, event);
        this.updateBreakables(camera, stage, event);
        this.updatePlayer(camera, stage, event);

        this.projectiles.update(event, camera, stage);
        this.projectiles.playerCollision(this.player, event);

        this.animatedParticles.update(event, camera);
        this.splinters.update(event, camera, stage);
        this.flyingText.update(event, camera);

        this.collectables.update(event, camera, stage);
        this.collectables.playerCollision(this.player, event);
    }


    public initialCameraCheck(camera : Camera, event : ProgramEvent) : void {

        for (const o of this.breakables) {

            o.cameraCheck(camera, event);
        }

        for (const o of this.enemies) {

            o.cameraCheck(camera, event);
        }
    }


    public draw(canvas : Canvas, assets : Assets) : void {

        for (let o of this.breakables) {

            const bmpBreakable : Bitmap | undefined = assets.getBitmap("breakable");
            o.draw(canvas, undefined, bmpBreakable);
        }

        this.animatedParticles.draw(canvas, undefined, assets.getBitmap("particles_1"));
        this.splinters.draw(canvas, assets);

        for (let o of this.enemies) {

            const bmpEnemies : Bitmap | undefined = assets.getBitmap("enemies");
            o.draw(canvas, undefined, bmpEnemies);
        }

        this.collectables.draw(canvas, assets);
        this.player.draw(canvas, assets);
        this.projectiles.draw(canvas, assets);

        this.flyingText.draw(canvas, undefined, assets.getBitmap("font_tiny"));
    }
}