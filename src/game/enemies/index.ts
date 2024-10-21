import { Slime } from "./slime.js";
import { Turtle } from "./turtle.js";
import { Zombie } from "./zombie.js";
import { ShadowBat } from "./shadowbat.js";


export const getEnemyByID = (index : number) : Function => 
[
    Slime,
    Turtle,
    Zombie,
    ShadowBat,
]
[index] ?? Slime;
