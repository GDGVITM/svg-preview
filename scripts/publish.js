const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables from .env file
const envPath = path.join(__dirname, '../.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error('Error loading .env file:', result.error.message);
    process.exit(1);
}

// Configuration
const VSCE_TOKEN_ENV = 'VSCE_PAT';
const OVSX_TOKEN_ENV = 'OVSX_PAT';

function validateEnvironment() {
    const vsceToken = process.env[VSCE_TOKEN_ENV];
    const ovsxToken = process.env[OVSX_TOKEN_ENV];

    if (!vsceToken) {
        console.error(`Error: ${VSCE_TOKEN_ENV} is not set in .env file`);
        process.exit(1);
    }

    if (!ovsxToken) {
        console.error(`Error: ${OVSX_TOKEN_ENV} is not set in .env file`);
        process.exit(1);
    }
}

function getPackageVersion() {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
    return packageJson.version;
}

function publishToMarketplace(registry) {
    const version = getPackageVersion();
    console.log(`Publishing version ${version} to ${registry}...`);

    try {
        if (registry === 'vsce') {
            const token = process.env[VSCE_TOKEN_ENV];
            execSync(`vsce publish -p ${token}`, { stdio: 'inherit' });
            console.log('Successfully published to VS Code Marketplace');
        } else if (registry === 'ovsx') {
            const token = process.env[OVSX_TOKEN_ENV];
            execSync(`ovsx publish -p ${token}`, { stdio: 'inherit' });
            console.log('Successfully published to Open VSX Registry');
        }
    } catch (error) {
        console.error(`Failed to publish to ${registry}:`, error.message);
        process.exit(1);
    }
}

// Verify the built files exist
const distPath = path.join(__dirname, '../dist');
if (!fs.existsSync(distPath)) {
    console.error('Error: dist directory not found. Run build first!');
    process.exit(1);
}

// Main execution
console.log('Starting publication process...');

// Validate environment variables
validateEnvironment();

// Publish to both marketplaces
publishToMarketplace('vsce');
publishToMarketplace('ovsx');

console.log('Publication process completed successfully!');