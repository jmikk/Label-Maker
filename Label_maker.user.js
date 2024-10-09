// ==UserScript==
// @name         NationStates CTE Flagging Script with Clickable Icon and CTE
// @namespace    http://tampermonkey.net/
// @version      2.6
// @description  Flags nations as CTE if they are no longer in the NationStates nations list. Adds clickable icon and CTE flag linking to Boneyard. No space between the icon and CTE, and uses user-agent and timestamp in the link URL. Skips elements with blank nname or nnameblock.
// @author       Your Name
// @match        *://www.nationstates.net/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const api_url = "https://www.nationstates.net/cgi-bin/api.cgi?q=nations";
    const CACHE_EXPIRATION_HOURS = 12; // Time in hours before fetching new data
    const CACHE_KEY = "validNationsCache";
    const TIMESTAMP_KEY = "validNationsCacheTimestamp";
    const API_RESPONSE_LOG_KEY = "apiResponseLog"; // Key for logging API response

    // Function to get the user-agent from localStorage or prompt the user
    function getUserAgent() {
        let userAgent = GM_getValue("userAgent");
        if (!userAgent) {
            userAgent = prompt("Please enter your User-Agent: ");
            if (userAgent) {
                GM_setValue("userAgent", userAgent);
            }
        }
        return userAgent;
    }

    // Function to get the current timestamp
    function getCurrentTimestamp() {
        return new Date().toISOString();
    }

    // Function to normalize nation names (lowercase and replace spaces with underscores)
    function normalizeNationName(nationName) {
        return nationName.toLowerCase().replace(/\s+/g, '_');
    }

    // Function to create the icon element with the 'icon-monument' class
    function createIconElement() {
        const icon = document.createElement("i"); // Create an <i> element for the icon
        icon.className = "icon-monument"; // Add the class 'icon-monument' to the element
        return icon;
    }

    // Function to create the clickable link for the CTE flag and icon
    function createClickableCTE(nationName, userAgent, timestamp) {
        const link = document.createElement("a");
        const normalizedNationName = normalizeNationName(nationName);
        link.href = `https://www.nationstates.net/page=boneyard?nation=${normalizedNationName}&generated_by=${userAgent}&timestamp=${timestamp}&script="9003's label maker"`;

        // Create the icon and CTE text
        const icon = createIconElement();
        link.appendChild(icon);
        link.append("(CTE)"); // Add the CTE text directly after the icon

        return link;
    }

    // Function to append the clickable CTE with icon to a DOM element
    function appendCTEWithIcon(element, originalNationName, userAgent) {
        const timestamp = getCurrentTimestamp(); // Get the current timestamp
        const cteLink = createClickableCTE(originalNationName, userAgent, timestamp); // Create the clickable CTE link

        element.textContent = `${originalNationName} `; // Reset the text content with the original nation name
        element.appendChild(cteLink); // Append the clickable CTE link (icon + CTE)
    }

    // Function to check if the cached data is still valid
    function isCacheValid() {
        const cachedTimestamp = GM_getValue(TIMESTAMP_KEY);
        if (cachedTimestamp) {
            const currentTime = new Date().getTime();
            const hoursSinceLastFetch = (currentTime - cachedTimestamp) / (1000 * 60 * 60);
            return hoursSinceLastFetch < CACHE_EXPIRATION_HOURS;
        }
        return false;
    }

    // Function to get the list of nations from the cache or API
    function getNations(userAgent, callback) {
        // Check if valid cached data exists
        if (isCacheValid()) {
            const cachedNations = GM_getValue(CACHE_KEY);
            if (cachedNations) {
                console.log("Using cached nations data.");
                callback(cachedNations);
                return;
            }
        }

        // If cache is invalid or not found, make a request to the API
        GM_xmlhttpRequest({
            method: "GET",
            url: api_url,
            headers: {
                "User-Agent": userAgent
            },
            onload: function(response) {
                if (response.status === 200) {
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(response.responseText, "application/xml");
                    const nationsTag = xmlDoc.getElementsByTagName("NATIONS")[0];
                    const nationsList = nationsTag.textContent.split(",").map(normalizeNationName); // Normalize the names

                    // Cache the nations list and the timestamp
                    GM_setValue(CACHE_KEY, nationsList);
                    GM_setValue(TIMESTAMP_KEY, new Date().getTime());

                    callback(nationsList);
                } else {
                    console.error("Error fetching data from NationStates API");
                    callback([]);
                }
            },
            onerror: function() {
                console.error("Request failed.");
                callback([]);
            }
        });
    }

    // Function to flag CTE nations in the page
    function flagCTENations(validNations, userAgent) {
        // First process .nname elements
        const nnameElements = document.querySelectorAll(".nname");

        nnameElements.forEach(nnameElement => {
            let originalNationName = nnameElement.textContent.trim(); // Keep original name with correct capitalization and spaces

            // Skip if the original nation name is empty or blank
            if (!originalNationName) return;

            let normalizedNationName = normalizeNationName(originalNationName); // Normalize for comparison

            // Only flag CTE for .nname if it doesn't exist in valid nations
            if (!validNations.includes(normalizedNationName)) {
                appendCTEWithIcon(nnameElement, originalNationName, userAgent); // Append CTE with icon to the .nname
            }
        });

        // Now process .nnameblock elements, but only if there is no .nname present in the parent container
        const nnameblockElements = document.querySelectorAll(".nnameblock");

        nnameblockElements.forEach(nnameblockElement => {
            let originalNationName = nnameblockElement.textContent.trim(); // Keep original name with correct capitalization and spaces

            // Skip if the original nation name is empty or blank
            if (!originalNationName) return;

            const parent = nnameblockElement.closest("p, .deckcard-container, .deckcard-name, a");

            // Only process .nnameblock if there's no .nname in the parent container
            if (parent && !parent.querySelector(".nname")) {
                let normalizedNationName = normalizeNationName(originalNationName); // Normalize for comparison

                // Flag CTE for .nnameblock if it doesn't exist in valid nations
                if (!validNations.includes(normalizedNationName)) {
                    appendCTEWithIcon(nnameblockElement, originalNationName, userAgent); // Append CTE with icon to the .nnameblock
                }
            }
        });
    }

    // Main function to run
    function main() {
        const userAgent = getUserAgent();

        // Fetch the list of nations from the cache or the API
        getNations(userAgent, function(validNations) {
            // Flag CTE nations in the DOM if they are not in the valid nations list
            flagCTENations(validNations, userAgent);
        });
    }

    // Run the script
    main();

})();
