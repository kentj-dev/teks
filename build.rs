//! The inbox UI in `web/dist` is compiled into the binary, but it is build output and not
//! committed. Fail early with instructions instead of a confusing `rust-embed` error.

fn main() {
    println!("cargo:rerun-if-changed=web/dist");
    if !std::path::Path::new("web/dist/index.html").exists() {
        panic!(
            "\n\nThe Teks inbox frontend has not been built yet (web/dist is missing).\n\
             Build it once, then run cargo again:\n\n    \
             cd web && npm ci && npm run build\n\n"
        );
    }
}
