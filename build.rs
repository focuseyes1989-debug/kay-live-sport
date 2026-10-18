fn main() {
    println!("cargo:rerun-if-changed=assets/live-sport.ico");
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("windows") {
        winresource::WindowsResource::new()
            .set_icon("assets/live-sport.ico")
            .set("ProductName", "KAY LIVE SPORT")
            .set("FileDescription", "KAY LIVE SPORT")
            .compile()
            .expect("Could not embed Windows app icon");
    }
}
