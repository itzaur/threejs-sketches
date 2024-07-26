void main() {
    vec3 color = vec3(0.2);
    float alpha = 1.0 - length(gl_PointCoord.xy - 0.5) * 2.0;
    float finalAlpha = alpha * 0.05 + smoothstep(0.0, 1.0, alpha) * 0.1 + smoothstep(0.9 - fwidth(alpha), 0.9, alpha) * 0.5;

    gl_FragColor = vec4(color, finalAlpha);
}