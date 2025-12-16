/**
 * File: login.js
 * Description: Client-side script for the login page, handling internationalization and user authentication
 *
 * Maintainers: iBenzene, bbbugg
 * Original Author: Ellinav
 */

/* global I18n */

const toggleLanguage = async () => {
    if (!window.I18n) {
        return;
    }
    await I18n.toggleLang();
};

document.addEventListener('DOMContentLoaded', async () => {
    if (!window.I18n) {
        return;
    }
    await I18n.init();
});
