import { Slime } from "./slime.js";
import { Turtle } from "./turtle.js";
import { Zombie } from "./zombie.js";
import { ShadowBat } from "./shadowbat.js";
import { Caterpillar } from "./caterpillar.js";
import { Apple } from "./apple.js";
import { Mushroom } from "./mushroom.js";


export const getEnemyByID = (index : number) : Function => 
[
    Slime,
    Turtle,
    Zombie,
    ShadowBat,
    Caterpillar,
    Apple,
    Mushroom
]
[index] ?? Slime;
