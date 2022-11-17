#version 300 es

precision highp float;

const float phong_exp = 50.0;
const vec3 light = vec3(1, 0, 1);
const vec3 lightColor = vec3(1, 1, 1);
uniform vec3 eye;

in vec3 vColor;
in vec3 vNormal;

out vec4 fragColor;

void main() { 
    vec3 normal = normalize(vNormal);

    vec3 l = normalize(light);
    float lambert = clamp(dot(l, normal), 0.0, 1.0);
    vec3 diffuse = lambert * vColor;

    vec3 r = 2.0 * dot(normal, l) * normal - l;
    vec3 e = normalize(eye);
    vec3 specular = float(dot(normal, l) > 0.0) * pow(clamp(dot(r, e), 0.0, 1.0), phong_exp) * lightColor;
    
    fragColor = vec4(diffuse + specular, 1);
}
