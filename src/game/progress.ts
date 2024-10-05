import { Item } from "./items.js";
import { clamp } from "../math/utility.js";
import { Vector } from "../math/vector.js";


export class Progress {


    private health : number = 10;
    private maxHealth : number = 10;

    private attackPower : number = 5;
    private projectilePower : number = 3;
    private armor : number = 0;

    private money : number = 0;

    private obtainedItems : Map<Item, boolean>;

    private checkpointPosition : Vector;


    constructor() {

        this.obtainedItems = new Map<Item, boolean> ();
        this.checkpointPosition = new Vector();
    }


    public getItem(item : Item) : boolean {

        return this.obtainedItems.get(item) ?? false;
    }


    public getHealth = () : number => this.health;
    public getMaxHealth = () : number => this.maxHealth;


    public updateHealth(change : number) : number {

        if (change < 0) {

            change = Math.min(-1, change + this.armor);
        }
        
        this.health = clamp(this.health + change, 0, this.maxHealth);
    
        return change;
    }


    public getMoney = () : number => this.money;


    public updateMoney(change : number) : void {

        this.money = Math.max(0, this.money + change);
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


    public reset() : void {

        this.health = this.maxHealth;
    }
}
