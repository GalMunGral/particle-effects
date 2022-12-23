use std::f32::consts::PI;

use super::webgl::{Geometry, VertexAttrInfo, VertexAttrs};

const RINGS: u32 = 20;
const SLICES: u32 = 20;

macro_rules! ind {
    ($i:expr, $j:expr) => {
        $i * SLICES + $j
    };
}

pub fn make_sphere() -> Geometry {
    let lat_step = PI / (RINGS - 1) as f32;
    let lng_step = 2.0 * PI / SLICES as f32;

    let mut positions = Vec::<f32>::new();
    for i in 0..RINGS {
        for j in 0..SLICES {
            let i = i as f32;
            let j = j as f32;
            positions.push(f32::sin(i * lat_step) * f32::cos(j * lng_step));
            positions.push(f32::sin(i * lat_step) * f32::sin(j * lng_step));
            positions.push(f32::cos(i * lat_step));
        }
    }

    let mut triangles = Vec::<u32>::new();
    for i in 0..RINGS-1 {
        for j in 0..SLICES {
        triangles.push(ind!(i, j));
        triangles.push(ind!(i + 1, j));
        triangles.push(ind!(i, (j + 1) % SLICES));
        triangles.push(ind!(i, (j + 1) % SLICES));
        triangles.push(ind!(i + 1, j));
        triangles.push(ind!(i + 1, (j + 1) % SLICES));
        }
    }

     Geometry {
        triangles,
        attributes: VertexAttrs{
            position: VertexAttrInfo {
                glsl_name: String::from("position"),
                size: 3,
                data: positions,
            },
            normal: None,
            texcoord: None
        }
    }
}

