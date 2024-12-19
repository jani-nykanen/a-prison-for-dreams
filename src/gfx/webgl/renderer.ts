import { RGBA } from "../../math/rgba.js";
import { Vector } from "../../math/vector.js";
import { Bitmap, Canvas, Renderer, TransformTarget } from "../interface.js";
import { WebGLBitmap } from "./bitmap.js";
import { WebGLCanvas } from "./canvas.js";
import { Mesh } from "./mesh.js";
import { Shader } from "./shader.js";
import { FragmentSource, VertexSource } from "./shadersource.js";
import { WebGLTransform } from "./transform.js";
import { SpriteBatch } from "./spritebatch.js";


const createCanvasElement = (width : number, height : number) : [HTMLCanvasElement, WebGLRenderingContext | null] => {

    const div : HTMLDivElement = document.createElement("div");
    div.id = "base_div";
    div.setAttribute("style", "position: absolute; top: 0; left: 0; z-index: -1;");
    
    const canvas : HTMLCanvasElement = document.createElement("canvas");
    canvas.setAttribute("style", "position: absolute; top: 0; left: 0; z-index: -1;");

    canvas.width = width;
    canvas.height = height;

    div.appendChild(canvas);
    document.body.appendChild(div);

    return [
        canvas, 
        canvas.getContext("webgl", {alpha: false, antialias: true, stencil: true})
    ];
}


const createRectangleMesh = (gl : WebGLRenderingContext) : Mesh =>
    new Mesh(
        gl,
        new Float32Array([
            0, 0,
            1, 0,
            1, 1,
            0, 1,
        ]),
        new Uint16Array([
            0, 1, 2, 
            2, 3, 0
        ]),
        new Float32Array([
            0, 0,
            1, 0,
            1, 1,
            0, 1
    ]));


const initGL = (gl : WebGLRenderingContext) : void => {

    gl.activeTexture(gl.TEXTURE0);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, 
        gl.ONE_MINUS_SRC_ALPHA, gl.ONE, 
        gl.ONE_MINUS_SRC_ALPHA);

    // TODO: Useless? (leftover from an older project)
    gl.enableVertexAttribArray(0);
    gl.enableVertexAttribArray(1);

    gl.stencilMask(0xff);
    gl.disable(gl.STENCIL_TEST);
}


export const enum ShaderType {

    Textured = 0,
    NoTexture = 1,
    FixedColorTextured = 2,
    InvertTextured = 3,
    SwapRedAndBlue = 4,
    BlackAndWhite = 5,
};


export const enum StencilCondition {

    Always = 0, 
    NotEqual = 1,
    Equal = 2,
    GreaterOrEqual = 3,
    LessOrEqual = 4,
    Less = 5,
    Greater = 6
};


export const enum StencilOperation {

    Keep = 0,
    Zero = 1,
};


export class WebGLRenderer implements Renderer {


    private canvas : WebGLCanvas;
    private fixedSizeCanvas : boolean = true;
    private preserveSquarePixels : boolean = true;

    private htmlCanvas : HTMLCanvasElement;
    private gl : WebGLRenderingContext;

    private screenWidth : number = 1;
    private screenHeight : number = 1;

    private dynamicCanvas : boolean;
    private maxCanvasWidth : number | undefined;
    private maxCanvasHeight : number | undefined;
    private targetWidth : number;
    private targetHeight : number;

    private canvasPos : Vector;
    private canvasScale : Vector;

    private meshRect : Mesh;
    private internalTransform : WebGLTransform;
    private canvasTransform : WebGLTransform;

    private shaders : Map<ShaderType, Shader>;
    private activeShader : Shader | undefined = undefined;

    private activeMesh : Mesh | undefined = undefined;
    private activeBitmap : WebGLBitmap | undefined = undefined;
    private activeColor : RGBA;


    public get width() : number {

        return this.screenWidth;
    }


    public get height() : number {

        return this.screenHeight;
    }


    public get canvasWidth() : number {

        return this.canvas.width;
    }


    public get canvasHeight() : number {

        return this.canvas.height;
    }


