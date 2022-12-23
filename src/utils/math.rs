use super::web::random_f32;

pub fn rand_range(min: f32, max: f32) -> f32 {
    min + (max - min) * random_f32()
}

pub fn clamp(n: f32, min: f32, max: f32) -> f32 {
    f32::max(f32::min(n, max), min)
}
