// ==UserScript==
// @name         sportscult-bon-exchanger
// @description  Automatically exchange bonus points for 5 GB Upload when above threshold, with AJAX-updated bonus info and a draggable control UI.
// @version      1.0
// @namespace   https://github.com/rkeaves
// @downloadURL https://github.com/rkeaves/sportscult-bon-exchanger/raw/main/sportscult-bon-exchanger.js
// @updateURL   https://github.com/rkeaves/sportscult-bon-exchanger/raw/main/sportscult-bon-exchanger.js
// @license      GPL-3.0-or-later
// @match        https://sportscult.org/index.php?page=modules&module=seedbonus*
// @grant        none
// @author      rkeaves
// ==/UserScript==

(function () {
    'use strict';

    /********************
     * Configuration
     ********************/
    const EXCHANGE_COST = 290.0;
    const BONUS_THRESHOLD = 1000.0;
    const ACTION_INTERVAL = 60; // seconds until next exchange attempt
    const BONUS_REFRESH_INTERVAL = 10; // seconds between AJAX bonus updates

    /********************
     * Persistent State (via localStorage)
     ********************/
    const STORAGE_PREFIX = 'bonusExchanger_';
    let state = {
        active: JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'active')) || false,
        exchangeCount: parseInt(localStorage.getItem(STORAGE_PREFIX + 'exchangeCount')) || 0,
        totalExchanged: parseFloat(localStorage.getItem(STORAGE_PREFIX + 'totalExchanged')) || 0,
        lastBonus: parseFloat(localStorage.getItem(STORAGE_PREFIX + 'lastBonus')) || 0,
        countdown: parseInt(localStorage.getItem(STORAGE_PREFIX + 'countdown')) || ACTION_INTERVAL,
        currentBonus: 0,
        // Track the last upload value (in TB)
        lastUpload: parseFloat(localStorage.getItem(STORAGE_PREFIX + 'lastUpload')) || 0,
        // Note for your personal records (Note1)
        manualUploadNote: localStorage.getItem(STORAGE_PREFIX + 'manualUploadNote') || "",
        // Second note (Note2)
        manualUploadNote2: localStorage.getItem(STORAGE_PREFIX + 'manualUploadNote2') || ""
    };

    // Retrieve saved panel position and size if available
    let savedPosX = localStorage.getItem(STORAGE_PREFIX + 'panelPosX');
    let savedPosY = localStorage.getItem(STORAGE_PREFIX + 'panelPosY');
    let savedWidth = localStorage.getItem(STORAGE_PREFIX + 'panelWidth');
    let savedHeight = localStorage.getItem(STORAGE_PREFIX + 'panelHeight');

    function saveState() {
        localStorage.setItem(STORAGE_PREFIX + 'active', JSON.stringify(state.active));
        localStorage.setItem(STORAGE_PREFIX + 'exchangeCount', state.exchangeCount);
        localStorage.setItem(STORAGE_PREFIX + 'totalExchanged', state.totalExchanged);
        localStorage.setItem(STORAGE_PREFIX + 'lastBonus', state.lastBonus);
        localStorage.setItem(STORAGE_PREFIX + 'countdown', state.countdown);
        localStorage.setItem(STORAGE_PREFIX + 'lastUpload', state.lastUpload);
        localStorage.setItem(STORAGE_PREFIX + 'manualUploadNote', state.manualUploadNote);
        localStorage.setItem(STORAGE_PREFIX + 'manualUploadNote2', state.manualUploadNote2);
    }

    /********************
     * UI: Draggable & Resizable Control Panel (Table Layout)
     ********************/
    const panel = document.createElement('div');
    panel.id = 'bonusExchangerUI';
    panel.style.position = 'fixed';
    panel.style.top = savedPosY ? savedPosY : '50px';
    panel.style.left = savedPosX ? savedPosX : '50px';
    panel.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    panel.style.color = '#fff';
    panel.style.padding = '10px';
    panel.style.borderRadius = '5px';
    panel.style.zIndex = '10000';
    panel.style.fontFamily = 'Arial, sans-serif';
    panel.style.fontSize = '14px';
    panel.style.cursor = 'move';
    // Set default size (narrow) or restore saved size
    panel.style.width = savedWidth ? savedWidth : '220px';
    panel.style.height = savedHeight ? savedHeight : '415px';

    panel.innerHTML = `
    <div style="margin-bottom:5px; font-weight:bold; text-align:center; font-size:16px;">Bonus Exchanger Control</div>
    <div style="margin-bottom:10px; text-align:center;">
      <button id="powerButton" style="background-color: ${state.active ? 'green' : 'red'}; color: #fff; border:none; padding: 5px 10px; cursor: pointer;">
        ${state.active ? 'Active' : 'Inactive'}
      </button>
      <button id="resetButton" style="margin-left:10px; background-color: #444; color: #fff; border:none; padding: 5px 10px; cursor: pointer;">
        Reset Stats
      </button>
    </div>
    <table style="width:100%; border-collapse:collapse;">
        <tr style="background-color:#333; color:#fff;">
            <th colspan="2" style="padding:6px; text-align:center;">Status Information</th>
        </tr>
        <tr>
            <td style="text-align:left; padding:4px;">Exchanges:</td>
            <td style="text-align:right; padding:4px; color:#0f0;" id="exchangeCount">${state.exchangeCount}</td>
        </tr>
        <tr>
            <td style="text-align:left; padding:4px;">Points Exchanged:</td>
            <td style="text-align:right; padding:4px; color:#0f0;" id="pointsExchanged">${state.totalExchanged.toFixed(1)}</td>
        </tr>
        <tr>
            <td style="text-align:left; padding:4px;">Last Bonus:</td>
            <td style="text-align:right; padding:4px; color:#ff0;" id="lastBonus">${state.lastBonus.toFixed(2)}</td>
        </tr>
        <tr>
            <td style="text-align:left; padding:4px;">Current Bonus:</td>
            <td style="text-align:right; padding:4px; color:#ff0;" id="currentBonusDisplay">-</td>
        </tr>
        <tr>
            <td style="text-align:left; padding:4px;">Last Upload:</td>
            <td style="text-align:right; padding:4px; color:#0f0;" id="lastUploadDisplay">${state.lastUpload.toFixed(2)} TB</td>
        </tr>
        <tr>
            <td style="text-align:left; padding:4px;">Upload Track:</td>
            <td style="text-align:right; padding:4px; color:#0f0;" id="uploadDisplay">-</td>
        </tr>
        <tr>
            <td style="text-align:left; padding:4px;">Threshold:</td>
            <td style="text-align:right; padding:4px; color:#f80;">${BONUS_THRESHOLD}</td>
        </tr>
        <tr>
            <td style="text-align:left; padding:4px;">Cost:</td>
            <td style="text-align:right; padding:4px; color:#f80;">${EXCHANGE_COST}</td>
        </tr>
        <tr>
            <td style="text-align:left; padding:4px;">Next Action in:</td>
            <td style="text-align:right; padding:4px; color:#f00;" id="countdownDisplay">${state.countdown} sec</td>
        </tr>
        <tr style="background-color:#222;">
            <td style="text-align:left; padding:4px;">Upload at Start:</td>
            <td style="text-align:right; padding:4px;">
                <input type="text" id="manualUploadNoteInput" value="${state.manualUploadNote}" style="width:80px; text-align:right;"/>
            </td>
        </tr>
        <tr style="background-color:#222;">
            <td colspan="2" style="text-align:left; padding:4px;">
                <button id="setNoteButton" style="background-color:#555; color:#fff; border:none; padding:2px 5px; cursor:pointer;">Set</button>
                <button id="clearNoteButton" style="margin-left:5px; background-color:#555; color:#fff; border:none; padding:2px 5px; cursor:pointer;">Reset</button>
                <button id="copyNoteButton" style="margin-left:5px; background-color:#555; color:#fff; border:none; padding:2px 5px; cursor:pointer;">Copy</button>
            </td>
        </tr>
        <!-- Second note row -->
        <tr style="background-color:#222;">
            <td style="text-align:left; padding:4px;">Bonus at Start</td>
            <td style="text-align:right; padding:4px;">
                <input type="text" id="manualUploadNoteInput2" value="${state.manualUploadNote2}" style="width:80px; text-align:right;"/>
            </td>
        </tr>
        <tr style="background-color:#222;">
            <td colspan="2" style="text-align:left; padding:4px;">
                <button id="setNoteButton2" style="background-color:#555; color:#fff; border:none; padding:2px 5px; cursor:pointer;">Set</button>
                <button id="clearNoteButton2" style="margin-left:5px; background-color:#555; color:#fff; border:none; padding:2px 5px; cursor:pointer;">Reset</button>
                <button id="copyNoteButton2" style="margin-left:5px; background-color:#555; color:#fff; border:none; padding:2px 5px; cursor:pointer;">Copy</button>
            </td>
        </tr>
    </table>
`;
    document.body.appendChild(panel);

    // Add a resize handle to the panel
    const resizeHandle = document.createElement('div');
    resizeHandle.style.width = '10px';
    resizeHandle.style.height = '10px';
    resizeHandle.style.backgroundColor = '#000';
    resizeHandle.style.position = 'absolute';
    resizeHandle.style.right = '0';
    resizeHandle.style.bottom = '0';
    resizeHandle.style.cursor = 'se-resize';
    panel.appendChild(resizeHandle);

    // Make the panel draggable and save its position when moved
    (function makeDraggable(el) {
        let isMouseDown = false;
        let offset = { x: 0, y: 0 };

        el.addEventListener('mousedown', function (e) {
            // Prevent resizing handle from triggering drag
            if (e.target === resizeHandle) return;
            isMouseDown = true;
            offset.x = e.clientX - el.offsetLeft;
            offset.y = e.clientY - el.offsetTop;
            el.style.cursor = 'grabbing';
        });
        document.addEventListener('mouseup', function () {
            if (isMouseDown) {
                // Save the current position
                localStorage.setItem(STORAGE_PREFIX + 'panelPosX', el.style.left);
                localStorage.setItem(STORAGE_PREFIX + 'panelPosY', el.style.top);
            }
            isMouseDown = false;
            el.style.cursor = 'grab';
        });
        document.addEventListener('mousemove', function (e) {
            if (isMouseDown) {
                el.style.left = (e.clientX - offset.x) + 'px';
                el.style.top = (e.clientY - offset.y) + 'px';
            }
        });
    })(panel);

    // Make the panel resizable via the resize handle with updated minimums
    (function makeResizable(el, handle) {
        let isResizing = false;
        let startX, startY, startWidth, startHeight;

        handle.addEventListener('mousedown', function(e) {
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = parseInt(document.defaultView.getComputedStyle(el).width, 10);
            startHeight = parseInt(document.defaultView.getComputedStyle(el).height, 10);
            e.preventDefault(); // Prevent text selection
        });

        document.addEventListener('mousemove', function(e) {
            if (!isResizing) return;
            let newWidth = startWidth + e.clientX - startX;
            let newHeight = startHeight + e.clientY - startY;
            // Set minimum size limits for a professional look
            if (newWidth < 220) newWidth = 220;
            if (newHeight < 415) newHeight = 415;
            el.style.width = newWidth + 'px';
            el.style.height = newHeight + 'px';
            // Save new size to localStorage
            localStorage.setItem(STORAGE_PREFIX + 'panelWidth', el.style.width);
            localStorage.setItem(STORAGE_PREFIX + 'panelHeight', el.style.height);
            e.preventDefault();
        });

        document.addEventListener('mouseup', function(e) {
            if (isResizing) {
                isResizing = false;
            }
        });
    })(panel, resizeHandle);

    /********************
     * Power Button Toggle
     ********************/
    document.getElementById('powerButton').addEventListener('click', function () {
        state.active = !state.active;
        this.style.backgroundColor = state.active ? 'green' : 'red';
        this.textContent = state.active ? 'Active' : 'Inactive';
        // When activated, record the current upload value if not already set
        if (state.active && state.lastUpload === 0) {
            let currentUploadStr = document.getElementById('uploadDisplay').textContent;
            let currentUpload = parseFloat(currentUploadStr);
            if (!isNaN(currentUpload)) {
                state.lastUpload = currentUpload;
                localStorage.setItem(STORAGE_PREFIX + 'lastUpload', state.lastUpload);
                document.getElementById('lastUploadDisplay').textContent = state.lastUpload.toFixed(2) + " TB";
            }
        }
        saveState();
    });

    /********************
     * Reset Button for Stats
     ********************/
    document.getElementById('resetButton').addEventListener('click', function () {
        state.exchangeCount = 0;
        state.totalExchanged = 0;
        state.lastBonus = 0;
        // Also reset lastUpload and notes so they will be recorded again on activation
        state.lastUpload = 0;
        state.manualUploadNote = "";
        state.manualUploadNote2 = "";
        saveState();
        document.getElementById('exchangeCount').textContent = state.exchangeCount;
        document.getElementById('pointsExchanged').textContent = state.totalExchanged.toFixed(1);
        document.getElementById('lastBonus').textContent = state.lastBonus.toFixed(2);
        document.getElementById('lastUploadDisplay').textContent = "0.00 TB";
        document.getElementById('manualUploadNoteInput').value = "";
        document.getElementById('manualUploadNoteInput2').value = "";
    });

    /********************
     * Note Buttons for Note1
     ********************/
    // Set Note button: save the entered note value for Note1
    document.getElementById('setNoteButton').addEventListener('click', function () {
        let noteVal = document.getElementById('manualUploadNoteInput').value;
        state.manualUploadNote = noteVal;
        localStorage.setItem(STORAGE_PREFIX + 'manualUploadNote', noteVal);
    });
    // Clear Note button: clear the note value for Note1
    document.getElementById('clearNoteButton').addEventListener('click', function () {
        state.manualUploadNote = "";
        localStorage.setItem(STORAGE_PREFIX + 'manualUploadNote', "");
        document.getElementById('manualUploadNoteInput').value = "";
    });
    // Copy Note button: copy the last upload value and set it as the note for Note1
    document.getElementById('copyNoteButton').addEventListener('click', function () {
        let copyVal = state.lastUpload.toFixed(2) + " TB";
        document.getElementById('manualUploadNoteInput').value = copyVal;
        state.manualUploadNote = copyVal;
        localStorage.setItem(STORAGE_PREFIX + 'manualUploadNote', copyVal);
    });

    /********************
     * Note Buttons for Note2
     ********************/
    // Set Note button for Note2: save the entered note value for Note2
    document.getElementById('setNoteButton2').addEventListener('click', function () {
        let noteVal = document.getElementById('manualUploadNoteInput2').value;
        state.manualUploadNote2 = noteVal;
        localStorage.setItem(STORAGE_PREFIX + 'manualUploadNote2', noteVal);
    });
    // Clear Note button for Note2: clear the note value for Note2
    document.getElementById('clearNoteButton2').addEventListener('click', function () {
        state.manualUploadNote2 = "";
        localStorage.setItem(STORAGE_PREFIX + 'manualUploadNote2', "");
        document.getElementById('manualUploadNoteInput2').value = "";
    });
    // Copy Note button for Note2: copy the last bonus value and set it as the note for Note2
    document.getElementById('copyNoteButton2').addEventListener('click', function () {
        let copyVal = state.lastBonus.toFixed(2);
        document.getElementById('manualUploadNoteInput2').value = copyVal;
        state.manualUploadNote2 = copyVal;
        localStorage.setItem(STORAGE_PREFIX + 'manualUploadNote2', copyVal);
    });

    /********************
     * Helper Functions
     ********************/
    // Parse bonus points from the h1 text (or fallback to the bonus link)
    function parseBonusFromPage(doc) {
        let bonus = 0;
        const h1 = doc.querySelector('h1');
        if (h1) {
            const match = h1.textContent.match(/current\s*([\d,\.]+)/i);
            if (match) {
                bonus = parseFloat(match[1].replace(/,/g, ''));
                return bonus;
            }
        }
        // Fallback: use the anchor text e.g. (Bonus 8,398.70)
        const bonusLink = doc.querySelector('a[href*="module=seedbonus"]');
        if (bonusLink) {
            const match = bonusLink.textContent.match(/Bonus\s*([\d,\.]+)/i);
            if (match) {
                bonus = parseFloat(match[1].replace(/,/g, ''));
            }
        }
        return bonus;
    }

    // Parse upload track info from the page (e.g. "↑ 1.21 TB")
    function parseUploadFromPage(doc) {
        const greenTDs = doc.querySelectorAll('td.green');
        for (let td of greenTDs) {
            if (td.textContent.includes('TB')) {
                // Remove the arrow and return trimmed value
                return td.textContent.replace('↑', '').trim();
            }
        }
        return '-';
    }

    // Update bonus info in the UI
    function updateBonusInfo(bonus) {
        state.currentBonus = bonus;
        document.getElementById('currentBonusDisplay').textContent = bonus.toFixed(2);
        saveState();
    }

    // Update upload info in the UI; show current upload and keep last upload unchanged
    function updateUploadInfo(uploadStr) {
        document.getElementById('uploadDisplay').textContent = uploadStr;
        // Parse the current upload value
        let currentUpload = parseFloat(uploadStr);
        if (isNaN(currentUpload)) {
            currentUpload = 0;
        }
        // Do not update state.lastUpload if already set
        if (state.lastUpload === 0) {
            state.lastUpload = currentUpload;
            localStorage.setItem(STORAGE_PREFIX + 'lastUpload', state.lastUpload);
        }
        document.getElementById('lastUploadDisplay').textContent = state.lastUpload.toFixed(2) + " TB";
    }

    // Fetch the current page via AJAX and update bonus & upload info
    function refreshBonusAJAX() {
        fetch(window.location.href, { cache: "no-cache" })
            .then(response => response.text())
            .then(htmlText => {
                let parser = new DOMParser();
                let doc = parser.parseFromString(htmlText, "text/html");
                const bonus = parseBonusFromPage(doc);
                updateBonusInfo(bonus);
                const upload = parseUploadFromPage(doc);
                updateUploadInfo(upload);
            })
            .catch(err => console.error('Error fetching bonus info:', err));
    }

    // Trigger the exchange action (redirects to the exchange URL)
    function triggerExchange() {
        state.lastBonus = state.currentBonus;
        state.exchangeCount += 1;
        state.totalExchanged += EXCHANGE_COST;
        // Update lastUpload to the current upload value before exchange
        let currentUploadStr = document.getElementById('uploadDisplay').textContent;
        let currentUpload = parseFloat(currentUploadStr);
        if (!isNaN(currentUpload)) {
            state.lastUpload = currentUpload;
            localStorage.setItem(STORAGE_PREFIX + 'lastUpload', state.lastUpload);
        }
        saveState();
        // Update UI stats immediately
        document.getElementById('exchangeCount').textContent = state.exchangeCount;
        document.getElementById('pointsExchanged').textContent = state.totalExchanged.toFixed(1);
        document.getElementById('lastBonus').textContent = state.lastBonus.toFixed(2);
        document.getElementById('lastUploadDisplay').textContent = state.lastUpload.toFixed(2) + " TB";
        // Redirect to exchange URL for 5 GB Upload (id=5)
        window.location.href = "seedbonus_exchange.php?id=5";
    }

    /********************
     * Countdown Timer for Action
     ********************/
    function startActionCountdown() {
        const actionTimer = setInterval(() => {
            if (!state.active) {
                document.getElementById('countdownDisplay').textContent = state.countdown;
                return;
            }
            if (state.countdown > 0) {
                state.countdown -= 1;
            } else {
                // Refresh bonus info and then check condition after a short delay
                refreshBonusAJAX();
                setTimeout(() => {
                    if (state.currentBonus > BONUS_THRESHOLD) {
                        triggerExchange();
                        clearInterval(actionTimer);
                        return;
                    }
                    // Reset countdown if exchange not triggered
                    state.countdown = ACTION_INTERVAL;
                    saveState();
                }, 2000); // 2-second delay to allow bonus update via AJAX
            }
            document.getElementById('countdownDisplay').textContent = state.countdown + " sec";
            saveState();
        }, 1000);
    }

    /********************
     * Bonus Refresh Timer (AJAX)
     ********************/
    function startBonusRefreshTimer() {
        setInterval(() => {
            refreshBonusAJAX();
        }, BONUS_REFRESH_INTERVAL * 1000);
    }

    /********************
     * Initialization
     ********************/
    (function init() {
        refreshBonusAJAX(); // initial bonus and upload fetch
        startActionCountdown();
        startBonusRefreshTimer();
    })();

})();
