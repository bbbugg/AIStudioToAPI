/**
 * File: src/auth/authSource.js
 * Description: Authentication source manager that loads and validates authentication data from environment variables or config files
 *
 * Maintainers: iBenzene, bbbugg
 * Original Author: Ellinav
 */

const fs = require("fs");
const path = require("path");

/**
 * Authentication Source Management Module
 * Responsible for loading and managing authentication information from environment variables or file system
 */
class AuthSource {
    constructor(logger) {
        this.logger = logger;
        this.authMode = "file";
        this.availableIndices = [];
        this.initialIndices = [];
        this.accountNameMap = new Map();

        if (process.env.AUTH_JSON_0 || process.env.AUTH_JSON_1) {
            this.authMode = "env";
            this.logger.info(
                "[Auth] Detected AUTH_JSON_* environment variables, switching to environment variable authentication mode."
            );
        } else {
            this.logger.info(
                '[Auth] No environment variable authentication detected, will use files in "configs/auth/" directory.'
            );
        }

        this._discoverAvailableIndices();
        this._preValidateAndFilter();

        if (this.availableIndices.length === 0) {
            this.logger.error(
                `[Auth] Fatal error: No valid authentication sources found in '${this.authMode}' mode.`
            );
            throw new Error("No valid authentication sources found.");
        }
    }

    removeAuth(index) {
        if (this.authMode !== "file") {
            throw new Error("Account deletion is only supported when using file-based auth.");
        }
        if (!Number.isInteger(index)) {
            throw new Error("Invalid account index.");
        }

        const authFilePath = path.join(process.cwd(), "configs", "auth", `auth-${index}.json`);
        if (!fs.existsSync(authFilePath)) {
            throw new Error(`Auth file for account #${index} does not exist.`);
        }

        try {
            fs.unlinkSync(authFilePath);
        } catch (error) {
            throw new Error(`Failed to delete auth file for account #${index}: ${error.message}`);
        }

        this.accountNameMap.delete(index);
        this.initialIndices = this.initialIndices.filter(i => i !== index);
        this.availableIndices = this.availableIndices.filter(i => i !== index);

        return {
            remainingAccounts: this.availableIndices.length,
            removedIndex: index,
        };
    }

    _discoverAvailableIndices() {
        let indices = [];
        if (this.authMode === "env") {
            const regex = /^AUTH_JSON_(\d+)$/;
            for (const key in process.env) {
                const match = key.match(regex);
                if (match && match[1]) {
                    indices.push(parseInt(match[1], 10));
                }
            }
        } else {
            const configDir = path.join(process.cwd(), "configs", "auth");
            if (!fs.existsSync(configDir)) {
                this.logger.warn('[Auth] "configs/auth" directory does not exist.');
                this.availableIndices = [];
                return;
            }
            try {
                const files = fs.readdirSync(configDir);
                const authFiles = files.filter(file => /^auth-\d+\.json$/.test(file));
                indices = authFiles.map(file =>
                    parseInt(file.match(/^auth-(\d+)\.json$/)[1], 10)
                );
            } catch (error) {
                this.logger.error(`[Auth] Failed to scan "configs/auth/" directory: ${error.message}`);
                this.availableIndices = [];
                return;
            }
        }

        this.initialIndices = [...new Set(indices)].sort((a, b) => a - b);
        this.availableIndices = [...this.initialIndices];

        this.logger.info(
            `[Auth] In '${this.authMode}' mode, initially discovered ${this.initialIndices.length
            } authentication sources: [${this.initialIndices.join(", ")}]`
        );
    }

    _preValidateAndFilter() {
        if (this.availableIndices.length === 0) return;

        this.logger.info("[Auth] Starting pre-validation of JSON format for all authentication sources...");
        const validIndices = [];
        const invalidSourceDescriptions = [];

        for (const index of this.availableIndices) {
            const authContent = this._getAuthContent(index);
            if (authContent) {
                try {
                    const authData = JSON.parse(authContent);
                    validIndices.push(index);
                    this.accountNameMap.set(
                        index,
                        authData.accountName || "N/A (unnamed)"
                    );
                } catch (e) {
                    invalidSourceDescriptions.push(`auth-${index}`);
                }
            } else {
                invalidSourceDescriptions.push(`auth-${index} (unreadable)`);
            }
        }

        if (invalidSourceDescriptions.length > 0) {
            this.logger.warn(
                `⚠️ [Auth] Pre-validation found ${invalidSourceDescriptions.length
                } authentication sources with format errors or unreadable: [${invalidSourceDescriptions.join(
                    ", "
                )}], will be removed from available list.`
            );
        }

        this.availableIndices = validIndices;
    }

    _getAuthContent(index) {
        if (this.authMode === "env") {
            return process.env[`AUTH_JSON_${index}`];
        } else {
            const authFilePath = path.join(process.cwd(), "configs", "auth", `auth-${index}.json`);
            if (!fs.existsSync(authFilePath)) return null;
            try {
                return fs.readFileSync(authFilePath, "utf-8");
            } catch (e) {
                return null;
            }
        }
    }

    getAuth(index) {
        if (!this.availableIndices.includes(index)) {
            this.logger.error(`[Auth] Requested invalid or non-existent authentication index: ${index}`);
            return null;
        }

        const jsonString = this._getAuthContent(index);
        if (!jsonString) {
            this.logger.error(`[Auth] Unable to retrieve content for authentication source #${index} during read.`);
            return null;
        }

        try {
            return JSON.parse(jsonString);
        } catch (e) {
            this.logger.error(
                `[Auth] Failed to parse JSON content from authentication source #${index}: ${e.message}`
            );
            return null;
        }
    }
}

module.exports = AuthSource;
