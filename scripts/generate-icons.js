#!/usr/bin/env node
/**
 * Icon Generation Script for Sajda
 *
 * Generates all required icons from source images:
 * - icon_color.png (full-color app icon) -> app icons, Windows tray
 * - icon.png (template/silhouette) -> macOS menu bar
 *
 * Usage: node scripts/generate-icons.js
 */

import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { writeFileSync, existsSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = join(__dirname, '../src-tauri/icons');

// Source icons
const COLOR_ICON = join(ICONS_DIR, 'icon_color.png');
const TEMPLATE_ICON = join(ICONS_DIR, 'icon.png');

// Icons to generate from color source
const APP_ICONS = [
    { name: '32x32.png', size: 32 },
    { name: '128x128.png', size: 128 },
    { name: '128x128@2x.png', size: 256 },
];

// ICO sizes for Windows
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];

async function generatePng(source, output, size) {
    await sharp(source)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(output);
    console.log(`  Created: ${output} (${size}x${size})`);
}

async function generateIco(source, output) {
    // Generate temp PNGs for each size
    const tempFiles = [];

    for (const size of ICO_SIZES) {
        const tempPath = join(ICONS_DIR, `_temp_${size}.png`);
        await sharp(source)
            .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png()
            .toFile(tempPath);
        tempFiles.push(tempPath);
    }

    // Convert to ICO
    const icoBuffer = await pngToIco(tempFiles);
    writeFileSync(output, icoBuffer);
    console.log(`  Created: ${output} (${ICO_SIZES.join(', ')})`);

    // Clean up temp files
    for (const tempFile of tempFiles) {
        unlinkSync(tempFile);
    }
}

async function main() {
    console.log('Generating Sajda icons...\n');

    // Verify source icons exist
    if (!existsSync(COLOR_ICON)) {
        console.error(`Error: Source icon not found: ${COLOR_ICON}`);
        process.exit(1);
    }

    if (!existsSync(TEMPLATE_ICON)) {
        console.error(`Error: Template icon not found: ${TEMPLATE_ICON}`);
        process.exit(1);
    }

    // Generate app icons from color source
    console.log('Generating app icons from icon_color.png:');
    for (const icon of APP_ICONS) {
        await generatePng(COLOR_ICON, join(ICONS_DIR, icon.name), icon.size);
    }

    // Generate Windows ICO
    console.log('\nGenerating Windows icon.ico:');
    await generateIco(COLOR_ICON, join(ICONS_DIR, 'icon.ico'));

    // Verify template icon exists (don't regenerate, it's manually created)
    console.log('\nVerifying template icons:');
    console.log(`  icon.png (macOS tray template): ${existsSync(TEMPLATE_ICON) ? 'OK' : 'MISSING'}`);
    console.log(`  icon_color.png (Windows tray): ${existsSync(COLOR_ICON) ? 'OK' : 'MISSING'}`);

    console.log('\nIcon generation complete!');
    console.log('\nNote: icon.icns (macOS app icon) must be generated manually using:');
    console.log('  iconutil -c icns <iconset-folder>');
    console.log('Or use an online converter from the 1024x1024 source.');
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
