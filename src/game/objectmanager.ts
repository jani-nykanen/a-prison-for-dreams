import { ProgramEvent } from "../core/event.js";
import { Camera } from "./camera.js";
import { Player, Pose, WaitType } from "./player.js";
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
import { Vector } from "../math/vector.js";
import { clamp, negMod } from "../math/utility.js";
import { Interactable } from "./interactables/interactable.js";
import { NPC } from "./interactables/npc.js";
import { TextBox } from "../ui/textbox.js";
import { Checkpoint } from "./interactables/checkpoint.js";
import { Chest, ChestType } from "./interactables/chest.js";
import { Beam } from "./interactables/beam.js";
import { Portal } from "./interactables/portal.js";
import { MapTransitionCallback } from "./maptransition.js";
import { HintRenderer } from "./hintrenderer.js";
import { HintTrigger } from "./interactables/hinttrigger.js";
import { Door } from "./interactables/door.js";
import { Shopkeeper } from "./interactables/shopkeeper.js";
import { Shop } from "./shop.js";
import { Platform, PlatformType } from "./platform.js";
import { Spring } from "./interactables/spring.js";
import { Lever } from "./interactables/lever.js";
import { Switch } from "./interactables/switch.js";
import { EyeTrigger } from "./interactables/eyetrigger.js";
import { ConfirmationBox } from "../ui/confirmationbox.js";
import { BackgroundType } from "./background.js";
import { Eye } from "./enemies/eye.js";
import { Ghost } from "./enemies/ghost.js";
import { TransitionType } from "../core/transition.js";
import { RGBA } from "../math/rgba.js";
import { Fan } from "./interactables/fan.js";
import { Anvil } from "./interactables/anvil.js";
import { FinalBossTrigger } from "./interactables/finalbosstrigger.js";
import { FinalBoss } from "./enemies/finalboss.js";


export class ObjectManager {


    private flyingText : ObjectGenerator<FlyingText, void>;
    private projectiles : ProjectileGenerator;
    private splinters : SplinterGenerator;
    private collectables : CollectableGenerator;
    private animatedParticles : ObjectGenerator<AnimatedParticle, void>;

    private breakables : Breakable[];
    private visibleBreakables : VisibleObjectBuffer<Breakable>;

    private enemies : Enemy[];
    private visibleEnemies : VisibleObjectBuffer<Enemy>;
    private miniboss : Eye | undefined = undefined;
    private finalboss : FinalBoss | undefined = undefined;

    private platforms : Platform[];
    private visiblePlatforms : VisibleObjectBuffer<Platform>;

    private interactables : Interactable[];
    // Note to self: probably no reason to store visible interactables
    // in their own array?

    private player : Player;

    private npcType : number = 0;
    private spawnId : number = 0;

    private readonly dialogueBox : TextBox;
    private readonly hints : HintRenderer;
    private readonly bossBattleConfirmationBox : ConfirmationBox;
    private readonly finalBossBattleConfirmationBox : ConfirmationBox;
    private readonly mapTransition : MapTransitionCallback;
    private readonly shops : Shop[];


    constructor(progress : Progress, dialogueBox : TextBox,
        hints : HintRenderer, bossBattleConfirmationBox : ConfirmationBox,
        finalBossBattleConfirmationBox : ConfirmationBox,
        shops : Shop[], stage : Stage, camera : Camera,
        npcType : number, mapTransition : MapTransitionCallback,
        spawnId : number, pose : Pose, createNewPlayer : boolean, 
        event : ProgramEvent,) {

        this.flyingText = new ObjectGenerator<FlyingText, void> (FlyingText);
        this.projectiles = new ProjectileGenerator();
        this.splinters = new SplinterGenerator();
        this.animatedParticles = new ObjectGenerator<AnimatedParticle, void> (AnimatedParticle);
        this.collectables = new CollectableGenerator(this.flyingText);

        this.breakables = new Array<Breakable> ();
        this.visibleBreakables = new VisibleObjectBuffer<Breakable> ();

        this.enemies = new Array<Enemy> ();
        this.visibleEnemies = new VisibleObjectBuffer<Enemy> ();

        this.platforms = new Array<Platform> ();
        this.visiblePlatforms = new VisibleObjectBuffer<Platform> ();

        this.interactables = new Array<Interactable> ();

        this.player = new Player(0, 0, 
            this.projectiles, this.animatedParticles, 
            this.flyingText, progress, mapTransition,
            event);

        this.dialogueBox = dialogueBox;
        this.bossBattleConfirmationBox = bossBattleConfirmationBox;
        this.finalBossBattleConfirmationBox = finalBossBattleConfirmationBox;
        this.hints = hints;
        this.mapTransition = mapTransition;
        this.shops = shops;

        this.npcType = npcType;
        this.spawnId = spawnId;
        
        this.createObjects(stage, camera, !createNewPlayer, event);
        this.initialCameraCheck(camera, event);

        if (createNewPlayer) {

            progress.setCheckpointPosition(this.player.getPosition());
            this.player.setPose(pose);
        }
        else {

            const checkpoint : Vector = progress.getCheckpointPosition();
            this.player.setPosition(checkpoint.x, checkpoint.y, true);
        }

        // Open chests etc.
        for (const o of this.interactables) {

            o.playerCollision(this.player, event, true);
        }
    }


