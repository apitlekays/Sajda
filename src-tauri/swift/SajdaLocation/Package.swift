// swift-tools-version:5.5
import PackageDescription

let package = Package(
    name: "SajdaLocation",
    platforms: [.macOS(.v10_15)],
    products: [
        .library(
            name: "SajdaLocation",
            type: .static,
            targets: ["SajdaLocation"]
        ),
    ],
    dependencies: [
        .package(url: "https://github.com/Brendonovich/swift-rs", from: "1.0.7"),
    ],
    targets: [
        .target(
            name: "SajdaLocation",
            dependencies: [
                .product(name: "SwiftRs", package: "swift-rs"),
            ],
            path: "Sources/SajdaLocation"
        ),
    ]
)
