uniform sampler2D uTexture;
uniform sampler2D uPrevTexture;
uniform vec2 uResolution;
uniform float uTime;

varying vec2 vUv;

float rand(vec2 n) {
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 ip = floor(p);
    vec2 u = fract(p);
    u = u * u * (3.0 - 2.0 * u);

    float res = mix(mix(rand(ip), rand(ip + vec2(1.0, 0.0)), u.x), mix(rand(ip + vec2(0.0, 1.0)), rand(ip + vec2(1.0, 1.0)), u.x), u.y);
    return res * res;
}

float fbm(vec2 x, int numOctaves) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100);
	// Rotate to reduce axial bias
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
    for (int i = 0; i < numOctaves; ++i) {
        v += a * noise(x);
        x = rot * x * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

float blendDarken(float base, float blend) {
    return min(blend, base);
}

vec3 blendDarken(vec3 base, vec3 blend) {
    return vec3(blendDarken(base.r, blend.r), blendDarken(base.g, blend.g), blendDarken(base.b, blend.b));
}

vec3 blendDarken(vec3 base, vec3 blend, float opacity) {
    return (blendDarken(base, blend) * opacity + base * (1.0 - opacity));
}

vec3 bgColor = vec3(1.0, 1.0, 1.0);

float hue2rgb(float f1, float f2, float hue) {
    if (hue < 0.0)
        hue += 1.0;
    else if (hue > 1.0)
        hue -= 1.0;
    float res;
    if ((6.0 * hue) < 1.0)
        res = f1 + (f2 - f1) * 6.0 * hue;
    else if ((2.0 * hue) < 1.0)
        res = f2;
    else if ((3.0 * hue) < 2.0)
        res = f1 + (f2 - f1) * ((2.0 / 3.0) - hue) * 6.0;
    else
        res = f1;
    return res;
}

vec3 hsl2rgb(vec3 hsl) {
    vec3 rgb;
    if (hsl.y == 0.0) {
        rgb = vec3(hsl.z); // Luminance
    } else {
        float f2;
        if (hsl.z < 0.5)
            f2 = hsl.z * (1.0 + hsl.y);
        else
            f2 = hsl.z + hsl.y - hsl.y * hsl.z;
        float f1 = 2.0 * hsl.z - f2;
        rgb.r = hue2rgb(f1, f2, hsl.x + (1.0 / 3.0));
        rgb.g = hue2rgb(f1, f2, hsl.x);
        rgb.b = hue2rgb(f1, f2, hsl.x - (1.0 / 3.0));
    }
    return rgb;
}

vec3 hsl2rgb(float h, float s, float l) {
    return hsl2rgb(vec3(h, s, l));
}

void main() {
    vec4 color = texture2D(uTexture, vUv);
    vec4 colorPrev = texture2D(uPrevTexture, vUv);

    vec2 aspect = vec2(1.0, uResolution.y / uResolution.x);
    vec2 displacement = fbm(vUv * 22.0, 4) * aspect * 0.005;

    vec4 texel = texture2D(uPrevTexture, vUv);
    vec4 texel2 = texture2D(uPrevTexture, vec2(vUv.x + displacement.x, vUv.y));
    vec4 texel3 = texture2D(uPrevTexture, vec2(vUv.x - displacement.x, vUv.y));
    vec4 texel4 = texture2D(uPrevTexture, vec2(vUv.x, vUv.y + displacement.y));
    vec4 texel5 = texture2D(uPrevTexture, vec2(vUv.x, vUv.y - displacement.y));

    vec3 floodColor = texel.rgb;
    floodColor = blendDarken(floodColor, texel2.rgb);
    floodColor = blendDarken(floodColor, texel3.rgb);
    floodColor = blendDarken(floodColor, texel4.rgb);
    floodColor = blendDarken(floodColor, texel5.rgb);

    vec3 waterColor = blendDarken(colorPrev.rgb, floodColor * (1.0 + 0.02), 0.6);

    vec3 gradient = hsl2rgb(fract(uTime), 0.5, 0.5);
    vec3 cursorColor = mix(vec3(1.0), gradient, color.r);

    vec3 finalColor = blendDarken(waterColor, cursorColor, 1.0);

    // gl_FragColor = vec4(vUv, 0.0, 1.0);
    // gl_FragColor = color + colorPrev * 0.5;
    // gl_FragColor = colorPrev * 0.99;
    // gl_FragColor = vec4(displacement, 0.0, 1.0);
    gl_FragColor = texel5;
    gl_FragColor = vec4(waterColor, 1.0);
    gl_FragColor = vec4(color.rgb, 1.0);
    gl_FragColor = vec4(gradient.rgb, 1.0);
    gl_FragColor = vec4(cursorColor.rgb, 1.0);
    gl_FragColor = vec4(finalColor.rgb, 1.0);
    gl_FragColor = vec4(min(bgColor, finalColor * (1.0 + 0.01)) + 0.001, 1.0);
}