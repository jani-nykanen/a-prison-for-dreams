import { ProgramEvent } from "../core/event.js";
import { Shop } from "./shop.js";


const ITEM_START_INDEX : number = 32;


const PRICES : number[][] = [
[
    25, // Health container
    25, // Ammo container
    50, // Power bracelet,
    50, // Spectacles
    35, // Running shoes
    40, // Potion
],
[
    75, // Super health container
    75, // Some gun stuff?
    50, // Faster attacking
    100, // No knockback
    50, // More drops
    300, // Vampirism
]
];



export const constructShop = (index : 1 | 2, event : ProgramEvent) : Shop => {

    const shop : Shop = new Shop(event);

    const itemNames : string[] | undefined = event.localization?.getItem(`shop${index}`);
    const itemDescriptions : string[] | undefined = event.localization?.getItem(`shopdescription${index}`);

    for (let i : number = 0; i < PRICES[index - 1].length; ++ i) {

        shop.addItem(itemNames?.[i] ?? "null", itemDescriptions?.[i] ?? "null",
            (PRICES[index - 1] ?? PRICES[0])[i], ITEM_START_INDEX + (index - 1)*6 + i,
            (index - 1)*6 + i);
    }

    return shop;
}
