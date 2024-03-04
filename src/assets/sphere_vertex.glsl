#version 300 es

uniform mat4 m;
uniform mat4 v;
uniform mat4 p;

in vec4 position;
in vec3 color;

out vec3 vNormal;
out vec3 vColor;

void main() {
    gl_Position = p * v * m * position;
    vNormal = position.xyz;
    vColor = color;
}
