import { Mesh } from "./mesh.js";


export class SpriteBatch {


    private bufferMesh : Mesh;

    private vertexBuffer : Float32Array;
    private uvBuffer : Float32Array;

    private elementPointer : number = 0;
    private prepared : boolean = false;

    private maxSize : number;


    public get outputMesh() : Mesh {

        return this.bufferMesh;
    }


    constructor(gl : WebGLRenderingContext, maxSize : number) {

        const zerosFloat : Float32Array = new Float32Array((new Array<number> (maxSize*6*2)).fill(0.0));
        const indices : Uint16Array = new Uint16Array (maxSize*6);
        for (let i = 0; i < indices.length; ++ i) {

            indices[i] = i;
        }

        this.bufferMesh = new Mesh(gl, zerosFloat, indices, zerosFloat, true);

        this.vertexBuffer = new Float32Array (maxSize*6*2);
        this.uvBuffer = new Float32Array (maxSize*6*2);

        this.maxSize = maxSize;
    }


    public flush() : void {

        this.elementPointer = 0;
        this.prepared = false;
    }

    
    public pushSprite(sx : number, sy : number, sw : number, sh : number,
        dx : number, dy : number, dw : number, dh : number) : void {

        if (this.elementPointer + 6 >= this.maxSize) {

            console.warn("Sprite batch overflow! Cannot add more objects.");
            return;
        }

        // Push data to the buffers

        const p : number = this.elementPointer*2;

        this.vertexBuffer[p] = dx;
        this.vertexBuffer[p + 1] = dy;

        this.vertexBuffer[p + 2] = dx + dw;
        this.vertexBuffer[p + 3] = dy;

        this.vertexBuffer[p + 4] = dx + dw;
        this.vertexBuffer[p + 5] = dy + dh;

        this.vertexBuffer[p + 6] = dx + dw;
        this.vertexBuffer[p + 7] = dy + dh;

        this.vertexBuffer[p + 8] = dx;
        this.vertexBuffer[p + 9] = dy + dh;
        
        this.vertexBuffer[p + 10] = dx;
        this.vertexBuffer[p + 11] = dy;

        this.uvBuffer[p] = sx;
        this.uvBuffer[p + 1] = sy;
        this.uvBuffer[p + 2] = sx + sw;
        this.uvBuffer[p + 3] = sy;
        this.uvBuffer[p + 4] = sx + sw;
        this.uvBuffer[p + 5] = sy + sh;
        this.uvBuffer[p + 6] = sx + sw;
        this.uvBuffer[p + 7] = sy + sh;
        this.uvBuffer[p + 8] = sx;
        this.uvBuffer[p + 9] = sy + sh;
        this.uvBuffer[p + 10] = sx;
        this.uvBuffer[p + 11] = sy;
    
        this.elementPointer += 6;
    }


    public prepareMesh() : boolean {

        if (this.elementPointer == 0) {

            return false;
        }

        if (this.prepared) {

            return true;
        }

        const max : number = this.bufferMesh.getMaxElementCount();
        if (this.elementPointer > max) {

            console.warn("Sprite batch buffer overflow!");
            this.elementPointer = max;
        }

        // Update vertices & uv coords. Note that there is no need to
        // update the index buffer.
        this.bufferMesh.updateVertices(this.vertexBuffer.subarray(0, this.elementPointer*6*2));
        this.bufferMesh.updateTextureCoordinates(this.uvBuffer.subarray(0, this.elementPointer*6*2));
        this.bufferMesh.updateElementCount(this.elementPointer);

        this.prepared = true;

        return true;
    }


    public anythingToDraw = () : boolean => this.prepared;
}
