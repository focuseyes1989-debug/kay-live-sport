fn main() {
    println!("cargo:rerun-if-env-changed=KAY_TV");
    let edition = if std::env::var("KAY_TV").as_deref() == Ok("1") { "tv" } else { "mobile" };
    println!("cargo:rustc-check-cfg=cfg(kay_tv)");
    if edition == "tv" { println!("cargo:rustc-cfg=kay_tv"); }
    tauri_build::build()
}
