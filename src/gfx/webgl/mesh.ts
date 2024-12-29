import { clamp } from "../../math/utility.js";


export class Mesh {


    private vertexBuffer : WebGLBuffer | null;
    private uvBuffer : WebGLBuffer | null;
    private indexBuffer : WebGLBuffer | null;

    private vertexCount : number;
    private uvCount : number;
    private elementCount : number;
    private maxElementCount : number;

    private readonly gl : WebGLRenderingContext;


    constructor(gl : WebGLRenderingContext, 
            vertices : Float32Array,     
            indices : Uint16Array,
            textureCoordinates : Float32Array | null | undefined = undefined, // No idea why this can be null
            dynamic : boolean = false) {

        this.vertexBuffer = gl.createBuffer();
        this.uvBuffer = textureCoordinates === undefined ? null : gl.createBuffer();
        this.indexBuffer = gl.createBuffer();

        const drawType : number = dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, drawType);

        if (textureCoordinates !== undefined) {

            gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, textureCoordinates, drawType);      
        }

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, drawType);

        this.vertexCount = vertices.length;
        this.uvCount = textureCoordinates?.length ?? 0;
        this.elementCount = indices.length;
        this.maxElementCount = indices.length;

        this.gl = gl;
    }


    public bind() : void {

        const gl : WebGLRenderingContext = this.gl;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

        if (this.uvBuffer !== null) {

            gl.enableVertexAttribArray(1);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
            gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
        }
        else {

            gl.disableVertexAttribArray(1);
        }

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    }


    public draw() : void {
        
        const gl : WebGLRenderingContext = this.gl;

        gl.drawElements(gl.TRIANGLES, this.elementCount, gl.UNSIGNED_SHORT, 0);
    }


    public dispose() : void {
        
        const gl : WebGLRenderingContext = this.gl;

        gl.deleteBuffer(this.vertexBuffer);
        gl.deleteBuffer(this.indexBuffer);

        if (this.uvBuffer !== null){

            gl.deleteBuffer(this.uvBuffer);
        }
    }


    public updateVertices(newVertices : Float32Array) : boolean {

        const gl : WebGLRenderingContext = this.gl; 

        if (newVertices.length > this.vertexCount) {    

            console.warn("Vertex buffer overflow, refuse to update data!");
            return false;
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, newVertices);

        return true;
    }


    public updateTextureCoordinates(newTexCoords : Float32Array) : boolean {

        const gl : WebGLRenderingContext = this.gl;

        if (newTexCoords.length > this.uvCount) {

            console.warn("UV buffer overflow, refuse to update data!");
            return false;
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, newTexCoords);

        return true;
    }


    public updateIndices(newIndices : Uint16Array) : boolean {

        const gl : WebGLRenderingContext = this.gl;

        if (newIndices.length > this.maxElementCount) {

            console.warn("Index buffer overflow, refuse to update data!");

            return false;
        }

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, newIndices);

        this.elementCount = newIndices.length;

        return true;
    }


    public updateElementCount(newCount : number) : void {

        this.elementCount = clamp(newCount, 0, this.maxElementCount);
    }


    public getMaxElementCount = () : number => this.maxElementCount;
}
