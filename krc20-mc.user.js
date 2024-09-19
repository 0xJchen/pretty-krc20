// ==UserScript==
// @name         krc20 MC Calculator
// @namespace    http://tampermonkey.net/
// @version      2024-09-18
// @description  Showing MC of each krc20 token
// @author       0xJChen
// @match        https://kas.fyi/krc20-tokens
// @icon         https://www.google.com/s2/favicons?sz=64&domain=kas.fyi
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Fetch the current Kaspa price in USD
    async function fetchKaspaPrice() {
        try {
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=kaspa&vs_currencies=usd');
            const data = await response.json();
            return data.kaspa.usd;
        } catch (error) {
            console.error('Error fetching Kaspa price:', error);
            return null;
        }
    }

    // Convert abbreviated supply values (e.g., "2.9T", "333.3B", etc.) to actual numbers
    function convertAbbreviatedSupply(supplyText) {
        const suffixMultiplier = {
            'T': 1e12,  // Trillion
            'B': 1e9,   // Billion
            'M': 1e6,   // Million
            'K': 1e3    // Thousand
        };

        const match = supplyText.match(/^([\d,.]+)([TBMK])?$/i); // Match the number and optional suffix

        if (!match) return NaN;

        const value = parseFloat(match[1].replace(/,/g, '')); // Remove commas and parse the number
        const suffix = match[2] ? match[2].toUpperCase() : ''; // Get the suffix (if any)

        return value * (suffixMultiplier[suffix] || 1); // Multiply by the appropriate multiplier
    }

    // Add a new column to display the total value in KAS and USD
    async function addTotalValueColumn() {
        const kaspaPriceInUSD = await fetchKaspaPrice();

        if (!kaspaPriceInUSD) {
            console.error('Could not fetch Kaspa price. Aborting script.');
            return;
        }

        const rows = document.querySelectorAll('.ant-table-tbody tr');

        if (rows.length === 0) return;

        rows.forEach(row => {
            const totalSupplyElement = row.querySelector('td:nth-child(3) span');
            const priceElement = row.querySelector('td:nth-child(6) span');

            if (totalSupplyElement && priceElement) {
                const totalSupplyText = totalSupplyElement.textContent;
                const priceText = priceElement.textContent;

                // Convert the abbreviated supply to a number
                const totalSupply = convertAbbreviatedSupply(totalSupplyText);
                const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));

                const totalValueInKAS = totalSupply * price;

                const totalValueInUSD = totalValueInKAS * kaspaPriceInUSD;

                const newCell = document.createElement('td');
                newCell.textContent = isNaN(totalValueInKAS) || isNaN(totalValueInUSD)
                    ? '-'
                    : `${totalValueInKAS.toLocaleString()} KAS (${totalValueInUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
                newCell.style.textAlign = 'center';

                row.appendChild(newCell);
            }
        });

        // Add the new header for the "Total Value (KAS/USD)" column
        const headerRow = document.querySelector('.ant-table-thead tr');
        if (headerRow) {
            const newHeader = document.createElement('th');
            newHeader.textContent = 'Total Value (KAS/USD)';
            newHeader.style.textAlign = 'center';
            headerRow.appendChild(newHeader);
        }
    }

    // Check for the table rows and add the new column when the table is loaded
    const tableInterval = setInterval(() => {
        const rows = document.querySelectorAll('.ant-table-tbody tr');

        if (rows.length > 0) {
            clearInterval(tableInterval);
            addTotalValueColumn();
        }
    }, 500);
})();
