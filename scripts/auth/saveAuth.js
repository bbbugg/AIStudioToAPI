/**
 * File: scripts/auth/saveAuth.js
 * Description: Automated script to launch browser, extract authentication state from Google AI Studio, and save to config files
 *
 * Maintainers: iBenzene, bbbugg
 * Original Author: Ellinav
 */

const { firefox } = require("playwright");
const fs = require("fs");
const path = require("path");

// --- Configuration Constants ---
const browserExecutablePath = path.join(__dirname, "..", "camoufox", "camoufox.exe");
const VALIDATION_LINE_THRESHOLD = 200; // Validation line threshold
const CONFIG_DIR = "configs/auth"; // Authentication files directory

/**
 * Ensures that the specified directory exists, creating it if it doesn't.
 * @param {string} dirPath - The path of the directory to check and create.
 */
const ensureDirectoryExists = dirPath => {
    if (!fs.existsSync(dirPath)) {
        console.log(`📂 Directory "${path.basename(dirPath)}" does not exist, creating...`);
        fs.mkdirSync(dirPath);
    }
};

/**
 * Gets the next available authentication file index from the 'configs/auth' directory.
 * @returns {number} - The next available index value.
 */
const getNextAuthIndex = () => {
    const projectRoot = path.join(__dirname, "..");
    const directory = path.join(projectRoot, CONFIG_DIR);

    if (!fs.existsSync(directory)) {
        return 0;
    }

    const files = fs.readdirSync(directory);
    const authRegex = /^auth-(\d+)\.json$/;

    let maxIndex = -1;
    files.forEach(file => {
        const match = file.match(authRegex);
        if (match) {
            const currentIndex = parseInt(match[1], 10);
            if (currentIndex > maxIndex) {
                maxIndex = currentIndex;
            }
        }
    });
    return maxIndex + 1;
};

(async () => {
    // Use project root directory instead of scripts directory
    const projectRoot = path.join(__dirname, "..");
    const configDirPath = path.join(projectRoot, CONFIG_DIR);
    ensureDirectoryExists(configDirPath);

    const newIndex = getNextAuthIndex();
    const authFileName = `auth-${newIndex}.json`;

    console.log(`▶️  Preparing to create new authentication file for account #${newIndex}...`);
    console.log(`▶️  Launching browser: ${browserExecutablePath}`);

    const browser = await firefox.launch({
        executablePath: browserExecutablePath,
        headless: false,
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    console.log("\n--- Please complete the following steps in the newly opened Camoufox window ---");
    console.log(
        "1. The browser will open Google AI Studio. Please log in to your Google account completely on the popup page."
    );
    console.log("2. After successful login and seeing the AI Studio interface, do not close the browser window.");
    console.log('3. Return to this terminal, then press "Enter" to continue...');

    // <<< This is the only modification point: updated to Google AI Studio address >>>
    await page.goto("https://aistudio.google.com/u/0/prompts/new_chat");

    await new Promise(resolve => process.stdin.once("data", resolve));

    // ==================== Capture Account Name ====================

    let accountName = "unknown"; // Default value
    try {
        console.log("🕵️  Attempting to retrieve account name (V3 - Scanning <script> JSON)...");

        // 1. Locate all <script type="application/json"> tags
        const scriptLocators = page.locator('script[type="application/json"]');
        const count = await scriptLocators.count();
        console.log(`   -> Found ${count} JSON <script> tags.`);

        // 2. Define a basic Email regular expression
        // It will match strings like "ouyang5453@gmail.com"
        const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;

        // 3. Iterate through all tags to find the first matching Email
        for (let i = 0; i < count; i++) {
            const content = await scriptLocators.nth(i).textContent();

            if (content) {
                // 4. Search for Email in tag content
                const match = content.match(emailRegex);

                if (match && match[0]) {
                    // 5. Found it!
                    accountName = match[0];
                    console.log(`   -> Successfully retrieved account: ${accountName}`);
                    break; // Exit loop immediately after finding
                }
            }
        }

        if (accountName === "unknown") {
            console.log(`   -> Iterated through all ${count} <script> tags, but no Email found.`);
        }
    } catch (error) {
        console.warn(`⚠️  Unable to automatically retrieve account name (error during V3 scan).`);
        console.warn(`   -> Error: ${error.message}`);
        console.warn(`   -> Will use "unknown" as account name.`);
    }

    // ==================== Smart Validation and Dual-file Save Logic ====================
    console.log("\nRetrieving and validating login status...");
    const currentState = await context.storageState();
    currentState.accountName = accountName;
    const prettyStateString = JSON.stringify(currentState, null, 2);
    const lineCount = prettyStateString.split("\n").length;

    if (lineCount > VALIDATION_LINE_THRESHOLD) {
        console.log(`✅ State validation passed (${lineCount} lines > ${VALIDATION_LINE_THRESHOLD} lines).`);

        const compactStateString = JSON.stringify(currentState);
        const authFilePath = path.join(configDirPath, authFileName);

        fs.writeFileSync(authFilePath, compactStateString);
        console.log(`   📄 Authentication file saved to: ${path.join(CONFIG_DIR, authFileName)}`);
    } else {
        console.log(`❌ State validation failed (${lineCount} lines <= ${VALIDATION_LINE_THRESHOLD} lines).`);
        console.log("   Login status appears to be empty or invalid, file was not saved.");
        console.log("   Please make sure you are fully logged in before pressing Enter.");
    }
    // ===================================================================

    await browser.close();
    console.log("\nBrowser closed.");

    process.exit(0);
})();
