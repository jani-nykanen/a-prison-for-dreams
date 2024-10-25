import { clamp } from "../math/utility.js";
import { Vector } from "../math/vector.js";
import { ProgramEvent } from "../core/event.js";
import { updateSpeedAxis } from "./utility.js";


const INITIAL_MAP : string = "graveyard";


export const LOCAL_STORAGE_KEY : string = "the_end_of_dreams__savedata_";


export class Progress {


    private health : number = 10;
    private maxHealth : number = 10;
    // Don't ask why these are here
    private healthBarTarget : number = 1.0;
    private healthBarSpeed : number = 0.0;
    private healthBarPos : number = 1.0;

    private bullets : number = 10;
    private maxBullets : number = 10;

    private attackPower : number = 5;
    private projectilePower : number = 3;
    private armor : number = 0;

    private money : number = 0;

    private obtainedItems : boolean[]
    private hintShown : boolean[];
    private cutsceneWatched : boolean[];

    private checkpointPosition : Vector;

    private gameSaved : boolean = false;
    private gameSavedSuccess : boolean = false;

    private fileIndex : number = 0;

    private areaName : string = INITIAL_MAP;


    constructor(fileIndex : number) {

        this.obtainedItems = new Array<boolean> ();
        this.hintShown = new Array<boolean> ();
        this.cutsceneWatched = new Array<boolean> ();

        this.checkpointPosition = new Vector();

        this.fileIndex = fileIndex;

        // TODO: Compute attack power etc. from the list of
        // items.
    }


    private generateSavefileJSON() : unknown {

        const output : unknown = {};

        const date : Date = new Date();
        const dateString : string = 
            String(date.getMonth() + 1).padStart(2, "0") + "/" + 
            String(date.getDate()).padStart(2, "0") + "/" + 
            String(date.getFullYear());

        output["date"] = dateString;

        // TODO: Later can be deduced/computed from the item list
        output["maxHealth"] = this.maxHealth;
        output["maxBullets"] = this.maxBullets;

        output["items"] = Array.from(this.obtainedItems);
        output["hints"] = Array.from(this.hintShown);
        output["cutscenes"] = Array.from(this.cutsceneWatched);

        output["checkpoint"] = {
            "x": this.checkpointPosition.x,
            "y": this.checkpointPosition.y
        };

        output["money"] = this.money;

        output["area"] = this.areaName;

        return output;
    }


    public obtainItem(itemID : number) : void {

        this.obtainedItems[itemID] = true;
    }


    public hasItem(itemID : number) : boolean {

        return this.obtainedItems[itemID] ?? false;
    }


    public markHintAsShown(id : number) : void {

        this.hintShown[id] = true;
    }


    public hasShownHint(id : number) : boolean {

        return this.hintShown[id] ?? false;
    }


    public markCutsceneWatched(id : number) : void {

        this.cutsceneWatched[id] = true;
    }


    public hasWatchedCutscene(id : number) : boolean {

        return this.cutsceneWatched[id] ?? false;
    }


    public getHealth = () : number => this.health;
    public getMaxHealth = () : number => this.maxHealth;


    public updateHealth(change : number) : number {

        if (change < 0) {

            change = Math.min(-1, change + this.armor);
        }
        
        this.health = clamp(this.health + change, 0, this.maxHealth);

        this.healthBarTarget =  this.health/this.maxHealth;
        this.healthBarSpeed = Math.abs(change/this.maxHealth)/15.0;
    
        return change;
    }


    public getMoney = () : number => this.money;


    public updateMoney(change : number) : void {

        this.money = Math.max(0, this.money + change);
    }


    public getBulletCount = () : number => this.bullets;
    public getMaxBulletCount = () : number => this.maxBullets;
    

    public updateBulletCount(change : number) : void {

        this.bullets = clamp(this.bullets + change, 0, this.maxBullets);
    }
    

    public getAttackPower = () : number => this.attackPower;
    public getProjectilePower = () : number => this.projectilePower;


    public getChargeAttackPower = () : number => Math.ceil(this.attackPower*1.33);
    public getChargeProjectilePower = () : number => Math.ceil(this.projectilePower*1.5);
    public getDownAttackPower = () : number => this.attackPower + 2;


    public setCheckpointPosition(v : Vector) : void {

        this.checkpointPosition = v.clone();
    }


    public getCheckpointPosition = () : Vector => this.checkpointPosition.clone();


    public getHealthBarPos = () : number => this.healthBarPos;


    public reset() : void {

        this.health = this.maxHealth;
        this.bullets = this.maxBullets;

        this.healthBarPos = 1.0;
        this.healthBarTarget = 1.0;
    }


    public update(event : ProgramEvent) : void {

        this.healthBarPos = 
            clamp(updateSpeedAxis(
                    this.healthBarPos, this.healthBarTarget, this.healthBarSpeed*event.tick
                ), 0.0, 1.0);
    }


    public save() : boolean {

        this.gameSaved = true;
        try {

            const content : string = JSON.stringify(this.generateSavefileJSON());
            const key : string = LOCAL_STORAGE_KEY + String(this.fileIndex);
            
            // Note: in the past Closure did not work with calls like "window.localStorage"
            // since the function name got optimized away, so I'm playing safe here.
            window["localStorage"]["setItem"](key, content);

            this.gameSavedSuccess = true;
        }
        catch (e) {

            console.error("Not-so-fatal error: failed to save the game: " + e["message"]);

            this.gameSavedSuccess = false;
            return false;
        }
        return true;
    }


    public wasGameSaved() : boolean {

        const returnValue : boolean = this.gameSaved;
        this.gameSaved = false;

        return returnValue;
    }


    public wasGameSavingSuccessful = () : boolean => this.gameSavedSuccess;


    public loadGame(fileIndex : number) : boolean {

        this.fileIndex = fileIndex;

        try {

            const str : string | null = window["localStorage"]["getItem"](LOCAL_STORAGE_KEY + String(this.fileIndex));
            if (str === null) {

                console.log(`Could not find a save file in the index ${this.fileIndex}, creating a new file.`);
                return false;
            }

            const json : unknown = JSON.parse(str) ?? {};
            
            this.maxHealth = Number(json["maxHealth"] ?? this.maxHealth);
            this.maxBullets = Number(json["maxBullets"] ?? this.maxBullets);

            this.obtainedItems = Array.from(json["items"] ?? []) as boolean[];
            this.hintShown = Array.from(json["hints"] ?? []) as boolean[];
            this.cutsceneWatched = Array.from(json["cutscenes"] ?? []) as boolean[];

            this.money = Number(json["money"] ?? this.money);

            const checkpoint : unknown = json["checkpoint"];
            if (checkpoint !== undefined) {

                this.checkpointPosition.x = Number(checkpoint["x"] ?? this.checkpointPosition.x);
                this.checkpointPosition.y = Number(checkpoint["y"] ?? this.checkpointPosition.y);
            }

            this.areaName = json["area"] ?? this.areaName;
        }
        catch (e) {
            
            // TODO: Not a good way to return an error
            return false;
        }
        return true;
    }


    public setAreaName(name : string) : void {

        this.areaName = name;
    }


    public getAreaName = () : string => this.areaName;
}
