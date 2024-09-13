


export interface ExistingObject {

    doesExist() : boolean;
    isDying() : boolean;
    forceKill() : void
}


export function next<T extends ExistingObject> (arr : T[]) : T | undefined {

    for (let o of arr) {

        if (!o.doesExist()) {

            return o;
        }
    }
    return undefined;
}
