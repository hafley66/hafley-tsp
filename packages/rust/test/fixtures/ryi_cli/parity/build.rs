fn main() {
    println!("cargo:rustc-env=SPREFA_BUILD_GIT_HASH=test-hash");
    println!("cargo:rustc-env=SPREFA_BUILD_DATETIME=test-datetime");
}
