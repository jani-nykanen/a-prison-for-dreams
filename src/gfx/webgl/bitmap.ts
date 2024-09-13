import { Bitmap } from "../interface.js";


export class WebGLBitmap implements Bitmap {


    private texture : WebGLTexture | null = null;
    private framebuffer : WebGLFramebuffer | null = null;
    private renderbuffer : WebGLRenderbuffer | null = null;

    private readonly gl : WebGLRenderingContext;

    public readonly width : number;
    public readonly height : number;


    constructor(gl : WebGLRenderingContext, 
        image : HTMLImageElement | undefined, 
        linearFilter : boolean = false, repeatx : boolean = false, repeaty : boolean = false,
        makeFramebuffer : boolean = false, width : number = 256, height : number = 256,
        pixeldata : Uint8Array | undefined = undefined) {

        this.texture = gl.createTexture();
        if (this.texture === null) {

            throw new Error("Failed to create a WebGL texture!");
        }

        const filter : number = linearFilter ? gl.LINEAR : gl.NEAREST;

        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
        
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, repeatx ? gl.REPEAT : gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, repeaty ? gl.REPEAT : gl.CLAMP_TO_EDGE);
            
        if (image !== undefined) {

            gl.texImage2D(gl.TEXTURE_2D, 
                0, gl.RGBA, gl.RGBA, 
                gl.UNSIGNED_BYTE, image);

            this.width = image.width;
            this.height = image.height;
        }
        else if (pixeldata !== undefined) {

            gl.texImage2D(gl.TEXTURE_2D, 
                0, gl.RGBA, width, height, 0, 
                gl.RGBA, gl.UNSIGNED_BYTE, pixeldata);

            this.width = width;
            this.height = height;
        }
        else {

            gl.texImage2D(gl.TEXTURE_2D, 
                0, gl.RGBA, width, height, 0, 
                gl.RGBA, gl.UNSIGNED_BYTE, null);

            this.width = width;
            this.height = height;
        }

        if (makeFramebuffer) {  

            this.createFramebuffer(gl, width, height);
        }

        gl.bindTexture(gl.TEXTURE_2D, null);
        
        this.gl = gl;
    }


    private createFramebuffer(gl : WebGLRenderingContext, width : number, height : number) : void {

        this.framebuffer = gl.createFramebuffer();
        if (this.framebuffer === null) {

            throw new Error("Failed to create a WebGL framebuffer!");
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, 
            gl.TEXTURE_2D, this.texture, 0);

        this.renderbuffer = gl.createRenderbuffer();
        if (this.renderbuffer === null) {

            throw new Error("Failed to create a WebGL renderbuffer!");
        }

        gl.bindRenderbuffer(gl.RENDERBUFFER, this.renderbuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL, width, height);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, this.renderbuffer);
            
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    }


    public bind() : void {

        const gl : WebGLRenderingContext = this.gl;

        gl.bindTexture(gl.TEXTURE_2D, this.texture);
    }


    public setRenderTarget() : void {

        if (this.framebuffer === null) return;

        const gl : WebGLRenderingContext = this.gl;

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    }


    public cloneToBitmap(target : WebGLBitmap) : void {

        const gl : WebGLRenderingContext = this.gl;

        gl.bindTexture(gl.TEXTURE_2D, target.texture);

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 0, 0, this.width, this.height, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        gl.bindTexture(gl.TEXTURE_2D, null);
    }


    public dispose() : void {

        const gl : WebGLRenderingContext = this.gl;

        if (this.renderbuffer !== null) {

            gl.deleteRenderbuffer(this.renderbuffer);
        }

        if (this.framebuffer !== null) {

            gl.deleteFramebuffer(this.framebuffer);
        }

        if (this.texture !== null) {

            gl.deleteTexture(this.texture);
        }
    }
}
