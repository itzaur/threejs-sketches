// uniform sampler2D uTexture;

varying vec2 vUv;
varying float vShade;

void main() {
    vec3 color = vec3(0.2);
    float alpha = 1.0 - length(gl_PointCoord.xy - 0.5) * 2.0;
    float finalAlpha = alpha * 0.07 + smoothstep(0.0, 1.0, alpha) * 0.1 + smoothstep(0.9 - fwidth(alpha), 0.9, alpha) * 0.5 * 1.9;

    float opacity = 1.0 - (0.3 + 0.7 * vShade);

    gl_FragColor = vec4(color, finalAlpha * opacity);
}