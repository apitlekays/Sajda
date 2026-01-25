fn main() {
    // Link Swift package for native macOS Core Location
    #[cfg(target_os = "macos")]
    {
        use swift_rs::SwiftLinker;

        SwiftLinker::new("10.15")
            .with_package("SajdaLocation", "./swift/SajdaLocation/")
            .link();
    }

    tauri_build::build()
}
