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
    100, // Shield
],
[
    // TODO: later
]
];



export const constructShop = (index : 1 | 2, event : ProgramEvent) : Shop => {

    const shop : Shop = new Shop(event);

    const itemNames : string[] | undefined = event.localization?.getItem(`shop${index}`);
    const itemDescriptions : string[] | undefined = event.localization?.getItem(`shopdescription${index}`);

    for (let i : number = 0; i < PRICES[index - 1].length; ++ i) {

        shop.addItem(itemNames?.[i] ?? "null", itemDescriptions?.[i] ?? "null",
            (PRICES[index - 1] ?? PRICES[0])[i], ITEM_START_INDEX + i,
            (index - 1)*8 + i);
    }

    return shop;
}