    constructor(canvasWidth : number | undefined, canvasHeight : number | undefined, 
        preserveSquarePixels : boolean = false,  
        dynamicCanvas : boolean = false, 
        linearFilter : boolean = false,
        maxCanvasWidth : number | undefined = undefined, 
        maxCanvasHeight : number | undefined = undefined) {

        const [hcanvas, gl] : [HTMLCanvasElement, WebGLRenderingContext] = createCanvasElement(window.innerWidth, window.innerHeight);
        if (gl === null) {

            throw new Error("Failed to create a WebGL context!");
        } 

        this.htmlCanvas = hcanvas;
        this.gl = gl;

        initGL(gl);

        this.meshRect = createRectangleMesh(gl);
        this.internalTransform = new WebGLTransform((transf : WebGLTransform) => transf.use(this.activeShader));
        this.internalTransform.setTarget(TransformTarget.Camera);

        this.canvasTransform = new WebGLTransform((transf : WebGLTransform) => transf.use(this.activeShader));
        this.canvas = new WebGLCanvas(this, this.canvasTransform, this.gl, canvasWidth, canvasHeight, linearFilter);
        this.fixedSizeCanvas = canvasWidth !== undefined && canvasHeight !== undefined;

        this.shaders = new Map<ShaderType, Shader> ();
        this.shaders.set(ShaderType.Textured, 
            new Shader(gl, VertexSource.Textured, FragmentSource.Textured));
        this.shaders.set(ShaderType.NoTexture, 
            new Shader(gl, VertexSource.NoTexture, FragmentSource.NoTexture));
        this.shaders.set(ShaderType.FixedColorTextured, 
            new Shader(gl, VertexSource.Textured, FragmentSource.TexturedFixedColor));
        this.shaders.set(ShaderType.InvertTextured, 
            new Shader(gl, VertexSource.Textured, FragmentSource.TexturedInvert));
        this.shaders.set(ShaderType.SwapRedAndBlue, 
            new Shader(gl, VertexSource.Textured, FragmentSource.TexturedSwapRedBlue));   
        this.shaders.set(ShaderType.BlackAndWhite, 
            new Shader(gl, VertexSource.Textured, FragmentSource.TexturedBlackAndWhite));   
        this.activeShader = this.shaders.get(ShaderType.Textured);
        this.activeShader.use();

        this.canvasPos = new Vector();
        this.canvasScale = new Vector(1, 1);

        this.activeColor = new RGBA();

        this.dynamicCanvas = dynamicCanvas;
        this.preserveSquarePixels = preserveSquarePixels;
        this.maxCanvasWidth = maxCanvasWidth;
        this.maxCanvasHeight = maxCanvasHeight;
        this.targetWidth = canvasWidth;
        this.targetHeight = canvasHeight;

        this.resize(window.innerWidth, window.innerHeight);
        window.addEventListener("resize", () => this.resize(window.innerWidth, window.innerHeight));
    }


    private resizeCanvas(width : number, height : number) : void {

        if (this.canvas.width == width && this.canvas.height == height)
            return;

        // Compute new optimal size
        const targetRatio : number = this.targetWidth/this.targetHeight;
        const windowRatio : number = width/height;

        let newWidth : number = 0;
        let newHeight : number = 0;

        if (windowRatio >= targetRatio) {

            newWidth = Math.round(windowRatio*this.targetHeight);
            newHeight = this.targetHeight;
        }
        else {

            newWidth = this.targetWidth;
            newHeight = Math.round(this.targetWidth/windowRatio);
        }

        newWidth = Math.min(newWidth, this.maxCanvasWidth);
        newHeight = Math.min(newHeight, this.maxCanvasHeight);

        this.canvas.recreate(this.gl, newWidth, newHeight);
    }


    public resize(width : number, height : number) : void {

        const gl : WebGLRenderingContext  = this.gl;

        gl.viewport(0, 0, width, height);
        
        this.htmlCanvas.width = width;
        this.htmlCanvas.height = height;

        this.screenWidth = width;
        this.screenHeight = height;

        if (!this.fixedSizeCanvas) {

            return;
        }

        if (this.dynamicCanvas) {

            this.resizeCanvas(width, height);
        }

        let m : number = Math.min(width / this.canvas.width, height / this.canvas.height);
        if (m > 1.0 && this.preserveSquarePixels)
            m |= 0;

        this.canvasScale.x = m*this.canvas.width;
        this.canvasScale.y = m*this.canvas.height;

        this.canvasPos.x = width/2 - this.canvasScale.x/2;
        this.canvasPos.y = height/2 - this.canvasScale.y/2;

        this.internalTransform.view(this.screenWidth, this.screenHeight);
    }


    public changeShader(type : ShaderType) : void {

        const shader : Shader | undefined = this.shaders.get(type);
        if (shader === undefined || this.activeShader === shader)
            return;

        this.activeShader = shader;
        shader.use();

        this.canvasTransform.use(shader);
        shader.setColor(
            this.activeColor.r, 
            this.activeColor.g, 
            this.activeColor.b, 
            this.activeColor.a);
    }


