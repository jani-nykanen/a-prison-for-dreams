import { Slime } from "./slime.js";
import { Turtle } from "./turtle.js";


export const getEnemyByID = (index : number) : Function => 
[
    Slime,
    Turtle
]
[index] ?? Slime;
