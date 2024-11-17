import { clamp } from "../math/utility.js";
import { Vector } from "../math/vector.js";
import { ProgramEvent } from "../core/event.js";
import { updateSpeedAxis } from "./utility.js";
import { Item } from "./items.js";


const INITIAL_MAP : string = "graveyard";

const BASE_HEALTH_UP : number = 2;
const BASE_BULLETS_UP : number = 2;


const booleanArrayToListOfTrueValues = (arr : boolean[]) : number[] => {

    const out : number[] = new Array<number> ();

    for (let i : number = 0; i < arr.length; ++ i) {

        if (arr[i]) {

            out.push(i);
        }
    }
    return out;
}


const listOfTrueValuesToBooleanArray = (values : number[]) : boolean[] => {

    if (values.length == 0) {

        return [] as boolean[];
    }

    const len : number = Math.max(...values);
    const out : boolean[] = (new Array<boolean> (len + 1)).fill(false);

    for (const v of values) {

        out[v] = true;
    }
    return out;
}


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
    private speedBonus : number = 0;

    private money : number = 0;
    private orbCount : number = 0;

    private obtainedItems : boolean[]
    private obtainedHealthUps : boolean[];
    private obtainedAmmoUps : boolean[];
    private obtainedDreamOrbs : boolean[];

    private hintShown : boolean[];
    private cutsceneWatched : boolean[];
    private leversPulled : boolean[];

    private checkpointPosition : Vector;

    private gameSaved : boolean = false;
    private gameSavedSuccess : boolean = false;

    private fileIndex : number = 0;

    private areaName : string = INITIAL_MAP;


    constructor(fileIndex : number) {

        this.obtainedItems = (new Array<boolean> (32)).fill(false);
        this.obtainedHealthUps = (new Array<boolean> (8)).fill(false);
        this.obtainedAmmoUps = (new Array<boolean> (8)).fill(false);
        this.obtainedDreamOrbs = (new Array<boolean> (6)).fill(false);

        this.hintShown = (new Array<boolean> (10)).fill(false);
        this.cutsceneWatched = (new Array<boolean> (16)).fill(false);
        this.leversPulled = new Array<boolean> ();

        this.checkpointPosition = new Vector();

        this.fileIndex = fileIndex;

        // TODO: Compute attack power etc. from the list of
        // items.

        this.computeStats();
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
        // output["maxHealth"] = this.maxHealth;
        // output["maxBullets"] = this.maxBullets;

        output["items"] = Array.from(this.obtainedItems);
        output["healthups"] = Array.from(this.obtainedHealthUps);
        output["ammoups"] = Array.from(this.obtainedAmmoUps);
        output["dreamorbs"] = Array.from(this.obtainedDreamOrbs);

        output["hints"] = Array.from(this.hintShown);
        output["cutscenes"] = Array.from(this.cutsceneWatched);
        output["levers"] = booleanArrayToListOfTrueValues(this.leversPulled);

        output["checkpoint"] = {
            "x": this.checkpointPosition.x,
            "y": this.checkpointPosition.y
        };

        output["money"] = this.money;
        output["area"] = this.areaName;

        return output;
    }


    private computeStats() : void {

        this.maxHealth = 10;
        this.maxBullets = 10;
        this.orbCount = 0;

        // TODO: Find out if there is a good way to check how many
        // times a certain value exists in an array, this looks a bit silly.
        // NOTE: array.filter(v => v).length should do the trick, but... eh.

        // Health
        for (const h of this.obtainedHealthUps) {

            if (h) {

                this.maxHealth += BASE_HEALTH_UP;
            }
        }
        if (this.obtainedItems[Item.ExtraHealth]) {

            this.maxHealth += 2;
        }
        // Correct the health bar
        this.healthBarPos =  this.health/this.maxHealth;

        // Ammo
        for (const h of this.obtainedAmmoUps) {

            if (h) {

                this.maxBullets += BASE_BULLETS_UP;
            }
        }
        if (this.obtainedItems[Item.ExtraAmmo]) {

            this.maxBullets += 2;
        }

        // Dream orbs
        for (const h of this.obtainedDreamOrbs) {

            if (h) {

                ++ this.orbCount;
            }
        }

        // Attack power
        this.attackPower = 5;
        if (this.obtainedItems[Item.Bracelet]) {

            this.attackPower += 1;
        }

        // Projectile power
        this.projectilePower = 3;
        if (this.obtainedItems[Item.Spectacles]) {

            this.projectilePower += 1;
        }

        // Damage reduction
        this.armor = 0;
        if (this.obtainedItems[Item.Shield]) {

            this.armor += 1;
        }

        // Speed
        this.speedBonus = 0;
        if (this.obtainedItems[Item.RunningShoes]) {

            this.speedBonus = 1;
        }
    }


    private resetStats() : void {

        this.health = this.maxHealth;
        this.bullets = this.maxBullets;

        this.healthBarTarget = 1;
        this.healthBarPos = 1;
    }


    public obtainItem(itemID : number) : void {

        this.obtainedItems[itemID] = true;
    
        this.computeStats();
    }


    public hasItem(itemID : number) : boolean {

        return this.obtainedItems[itemID] ?? false;
    }


    public obtainDreamOrb(orbID : number) : void {

        this.obtainedDreamOrbs[orbID] = true;
    }


    public hasDreamOrb(orbID : number) : boolean {

        return this.obtainedDreamOrbs[orbID] ?? false;
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


    public markLeverPulled(id : number) : void {

        this.leversPulled[id] = true;
    }


    public hasPulledLever = (id : number) : boolean => this.leversPulled[id] ?? false;


    public obtainHealthUp(id : number) : void {

        if (this.obtainedHealthUps[id]) {
            
            return;
        }

        this.obtainedHealthUps[id] = true;
        this.health += BASE_HEALTH_UP;
        this.computeStats();
    }

    
    public hasObtainedHealthUp(id : number) : boolean {

        return this.obtainedHealthUps[id] ?? false;
    }


    public obtainAmmoUp(id : number) : void {

        if (this.obtainedAmmoUps[id]) {

            return;
        }

        this.obtainedAmmoUps[id] = true;
        this.bullets += BASE_BULLETS_UP;
        this.computeStats();
    }

    
    public hasObtainedAmmoUp(id : number) : boolean {

        return this.obtainedAmmoUps[id] ?? false;
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


    public getSpeedBonus = () : number => this.speedBonus;


    public getMoney = () : number => this.money;


    public updateMoney(change : number) : void {

        this.money = Math.max(0, this.money + change);
    }


    public getBulletCount = () : number => this.bullets;
    public getMaxBulletCount = () : number => this.maxBullets;

    
    public getOrbCount = () : number => this.orbCount;
    

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
            
            // this.maxHealth = Number(json["maxHealth"] ?? this.maxHealth);
            // this.maxBullets = Number(json["maxBullets"] ?? this.maxBullets);

            this.obtainedItems = Array.from(json["items"] ?? []) as boolean[];
            this.obtainedHealthUps = Array.from(json["healthups"] ?? []) as boolean[];
            this.obtainedAmmoUps = Array.from(json["ammoups"] ?? []) as boolean[];
            this.obtainedDreamOrbs = Array.from(json["dreamorbs"] ?? []) as boolean[];

            this.hintShown = Array.from(json["hints"] ?? []) as boolean[];
            this.cutsceneWatched = Array.from(json["cutscenes"] ?? []) as boolean[];
            this.leversPulled = listOfTrueValuesToBooleanArray(json["levers"] ?? []);

            this.money = Number(json["money"] ?? this.money);

            const checkpoint : unknown = json["checkpoint"];
            if (checkpoint !== undefined) {

                this.checkpointPosition.x = Number(checkpoint["x"] ?? this.checkpointPosition.x);
                this.checkpointPosition.y = Number(checkpoint["y"] ?? this.checkpointPosition.y);
            }

            this.areaName = json["area"] ?? this.areaName;

            this.computeStats();
            this.resetStats();
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