    private createObjects(stage : Stage, camera : Camera, resetPlayer : boolean = false, event : ProgramEvent) : void {

        const bmpNPC : Bitmap | undefined = event.assets.getBitmap("npc");
        const bmpCheckpoint : Bitmap | undefined = event.assets.getBitmap("checkpoint");
        const bmpChest : Bitmap | undefined = event.assets.getBitmap("chest");
        const bmpPortal : Bitmap | undefined = event.assets.getBitmap("portal");
        const bmpShopkeeper : Bitmap | undefined = event.assets.getBitmap("shopkeeper");
        const bmpSpring : Bitmap | undefined = event.assets.getBitmap("spring");
        const bmpLever : Bitmap | undefined = event.assets.getBitmap("lever");
        const bmpSwitch : Bitmap | undefined = event.assets.getBitmap("switch");
        const bmpDoors : Bitmap | undefined = event.assets.getBitmap("locked_doors");
        const bmpFan : Bitmap | undefined = event.assets.getBitmap("fan");

        stage.iterateObjectLayer((x : number, y : number, objID : number, upperID : number) : void => {

            const dx : number = (x + 0.5)*TILE_WIDTH;
            const dy : number = (y + 0.5)*TILE_HEIGHT;

            const id : number = Math.max(0, upperID - 128);

            switch (objID) {

            // Door
            case 12:
                
                this.interactables.push(new Door(dx, dy, id - 1,
                    stage.baseMap.getProperty(`door${id - 1}`), 
                    this.mapTransition, this.dialogueBox));
                // Fallthrough
            // Player
            case 1:
                
                if (!resetPlayer && id - 1 == this.spawnId) {

                    this.player.setPosition(dx, dy, resetPlayer);
                }
                break;

            // Crate & rubble
            case 2:
            case 14:
                this.breakables.push(new Breakable(dx, dy, 
                    objID == 2 ? BreakableType.Crate : BreakableType.Rubble, 
                    this.splinters, this.collectables));
                break;

            // NPC:
            case 3:

                this.interactables.push(new NPC(dx, dy, id, this.npcType, bmpNPC, this.dialogueBox));
                break;

            // Checkpoint
            case 4:

                this.interactables.push(new Checkpoint(dx, dy, bmpCheckpoint));    
                break;

            // Chests
            case 5:
            case 6:
            case 7:
            case 8:

                this.interactables.push(new Chest(dx, dy, id, 
                        (objID - 4) as ChestType, bmpChest, 
                        this.dialogueBox, this.hints));
                break;

            // Beam
            case 9:

                this.interactables.push(new Beam(dx, dy, id));    
                break;

            // Portal
            case 89:
            case 77:
            case 10:

                this.interactables.push(new Portal(dx, dy, bmpPortal, 
                    this.mapTransition, this.dialogueBox,
                    id - 1, stage.baseMap.getProperty(`portal${id - 1}`),
                    objID == 77, objID == 89));
                if (!resetPlayer && id - 1 == this.spawnId) {

                    this.player.setPosition(dx, dy, resetPlayer);
                }
                break;

            // Hint trigger
            case 11:

                this.interactables.push(new HintTrigger(dx, dy, id - 1, this.hints));
                break;

            // Shopkeeper
            case 13:

                this.interactables.push(new Shopkeeper(dx, dy, this.shops[id - 1], bmpShopkeeper, id - 1));    
                break;

            // Moving platforms
            case 15:
            case 16:

                this.platforms.push(new Platform(dx, dy, PlatformType.VerticallyMoving + (objID - 15)))
                break;

            // Spring mushroom
            case 65:
                
                this.interactables.push(new Spring(dx, dy, bmpSpring));
                break;

            // Lever
            case 66:

                this.interactables.push(new Lever(dx, dy, id - 1, bmpLever, this.dialogueBox));
                break;

            // Switches
            case 67:
            case 68:
            case 69:
            case 70:
            case 71:
            case 72:

                this.interactables.push(new Switch(dx, dy, stage, (objID - 67) % 3, objID <= 69, bmpSwitch));
                break;

            // Swing
            case 73:

                this.platforms.push(new Platform(dx, dy, PlatformType.Swing));
                break;

            // Locked doors
            case 74:
            case 75:
            case 76:
            case 80:

                this.interactables.push(new Door(dx, dy, id - 1,
                    stage.baseMap.getProperty(`door${id - 1}`), 
                    this.mapTransition, this.dialogueBox,
                    objID != 80 ? objID - 74 : undefined, 
                    objID == 80,
                    bmpDoors));
                if (!resetPlayer && id - 1 == this.spawnId) {

                    this.player.setPosition(dx, dy, resetPlayer);
                }
                break;

            // Cloud
            case 78:

                this.platforms.push(new Platform(dx, dy, PlatformType.Cloud));
                break;

            // Eye trigger
            case 79:

                this.interactables.push(new EyeTrigger(dx + 8, dy, 
                    this.bossBattleConfirmationBox,  
                    () : void => this.initiateMiniBoss(stage, camera, event)));
                break;

            // Fans
            case 81:
            case 82:
            case 83:
            case 84:

                this.interactables.push(new Fan(dx, dy, bmpFan, objID - 81));
                break;

            // Platinum door
            case 85:

                this.interactables.push(new Door(dx, dy, id - 1,
                    stage.baseMap.getProperty("door3"), 
                    this.mapTransition, this.dialogueBox,
                    4, false,
                    bmpDoors));
                if (!resetPlayer && id - 1 == this.spawnId) {

                    this.player.setPosition(dx, dy, resetPlayer);
                }    
                break;

            // Bumper "platform"
            case 86:

                this.platforms.push(new Platform(dx, dy, PlatformType.Bumper));
                break;

            // Anvil
            case 87:

                this.interactables.push(new Anvil(dx, dy, this.dialogueBox, this.hints));
                break;
            
            // Scare face blocks
            case 88:

                this.breakables.push(new Breakable(dx, dy, BreakableType.ScaryFace, 
                    this.splinters, this.collectables));
                break;

            // Final boss trigger
            case 90:

                this.interactables.push(new FinalBossTrigger(dx + 8, dy, 
                    this.dialogueBox, this.finalBossBattleConfirmationBox,  
                    () : void => this.initiateFinalBoss(stage, camera, event)));
                break;

            default:
                
                // Enemies
                if (objID >= 17 && objID <= 64) {

                    const o : Enemy = (new (getEnemyByID(objID - 17)).prototype.constructor(dx, dy)) as Enemy;
                    this.enemies.push(o);

                    o.passGenerators(this.flyingText, this.collectables, this.projectiles);
                    o.passShakeEvent((shakeTime : number, shakeAmount : number) : void => camera.shake(shakeTime, shakeAmount));
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

        for (const o of this.enemies) {

            o.cameraCheck(camera, event);
        }

        let somethingDied : boolean = false;

        this.visibleEnemies.refresh(this.enemies);
        this.visibleEnemies.iterateThroughVisibleObjects((o1 : Enemy, i : number) : void => {

            o1.update(event);
            stage.objectCollision(o1, event);

            this.visibleEnemies.iterateThroughVisibleObjects((o2 : Enemy) : void => {

                o1.enemyCollision(o2, event);

            }, i + 1);

            o1.playerCollision(this.player, event);
            if (!o1.doesExist()) {

                somethingDied = true;
                return;
            }

            this.projectiles.enemyCollision(o1, event);

        });

        if (somethingDied) {

            for (let i : number = 0; i < this.enemies.length; ++ i) {

                if (!this.enemies[i].doesExist()) {

                    this.enemies.splice(i, 1);
                }
            }
        }

        /*
        if (this.miniboss !== undefined && !this.miniboss.hasReachedInitialPos()) {

            camera.followPoint(this.miniboss.getPosition());
        }
        */
    }


    private updateBreakables(camera : Camera, stage : Stage, event : ProgramEvent) : void {

        for (const o of this.breakables) {

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
            o1.objectCollision(this.player, event, false, false, true);

            if (!o1.doesExist()) {

                somethingBroken = true;
                return;
            }

            this.projectiles.breakableCollision(o1, event);
            this.splinters.breakableCollision(o1, event);
            this.collectables.breakableCollision(o1, event);

            this.visibleEnemies.iterateThroughVisibleObjects((e : Enemy) : void => {

                if (!e.doesTakeCollisions()) {

                    return;
                }
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


    private updateInteractables(camera : Camera, event : ProgramEvent, 
        takePlayerEvent : boolean = true) : void {

        for (const o of this.interactables) {

            o.cameraCheck(camera, event);
            o.update(event);

            if (takePlayerEvent) {

                o.playerCollision(this.player, event);
            }
        }
    }


    private updatePlatforms(camera : Camera, event : ProgramEvent) : void {

        for (const o of this.platforms) {

            o.cameraCheck(camera, event);
        }

        this.visiblePlatforms.refresh(this.platforms);
        this.visiblePlatforms.iterateThroughVisibleObjects((p : Platform, i : number) : void => {

            p.update(event);

            p.objectCollision(this.player, event);

            this.visibleEnemies.iterateThroughVisibleObjects((e : Enemy) : void => {

                if (!e.doesTakeCollisions()) {

                    return;
                }
                p.objectCollision(e, event);
            });
        });
    }


    public update(camera : Camera, stage : Stage, 
        hintRenderer : HintRenderer, event : ProgramEvent) : void {

        if (this.player.isWaiting()) {

            this.player.update(event);
            this.player.targetCamera(camera);
            this.animateNPCs(camera, event);
            return;
        }

        this.updateEnemies(camera, stage, event);
        this.updateBreakables(camera, stage, event);
        this.updatePlayer(camera, stage, event);
        this.updateInteractables(camera, event);
        this.updatePlatforms(camera, event);

        this.projectiles.update(event, camera, stage);
        this.projectiles.playerCollision(this.player, event);

        this.animatedParticles.update(event, camera);
        this.splinters.update(event, camera, stage);
        this.flyingText.update(event, camera);

        this.collectables.update(event, camera, stage);
        this.collectables.playerCollision(this.player, event);

        hintRenderer.update(this.player, event);
    }


    public animateNPCs(camera : Camera, event : ProgramEvent) : void {

        this.updateInteractables(camera, event, false);
    }


    public initialCameraCheck(camera : Camera, event : ProgramEvent) : void {

        for (const o of this.breakables) {

            o.cameraCheck(camera, event);
        }

        for (const o of this.enemies) {

            o.cameraCheck(camera, event);
        }

        for (const o of this.interactables) {

            o.cameraCheck(camera, event);
        }

        for (const o of this.platforms) {

            o.cameraCheck(camera, event);
        }
    }


    public draw(canvas : Canvas, assets : Assets) : void {

        const bmpPlatforms : Bitmap | undefined = assets.getBitmap("platforms");
        for (const o of this.platforms) {

            o.draw(canvas, assets, bmpPlatforms);
        }

        for (const o of this.interactables) {

            o.draw(canvas, assets);
        }

        const bmpBreakable : Bitmap | undefined = assets.getBitmap("breakable");
        for (const o of this.breakables) {

            o.draw(canvas, undefined, bmpBreakable);
        }

        this.animatedParticles.draw(canvas, undefined, assets.getBitmap("particles_1"));
        this.splinters.draw(canvas, assets);

        const bmpEnemies : Bitmap | undefined = assets.getBitmap("enemies");
        for (const o of this.enemies) {

            o.draw(canvas, assets, bmpEnemies);
        }

        this.collectables.draw(canvas, assets);
        this.player.draw(canvas, assets);
        this.projectiles.draw(canvas, assets);

        for (const o of this.interactables) {

            o.postDraw?.(canvas, assets);
        }
        this.player.postDraw(canvas, assets);

        this.finalboss?.postDraw(canvas, assets);

        this.flyingText.draw(canvas, undefined, assets.getBitmap("font_tiny"));
    }


    public centerCamera(camera : Camera) : void {

        camera.forceCenter(this.player.getPosition());
    }


    public getAbsolutePlayerPosition = () : Vector => this.player.getPosition();


    public getRelativePlayerPosition(stage : Stage, camera : Camera) : Vector {

        const v : Vector = new Vector();
        const ppos : Vector = this.player.getPosition();
        const camPos : Vector = camera.getCorner();

        v.x = Math.max(0, clamp(ppos.x, 0, stage.width*TILE_WIDTH - 1) - camPos.x) % camera.width;
        v.y = Math.max(0, clamp(ppos.y, 0, stage.height*TILE_HEIGHT - 1) - camPos.y) % camera.height;

        return v;
    }


    public reset(progress : Progress, stage : Stage, camera : Camera, event : ProgramEvent) : void {
        
        this.flyingText.flush();
        this.projectiles.flush();
        this.splinters.clear();
        this.animatedParticles.flush();
        this.collectables.clear();

        this.breakables.length = 0;
        this.visibleBreakables.clear();

        this.enemies.length = 0;
        this.visibleEnemies.clear();

        this.platforms.length = 0;
        this.visiblePlatforms.clear();

        this.interactables.length = 0;

        this.createObjects(stage, camera, true, event);
    
        const checkpoint : Vector = progress.getCheckpointPosition();
        this.player.setPosition(checkpoint.x, checkpoint.y, true);

        this.centerCamera(camera);
        this.initialCameraCheck(camera, event);

        for (const o of this.interactables) {

            o.playerCollision(this.player, event, true);
        }

        this.miniboss = undefined;
        this.finalboss = undefined;

        // For debugging, if things go wrong
        // this.player.setPosition(128, 64);
    }


    public killPlayer(event : ProgramEvent) : void {

        this.player.instantKill(event);
    }


    public initiateWakingUpAnimation(event : ProgramEvent) : void {

        const WAIT_TIME : number = 90;

        this.player.startWaiting(WAIT_TIME, WaitType.WakingUp, undefined, 
            (event : ProgramEvent) : void => {

            this.dialogueBox.addText(event.localization?.getItem("npc0") ?? ["null"]);
            this.dialogueBox.activate(false, 1);

            const keyboardHint : string = event.localization?.getItem("hints")?.[0] ?? "null";
            const gamepadHint : string | undefined = event.localization?.getItem("hints_gamepad")?.[0];

            this.hints.activate(this.player.getPosition(), keyboardHint, gamepadHint);
        });
    }


    public setPlayerPose(pose : Pose) : void {

        this.player.setPose(pose);
    }


    public hasPlayerDied = () : boolean => !this.player.doesExist();


    public initiateMiniBoss(stage : Stage, camera : Camera, event : ProgramEvent) : void {

        const MUSIC_VOL : number = 0.40;

        const spawnGhost = (dir : number) : void => {
            
            const minY : number = 32 + 12;
            const maxY : number = minY + (stage.height - 4)*TILE_HEIGHT - 12;

            const dx : number = dir > 0 ? -12 : stage.width*TILE_WIDTH + 12;
            const dy : number = minY + Math.random()*(maxY - minY);

            const o : Ghost = new Ghost(dx, dy, dir, stage.width*TILE_WIDTH, 0);
            o.passGenerators(this.flyingText, this.collectables, this.projectiles);
            this.enemies.push(o);
        };

        const deathEvent = (event : ProgramEvent) : void => {

            const spawnIndex : number = stage.baseMap.getNumericProperty("boss_defeat_pos");
            const mapName : string = stage.baseMap.getProperty("boss_defeat_map");

            this.player.stats.markMinibossDefeated();

            event.transition.activate(true, TransitionType.Fade, 1.0/60.0, event,
                (event : ProgramEvent) : void => {

                    this.mapTransition(mapName, 
                        spawnIndex, Pose.Sit, true, event, true);
                },
                new RGBA(255, 255, 255));
        }


        const triggerDeathEvent = (event : ProgramEvent) : void => {

            for (const e of this.enemies) {

                if (e !== this.miniboss) {

                    e.softKill();
                }
            }
        }

        stage.toggleTopLayerRendering(false);
        stage.changeBackground(BackgroundType.StarField);

        this.interactables.length = 0;

        this.player.startHarmlessKnockback(60);

        const playerPos : Vector = this.player.getPosition();
        this.miniboss = new Eye(playerPos.x, playerPos.y - 24, 
            spawnGhost, deathEvent, triggerDeathEvent);
        this.enemies.push(this.miniboss);

        this.miniboss.passGenerators(this.flyingText, this.collectables, this.projectiles);
        this.miniboss.passShakeEvent(
            (shakeTime : number, shakeAmount : number) : void => camera.shake(shakeTime, shakeAmount));

        event.audio.playSample(event.assets.getSample("thwomp"), 0.50);
        event.audio.fadeInMusic(event.assets.getSample("miniboss"), MUSIC_VOL, 1000);

        // Create platforms
        for (let i : number = 0; i < 2; ++ i) {

            this.platforms.push(new Platform(playerPos.x, 120, PlatformType.RectangularSwing, i));
        }

        camera.shake(60, 4);
    }


    public initiateFinalBoss(stage : Stage, camera : Camera, event : ProgramEvent) : void {

        const MUSIC_VOL : number = 0.30;

        const spawnGhost = (dir : number) : void => {
            
            const minY : number = TILE_HEIGHT*10;
            const maxY : number = (stage.height - 4)*TILE_HEIGHT;

            const dx : number = dir > 0 ? -12 : stage.width*TILE_WIDTH + 12;
            const dy : number = minY + Math.random()*(maxY - minY);

            const o : Ghost = new Ghost(dx, dy, dir, stage.width*TILE_WIDTH, 1);
            o.passGenerators(this.flyingText, this.collectables, this.projectiles);
            this.enemies.push(o);
        };

        const deathEvent = (event : ProgramEvent) : void => {

            event.transition.activate(true, TransitionType.Fade, 1.0/60.0, event,
                (event : ProgramEvent) : void => {

                    throw new Error("Not yet done.");
                },
                new RGBA(255, 255, 255));
        };

        const triggerDeathEvent = (event : ProgramEvent) : void => {

            for (const e of this.enemies) {

                if (e !== this.finalboss) {

                    e.softKill();
                }
            }
        }

        this.interactables.length = 0;

        this.player.startHarmlessKnockback(60);

        const playerPos : Vector = this.player.getPosition();
        this.finalboss = new FinalBoss(
            playerPos.x, playerPos.y - 24, stage,
            deathEvent, triggerDeathEvent, spawnGhost);
        this.enemies.push(this.finalboss);

        this.finalboss.passGenerators(this.flyingText, this.collectables, this.projectiles);
        this.finalboss.passShakeEvent(
            (shakeTime : number, shakeAmount : number) : void => camera.shake(shakeTime, shakeAmount));

        event.audio.playSample(event.assets.getSample("thwomp"), 0.50);
        event.audio.fadeInMusic(event.assets.getSample("finalboss"), MUSIC_VOL, 1000);

        // Platforms
        const platformOffsetX : number = TILE_WIDTH*7.5;
        for (let i : number = 0; i < 2; ++ i) {

            this.platforms.push(new Platform(
                playerPos.x - (-1 + 2*i)*platformOffsetX, 
                playerPos.y - 56, 
                PlatformType.StaticUnmoving));
        }
        this.platforms.push(new Platform(playerPos.x, playerPos.y - 96, PlatformType.StaticUnmoving));

        camera.shake(60, 4);

        stage.enableFinalBossArena();
    }


    public getMinibossHealth() : number | undefined {

        return this.miniboss?.getHealthbarHealth();
    }


    public getFinalBossHealth() : number | undefined {

        return this.finalboss?.getHealthbarHealth();
    }
}