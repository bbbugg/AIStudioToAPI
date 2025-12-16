/**
 * File: status.js
 * Description: Client-side script for the status page, providing real-time service monitoring and control
 *
 * Maintainers: iBenzene, bbbugg
 * Original Author: Ellinav
 */

/* global I18n */

(() => {
    const t = (key, fallback) => (window.I18n ? I18n.t(key, fallback) : fallback || key);
    let lastStatusData = null;

    const renderStatus = data => {
        const statusPre = document.querySelector('#status-section pre');
        if (!statusPre) {
            return;
        }
        const accountDetailsHtml = (data.status.accountDetails || [])
            .map(
                acc =>
                    `<span class="label" style="padding-left: 20px;">${t('account')} ${acc.index}</span>: ${acc.name}`
            )
            .join('\n');

        statusPre.innerHTML
            = `<span class="label">${t('serviceStatus')}</span>: <span class="status-ok">${t('running')}</span>\n`
            + `<span class="label">${t('browserConnection')}</span>: <span class="${data.status.browserConnected ? 'status-ok' : 'status-error'}">${data.status.browserConnected}</span>\n`
            + `--- ${t('serviceConfig')} ---\n`
            + `<span class="label">${t('streamingMode')}</span>: ${data.status.streamingMode}\n`
            + `<span class="label">${t('forceThinking')}</span>: ${data.status.forceThinking}\n`
            + `<span class="label">${t('forceWebSearch')}</span>: ${data.status.forceWebSearch}\n`
            + `<span class="label">${t('forceUrlContext')}</span>: ${data.status.forceUrlContext}\n`
            + `<span class="label">${t('immediateSwitchCodes')}</span>: ${data.status.immediateSwitchStatusCodes}\n`
            + `<span class="label">${t('apiKey')}</span>: ${data.status.apiKeySource}\n`
            + `--- ${t('accountStatus')} ---\n`
            + `<span class="label">${t('currentAccount')}</span>: #${data.status.currentAuthIndex} (${data.status.currentAccountName})\n`
            + `<span class="label">${t('usageCount')}</span>: ${data.status.usageCount}\n`
            + `<span class="label">${t('consecutiveFailures')}</span>: ${data.status.failureCount}\n`
            + `<span class="label">${t('totalScanned')}</span>: ${data.status.initialIndices}\n`
            + accountDetailsHtml + '\n'
            + `<span class="label">${t('formatErrors')}</span>: ${data.status.invalidIndices}`;
    };

    const renderLogs = data => {
        const logContainer = document.getElementById('log-container');
        const logTitle = document.querySelector('#log-section h2');
        if (logTitle) {
            logTitle.innerHTML
                = `<span data-i18n="realtimeLogs">${t('realtimeLogs')}</span> `
                + `(<span data-i18n="latestEntries">${t('latestEntries')}</span> ${data.logCount} `
                + `<span data-i18n="entries">${t('entries')}</span>)`;
        }
        if (logContainer) {
            const isScrolledToBottom = logContainer.scrollHeight - logContainer.clientHeight <= logContainer.scrollTop + 1;
            logContainer.innerText = data.logs;
            if (isScrolledToBottom) {
                logContainer.scrollTop = logContainer.scrollHeight;
            }
        }
    };

    const updateContent = () => {
        const dot = document.querySelector('.dot');
        return fetch('/api/status')
            .then(r => {
                if (r.redirected) {
                    window.location.href = r.url;
                    return Promise.reject('Redirecting to login');
                }
                return r.json();
            })
            .then(data => {
                lastStatusData = data;
                if (dot) {
                    dot.className = 'dot status-running';
                }
                if (window.vueApp && window.vueApp.updateSwitchStates) {
                    window.vueApp.updateSwitchStates(data);
                }
                renderStatus(data);
                renderLogs(data);
            })
            .catch(err => {
                if (err === 'Redirecting to login') {
                    return;
                }
                console.error('Error:', err);
                if (dot) {
                    dot.className = 'dot status-error';
                }
                const statusPre = document.querySelector('#status-section pre');
                if (statusPre) {
                    statusPre.innerHTML = `<span class="label">${t('serviceStatus')}</span>: <span class="status-error">${t('disconnected')}</span>`;
                }
            });
    };

    const scheduleNextUpdate = () => {
        const randomInterval = 4000 + Math.floor(Math.random() * 3000);
        setTimeout(() => {
            updateContent();
            scheduleNextUpdate();
        }, randomInterval);
    };

    document.addEventListener('DOMContentLoaded', async () => {
        if (!window.I18n) {
            return;
        }
        await I18n.init();
        I18n.applyI18n();

        if (window.vueApp) {
            window.vueApp.lang = I18n.getLang();
            window.vueApp.$forceUpdate();
        }

        I18n.onChange(lang => {
            if (window.vueApp) {
                window.vueApp.lang = lang;
                window.vueApp.$forceUpdate();
            }
            if (lastStatusData) {
                renderStatus(lastStatusData);
                renderLogs(lastStatusData);
            }
            I18n.applyI18n();
        });

        updateContent();
        scheduleNextUpdate();
    });

    window.updateContent = updateContent;
})();
