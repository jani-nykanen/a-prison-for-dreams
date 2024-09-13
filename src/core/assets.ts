import { AudioSample } from "../audio/sample.js";
import { Tilemap } from "../tilemap/tilemap.js";
import { AudioPlayer } from "../audio/audioplayer.js";
import { Renderer, Bitmap } from "../gfx/interface.js";


export class Assets {


    private bitmaps : Map<string, Bitmap>;
    private samples : Map<string, AudioSample>;
    private tilemaps : Map<string, Tilemap>;
    private documents : Map<string, string>;

    private loaded : number = 0;
    private totalAssets : number = 0;

    private readonly audio : AudioPlayer;
    private readonly renderer : Renderer;


    constructor(audio : AudioPlayer, renderer : Renderer) {

        this.bitmaps = new Map<string, Bitmap> ();
        this.samples = new Map<string, AudioSample> ();
        this.tilemaps = new Map<string, Tilemap> ();
        this.documents = new Map<string, string> ();

        this.audio = audio;
        this.renderer = renderer;
    }


    private loadTextFile(path : string, type : string, func : (s : string) => void) : void {
        
        ++ this.totalAssets;

        const xobj : XMLHttpRequest = new XMLHttpRequest();
        xobj.overrideMimeType("text/" + type);
        xobj.open("GET", path, true);

        xobj.onreadystatechange = () => {

            if (xobj.readyState == 4 ) {

                if(String(xobj.status) == "200") {
                    
                    func(xobj.responseText);
                }
                ++ this.loaded;
            }
                
        };
        xobj.send(null);  
    }


    private loadItems(jsonData : any,
        func : (name : string, path : string, alias? : string, filterParam? : string, ) => void, 
        basePathName : string, arrayName : string) : void {
        
        const path : string | undefined = jsonData[basePathName];
        const objects : any | undefined = jsonData[arrayName];

        if (path !== undefined && objects !== undefined) {
                    
            for (let o of objects) {

                func(o["name"], path + o["path"], o["alias"], o["filter"]);
            }
        }
    }


    private loadBitmaps(jsonData : any, basePathName : string, arrayName : string) : void {
        
        const path : string | undefined = jsonData[basePathName];
        const objects : any | undefined = jsonData[arrayName];

        if (path !== undefined && objects !== undefined) {
                    
            for (let o of objects) {

                this.loadBitmap(o["name"], path + o["path"], o["alias"], 
                    o["filter"], o["repeatx"] ?? false, o["repeaty"] ?? false);
            }
        }
    }


    public loadBitmap(name : string, path : string, alias? : string, 
        filter? : string, repeatx? : boolean, repeaty? : boolean) : void {

        // TODO: Also check other cases
        const linearFilter : boolean = filter === "linear";

        ++ this.totalAssets;

        const image : HTMLImageElement = new Image();
        image.onload = (_ : Event) => {

            ++ this.loaded;

            const bmp : Bitmap = this.renderer.createBitmap(image, linearFilter, repeatx, repeaty);
            this.bitmaps.set(name, bmp);
        }
        image.src = path;
    }


    public loadTilemap(name : string, path : string) : void {

        ++ this.totalAssets;
        
        this.loadTextFile(path, "xml", (str : string) => {

            this.tilemaps.set(name, new Tilemap(str));
            ++ this.loaded;
        });
    }


    public loadSample(name : string, path : string, alias? : string) : void {

        ++ this.totalAssets;

        const xobj : XMLHttpRequest = new XMLHttpRequest();
        xobj.open("GET", path, true);
        xobj.responseType = "arraybuffer";

        xobj.onload = () => {

            if (xobj.readyState == 4 ) {
                this.audio.decodeSample(xobj.response, (sample : AudioSample) => {
                    
                    ++ this.loaded;
                    this.samples.set(name, sample);

                    if (alias !== undefined) {

                        this.samples.set(alias, sample);
                    }
                });
            }
        }
        xobj.send(null);
    }


    public loadDocument(name : string, path : string) : void {

        this.loadTextFile(path, "json", (s : string) => {

            this.documents.set(name, s);
        });
    }


    public parseIndexFile(path : string) : void {

        this.loadTextFile(path, "json", (s : string) => {

            const data : any = JSON.parse(s);
        /*
            this.loadItems(data, (name : string, path : string, alias? : string, filter? : string) => {
                this.loadBitmap(name, path, alias, filter);
            }, "bitmapPath", "bitmaps");
        */
            this.loadBitmaps(data, "bitmapPath", "bitmaps")

            this.loadItems(data, (name : string, path : string) => {
                this.loadTilemap(name, path);
            }, "tilemapPath", "tilemaps");

            this.loadItems(data, (name : string, path : string, alias? : string) => {
                this.loadSample(name, path, alias);
            }, "samplePath", "samples");

            this.loadItems(data, (name : string, path : string) => {
                this.loadDocument(name, path);
            }, "documentPath", "documents");
        });
    }


    public addBitmap(key : string, bmp : Bitmap | undefined) : void {

        if (bmp === undefined)
            return;

        this.bitmaps.set(key, bmp);
    }


    public hasLoaded = () : boolean => this.loaded >= this.totalAssets;


    public getBitmap(name : string) : Bitmap | undefined {

        return this.bitmaps.get(name);
    }


    public getSample(name : string) : AudioSample | undefined {

        return this.samples.get(name);
    }


    public getTilemap(name : string) : Tilemap | undefined {

        return this.tilemaps.get(name);
    }


    public getDocument(name : string) : string | undefined {

        return this.documents.get(name);
    }


    // In range [0,1], actually...
    public getLoadingPercentage = () : number => this.totalAssets == 0 ? 1.0 : this.loaded / this.totalAssets;

}