    public clear(r : number, g : number, b : number) : void {

        const gl : WebGLRenderingContext = this.gl;
        gl.clearColor(r, g, b, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }


    public bindTexture(bmp : WebGLBitmap | undefined) : void {

        if (this.activeBitmap === bmp)
            return;

        this.activeBitmap = bmp;
        bmp?.bind();
    }   


    public drawMesh(mesh? : Mesh) : void {

        mesh = mesh ?? this.meshRect;

        if (this.activeMesh !== mesh) {

            this.activeMesh = mesh;
            mesh.bind();
        }
        mesh.draw();
    }


    public setColor(r : number, g : number, b : number, a : number) : void {

        this.activeColor = new RGBA(r, g, b, a);
        this.activeShader?.setColor(r, g, b, a);
    }


    public setAlpha(alpha : number) : void {

        this.activeColor.a = alpha;

        this.activeShader?.setColor(
            this.activeColor.r, 
            this.activeColor.g, 
            this.activeColor.b, 
            alpha);
    }


    public applyTransform() : void {

        if (this.activeShader === undefined)
            return;

        this.canvasTransform.use(this.activeShader);
    }


    public setVertexTransform(x : number = 0, y : number = 0, w : number = 1, h : number = 1) : void {

        this.activeShader?.setVertexTransform(x, y, w, h);
    }


    public setFragmenTransform(x : number = 0, y : number = 0, w : number = 1, h : number = 1) : void {

        this.activeShader?.setFragTransform(x, y, w, h);
    }


    public drawToCanvas(cb: (canvas: Canvas) => void) : void {

        if (!this.fixedSizeCanvas) {

            cb(this.canvas);
            return;
        }

        const gl : WebGLRenderingContext  = this.gl;

        gl.viewport(0, 0, this.canvas.width, this.canvas.height);

        this.canvas.setRenderTarget();
        cb(this.canvas);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        gl.viewport(0, 0, this.screenWidth, this.screenHeight);
    }


    public refresh() : void {

        if (!this.fixedSizeCanvas)
            return;

        const gl : WebGLRenderingContext  = this.gl;
        const shader : Shader | undefined = this.shaders.get(ShaderType.Textured);
        if (shader === undefined)
            return;

        if (shader !== this.activeShader) {

            shader.use();
        }
        this.internalTransform.use(shader);

        shader.setVertexTransform(
            Math.round(this.canvasPos.x),  Math.round(this.canvasPos.y + this.canvasScale.y), 
            Math.round(this.canvasScale.x), -Math.round(this.canvasScale.y));
        shader.setFragTransform(0, 0, 1, 1);
        shader.setColor(1, 1, 1, 1);
        
        this.clear(0, 0, 0);

        this.meshRect.bind();
        this.canvas.bind();
        this.meshRect.draw();

        gl.bindTexture(gl.TEXTURE_2D, null);

        if (shader !== this.activeShader) {

            this.activeShader?.use();
        }

        this.activeMesh?.bind();
        this.activeBitmap?.bind();
        this.activeShader?.setColor(
            this.activeColor.r, 
            this.activeColor.g, 
            this.activeColor.b, 
            this.activeColor.a);
    }
    

    public createBitmap(img : HTMLImageElement, 
        linearFilter : boolean = false, 
        repeatx : boolean = false, 
        repeaty : boolean = false) : Bitmap {

        const gl : WebGLRenderingContext = this.gl;

        return new WebGLBitmap(gl, img, linearFilter, repeatx, repeaty);
    }


    public nullActiveBitmap() : void {

        this.activeBitmap = null;
    }


    public cloneCanvasToBufferBitmap() : void {

        this.canvas.cloneToBufferBitmap();
    }


    public createBitmapFromPixelData(pixels : Uint8Array, width : number, height : number) : Bitmap {

        return new WebGLBitmap(this.gl, undefined, false, false, false, false, width, height, pixels);
    }


    public setStencilCondition(cond : StencilCondition) {

        const gl : WebGLRenderingContext  = this.gl;

        const FUNCTION_LOOKUP : number[] = [gl.ALWAYS, gl.NOTEQUAL, gl.EQUAL, gl.GEQUAL, gl.LEQUAL, gl.LESS, gl.GREATER];

        gl.stencilFunc(FUNCTION_LOOKUP[cond], 1, 0xff);
    }


    public setStencilOperation(op : StencilOperation) {

        const gl : WebGLRenderingContext  = this.gl;

        const FAIL_LOOKUP : number[] = [gl.KEEP, gl.ZERO];
        const PASS_LOOKUP : number[] = [gl.REPLACE, gl.ZERO]

        gl.stencilOp(FAIL_LOOKUP[op], FAIL_LOOKUP[op], PASS_LOOKUP[op]);
    } 


    public clearStencilBuffer() {

        const gl : WebGLRenderingContext  = this.gl;

        gl.clear(gl.STENCIL_BUFFER_BIT);
    }


    public toggleStencilTest(state : boolean) {

        const gl : WebGLRenderingContext  = this.gl;

        state ? gl.enable(gl.STENCIL_TEST) : gl.disable(gl.STENCIL_TEST);
    }
}
