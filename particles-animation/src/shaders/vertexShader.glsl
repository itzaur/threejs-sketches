attribute vec2 reference;

uniform float uSize;
uniform vec2 uResolution;
uniform sampler2D uPositions;

varying vec2 vUv;
varying float vShade;

void main() {
    vec3 pos = texture2D(uPositions, reference).xyz;

    vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;

    vShade = texture2D(uPositions, reference).w;

    gl_PointSize = uSize * uResolution.y;
    gl_PointSize *= (1.0 / -viewPosition.z);

    gl_Position = projectedPosition;

    vUv = uv;
}