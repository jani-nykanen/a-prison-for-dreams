import { clamp } from "../math/utility.js";
import { Vector } from "../math/vector.js";
import { ProgramEvent } from "../core/event.js";
import { updateSpeedAxis } from "./utility.js";


export const LOCAL_STORAGE_KEY : string = "the_end_of_dreams__savedata";


export class Progress {


    private health : number = 10;
    private maxHealth : number = 10;
    // Don't ask why these are here
    private healthBarTarget : number = 1.0;
    private healthBarSpeed : number = 0.0;
    private healthBarPos : number = 1.0;

    private bullets : number = 15;
    private maxBullets : number = 15;

    private attackPower : number = 5;
    private projectilePower : number = 3;
    private armor : number = 0;

    private money : number = 0;

    private obtainedItems : boolean[]

    private checkpointPosition : Vector;

    private gameSaved : boolean = false;
    private gameSavedSuccess : boolean = false;


    constructor() {

        this.obtainedItems = new Array<boolean> ();
        this.checkpointPosition = new Vector();
    }


    public obtainItem(itemID : number) : void {

        this.obtainedItems[itemID] = true;
    }


    public hasItem(itemID : number) : boolean {

        return this.obtainedItems[itemID] ?? false;
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


    public save(key : string) : boolean {

        this.gameSaved = true;
        try {

            // throw new Error("Lol");
            /*
             TODO: Save to local storage
             */

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
}
