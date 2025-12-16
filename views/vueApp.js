/**
 * File: vueApp.js
 * Description: Vue.js application for managing service configuration and real-time status updates
 *
 * Maintainers: iBenzene, bbbugg
 * Original Author: Ellinav
 */

/* global I18n */

(() => {
    const { createApp } = Vue;

    const app = createApp({
        computed: {
            forceThinkingText() {
                return this.forceThinkingEnabled ? 'true' : 'false';
            },
            forceUrlContextText() {
                return this.forceUrlContextEnabled ? 'true' : 'false';
            },
            forceWebSearchText() {
                return this.forceWebSearchEnabled ? 'true' : 'false';
            },
            streamingModeText() {
                return this.streamingModeReal ? 'real' : 'fake';
            },
        },
        created() {
            I18n.onChange(lang => {
                this.lang = lang;
            });
        },
        data() {
            return {
                accountDetails: [],
                currentAuthIndex: -1,
                forceThinkingEnabled: false,
                forceUrlContextEnabled: false,
                forceWebSearchEnabled: false,
                isSwitchingAccount: false,
                isUpdating: false,
                lang: I18n.getLang(),
                streamingModeReal: false,
            };
        },
        methods: {
            handleForceThinkingBeforeChange() {
                if (this.isUpdating) {
                    return false;
                }

                return new Promise((resolve, reject) => {
                    fetch('/api/settings/force-thinking', { method: 'PUT' })
                        .then(res => res.text())
                        .then(data => {
                            ElementPlus.ElMessage.success(data);
                            window.updateContent?.();
                            resolve(true);
                        })
                        .catch(err => {
                            ElementPlus.ElMessage.error(this.t('settingFailed') + err);
                            reject();
                        });
                });
            },
            handleForceUrlContextBeforeChange() {
                if (this.isUpdating) {
                    return false;
                }

                return new Promise((resolve, reject) => {
                    fetch('/api/settings/force-url-context', { method: 'PUT' })
                        .then(res => res.text())
                        .then(data => {
                            ElementPlus.ElMessage.success(data);
                            window.updateContent?.();
                            resolve(true);
                        })
                        .catch(err => {
                            ElementPlus.ElMessage.error(this.t('settingFailed') + err);
                            reject();
                        });
                });
            },
            handleForceWebSearchBeforeChange() {
                if (this.isUpdating) {
                    return false;
                }

                return new Promise((resolve, reject) => {
                    fetch('/api/settings/force-web-search', { method: 'PUT' })
                        .then(res => res.text())
                        .then(data => {
                            ElementPlus.ElMessage.success(data);
                            window.updateContent?.();
                            resolve(true);
                        })
                        .catch(err => {
                            ElementPlus.ElMessage.error(this.t('settingFailed') + err);
                            reject();
                        });
                });
            },
            handleLogout() {
                const { ElMessageBox, ElMessage } = ElementPlus;
                ElMessageBox.confirm(this.t('logoutConfirm'), {
                    cancelButtonText: this.t('cancel'),
                    confirmButtonText: this.t('ok'),
                    lockScroll: false,
                    type: 'warning',
                })
                    .then(() => {
                        fetch('/logout', {
                            headers: { 'Content-Type': 'application/json' },
                            method: 'POST',
                        })
                            .then(response => {
                                if (response.ok) {
                                    ElMessage.success(this.t('logoutSuccess'));
                                    setTimeout(() => {
                                        window.location.href = '/login';
                                    }, 500);
                                } else {
                                    ElMessage.error(this.t('logoutFail'));
                                }
                            })
                            .catch(err => {
                                console.error('Logout error:', err);
                                ElMessage.error(this.t('logoutError'));
                            });
                    })
                    .catch(() => {
                        // User canceled, no-op
                    });
            },
            handleStreamingModeBeforeChange() {
                if (this.isUpdating) {
                    return false;
                }

                const newMode = !this.streamingModeReal ? 'real' : 'fake';

                return new Promise((resolve, reject) => {
                    fetch('/api/settings/streaming-mode', {
                        body: JSON.stringify({ mode: newMode }),
                        headers: { 'Content-Type': 'application/json' },
                        method: 'PUT',
                    })
                        .then(res => res.text())
                        .then(data => {
                            ElementPlus.ElMessage.success(data);
                            window.updateContent?.();
                            resolve(true);
                        })
                        .catch(err => {
                            ElementPlus.ElMessage.error(this.t('settingFailed') + err);
                            reject();
                        });
                });
            },
            switchSpecificAccount() {
                const targetIndex = parseInt(
                    document.getElementById('account-index-select').value,
                    10
                );

                if (this.currentAuthIndex === targetIndex) {
                    ElementPlus.ElMessage.warning(this.t('alreadyCurrentAccount'));
                    return;
                }

                const targetAccount = this.accountDetails.find(acc => acc.index === targetIndex);
                const accountSuffix = targetAccount ? ` (${targetAccount.name})` : '';

                ElementPlus.ElMessageBox.confirm(
                    `${this.t('confirmSwitch')} #${targetIndex}${accountSuffix}?`,
                    {
                        cancelButtonText: this.t('cancel'),
                        confirmButtonText: this.t('ok'),
                        lockScroll: false,
                        type: 'warning',
                    }
                )
                    .then(async () => {
                        const notification = ElementPlus.ElNotification({
                            duration: 0,
                            message: this.t('switchingAccountNotice'),
                            title: this.t('warningTitle'),
                            type: 'warning',
                        });
                        this.isSwitchingAccount = true;
                        try {
                            const res = await fetch('/api/accounts/current', {
                                body: JSON.stringify({ targetIndex }),
                                headers: { 'Content-Type': 'application/json' },
                                method: 'PUT',
                            });
                            const data = await res.text();
                            if (res.ok) {
                                ElementPlus.ElMessage.success(data);
                            } else {
                                ElementPlus.ElMessage.error(data);
                            }
                        } catch (err) {
                            ElementPlus.ElMessage.error(
                                this.t('settingFailed') + (err.message || err)
                            );
                        } finally {
                            this.isSwitchingAccount = false;
                            notification.close();
                            window.updateContent?.();
                        }
                    })
                    .catch(e => {
                        if (e !== 'cancel') {
                            console.error(e);
                        }
                    });
            },
            t(key, fallback) {
                return I18n.t(key, fallback);
            },
            toggleLanguage() {
                return I18n.toggleLang();
            },
            updateSwitchStates(data) {
                this.isUpdating = true;
                this.streamingModeReal = data.status.streamingMode.includes('real');
                this.forceThinkingEnabled = data.status.forceThinking.includes('Enabled');
                this.forceWebSearchEnabled = data.status.forceWebSearch.includes('Enabled');
                this.forceUrlContextEnabled = data.status.forceUrlContext.includes('Enabled');
                this.currentAuthIndex = data.status.currentAuthIndex;
                this.accountDetails = data.status.accountDetails || [];
                this.$nextTick(() => {
                    this.isUpdating = false;
                });
            },
        },
        mounted() {
            const initialMode = '{{streamingMode}}';
            const initialThinking = '{{forceThinking}}';
            const initialWebSearch = '{{forceWebSearch}}';
            const initialUrlContext = '{{forceUrlContext}}';
            const initialAuthIndex = '{{currentAuthIndex}}';

            this.isUpdating = true;
            this.streamingModeReal = initialMode === 'real';
            this.forceThinkingEnabled = initialThinking === 'true' || initialThinking === true;
            this.forceWebSearchEnabled = initialWebSearch === 'true' || initialWebSearch === true;
            this.forceUrlContextEnabled = initialUrlContext === 'true' || initialUrlContext === true;
            this.currentAuthIndex = parseInt(initialAuthIndex, 10);

            this.$nextTick(() => {
                this.isUpdating = false;
            });
        },
        watch: {
            isSwitchingAccount(newVal) {
                const selectEl = document.getElementById('account-index-select');
                if (selectEl) {
                    selectEl.disabled = newVal;
                }
            },
        },
    });

    const appInstance = app.use(ElementPlus).mount('#app');
    window.vueApp = appInstance;
})();
