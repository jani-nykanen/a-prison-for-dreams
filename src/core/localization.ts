

export class Localization {


    private jsonData : any; // Sniff


    constructor(jsonSource : string) {

        this.jsonData = JSON.parse(jsonSource);
    }


    public getItem(key : string) : string[] | undefined {

        const item : any = this.jsonData[key];

        if (typeof(item) === "string") {

            return [item as string];
        }

        if (item?.["length"] !== undefined) {

            return item as string[];
        }

        return undefined;
    }
}
