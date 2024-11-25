import { Slime } from "./slime.js";
import { Turtle } from "./turtle.js";
import { Zombie } from "./zombie.js";
import { ShadowBat } from "./shadowbat.js";
import { Caterpillar } from "./caterpillar.js";
import { Apple } from "./apple.js";
import { Mushroom } from "./mushroom.js";
import { Doppelganger } from "./doppelganger.js";
import { Flail } from "./flail.js";
import { Fish } from "./fish.js";
import { Bat } from "./bat.js";
import { Brick } from "./brick.js";
import { Hog } from "./hog.js";
import { Bee } from "./bee.js";
import { PogoStick } from "./pogostick.js";


export const getEnemyByID = (index : number) : Function => 
[
    Slime,
    Turtle,
    Zombie,
    ShadowBat,
    Caterpillar,
    Apple,
    Mushroom,
    Doppelganger,
    Flail,
    Fish,
    Bat,
    Brick,
    Hog,
    Bee,
    PogoStick
]
[index] ?? Slime;
