

export const VertexSource = {


    Textured : 
        
    `
    attribute vec2 vertexPos;
    attribute vec2 vertexUV;
    
    uniform mat4 transform;
    
    uniform vec2 pos;
    uniform vec2 scale;
    
    varying vec2 uv;
    
    
    void main() {
    
        gl_Position = transform*vec4(vertexPos*scale + pos, 0, 1);
        uv = vertexUV;
    }`,
    

    NoTexture : 
        
    `
    attribute vec2 vertexPos;
    
    uniform mat4 transform;
    
    uniform vec2 pos;
    uniform vec2 scale;


    void main() {
    
        gl_Position = transform*vec4(vertexPos*scale + pos, 0, 1);
    }`,
};
    
    
export const FragmentSource = {
    
    Textured : 
    
    `
    precision mediump float;
         
    uniform sampler2D texSampler;
    
    uniform vec4 color;
    
    uniform vec2 texPos;
    uniform vec2 texScale;
    
    varying vec2 uv;
    
    
    void main() {
    
        vec2 tex = uv * texScale + texPos;    
        vec4 res = texture2D(texSampler, tex)*color;
        
        // Needed to make the stencil buffer work
        if (res.a < 1.0/255.0) {
              discard;
        }
        gl_FragColor = res;
    }`,


    TexturedFixedColor : 
    
    `
    precision mediump float;
         
    uniform sampler2D texSampler;
    
    uniform vec4 color;
    
    uniform vec2 texPos;
    uniform vec2 texScale;
    
    varying vec2 uv;
    
    
    void main() {
    
        vec2 tex = uv*texScale + texPos;    
        float alpha = color.a*texture2D(texSampler, tex).a;
    
        // Needed to make the stencil buffer work
        if (alpha < 1.0/255.0) {
              discard;
        }
        gl_FragColor = vec4(color.rgb, alpha);
    }`,


    TexturedInvert : 
    
    `
    precision mediump float;
         
    uniform sampler2D texSampler;
    
    uniform vec4 color;
    
    uniform vec2 texPos;
    uniform vec2 texScale;
    
    varying vec2 uv;
    
    
    void main() {
    
        vec2 tex = uv * texScale + texPos;    
        vec4 res = texture2D(texSampler, tex) * color;
        
        // Needed to make the stencil buffer work
        if (res.a < 1.0/255.0) {
            discard;
      }
        gl_FragColor = vec4(vec3(1.0, 1.0, 1.0) - res.xyz, res.w);
    }`,
    
    
    NoTexture : 
    
    `
    precision mediump float;
    
    uniform vec4 color;
    

    void main() {
    
        gl_FragColor = color;
    }`,
    
};