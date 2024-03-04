#version 300 es

precision highp float;

const vec3 lightColor = vec3(1, 1, 1);
const vec3 l = normalize(vec3(1, 0, 1));

uniform vec3 eye;

in vec3 vColor;
in vec3 vNormal;

out vec4 fragColor;

void main() { 
    vec3 normal = normalize(vNormal);

    float lambert = clamp(dot(l, normal), 0.0, 1.0);
    vec3 diffuse = lambert * vColor;

    vec3 r = 2.0 * dot(normal, l) * normal - l;
    vec3 e = normalize(eye);
    vec3 specular = pow(clamp(dot(r, e), 0.0, 1.0), 100.0) * lightColor;
    
    fragColor = vec4(diffuse + specular, 1);
}
