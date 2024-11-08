import { ProgramEvent } from "../core/event.js";
import { Shop } from "./shop.js";


const ITEM_START_INDEX : number = 16;


const PRICES : number[][] = [
[
    50, // Health container
    50, // Ammo container
    75, // Power bracelet,
    75, // Spectacles
    50, // Running shoes
    100, // Breastplate
],
[
    // TODO: later
]
];



export const constructShop = (index : 1 | 2, event : ProgramEvent) : Shop => {

    const shop : Shop = new Shop(event);

    const itemNames : string[] | undefined = event.localization?.getItem(`shop${index}`);

    for (let i : number = 0; i < PRICES.length; ++ i) {

        shop.addItem(itemNames?.[i] ?? "null", (PRICES[index] ?? PRICES[0])[i], ITEM_START_INDEX + i);
    }
    return shop;
}
