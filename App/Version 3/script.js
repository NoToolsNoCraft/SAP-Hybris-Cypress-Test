document.getElementById('addProductTest').addEventListener('click', () => {
    const productTests = document.getElementById('productTests');
    const productTestCount = productTests.children.length + 1;
    const productTestDiv = document.createElement('div');
    productTestDiv.classList.add('product-test');
    productTestDiv.innerHTML = `
        <h3>Product Test ${productTestCount}</h3>
        <div class="form-group">
            <label for="productCode${productTestCount}">Product Code to Test:</label>
            <input type="text" class="productCode" placeholder="Enter product code">
        </div>
        <div class="replacements">
            <div class="replacement">
                <div class="replacement-fields">
                    <div class="form-group">
                        <label for="replacementCode${productTestCount}">Replacement Code:</label>
                        <input type="text" class="replacementCode" placeholder="Enter replacement code">
                    </div>
                    <div class="form-group">
                        <label for="replacementLevel${productTestCount}">Replacement Level:</label>
                        <select class="replacementLevel">
                            <option value="L1">L1</option>
                            <option value="L2">L2</option>
                            <option value="L3">L3</option>
                        </select>
                    </div>
                    <button type="button" class="removeReplacement">X</button>
                </div>
            </div>
        </div>
        <button type="button" class="addReplacement">Add Replacement</button>
        <button type="button" class="removeProductTest">Remove Product Test</button>
    `;
    productTests.appendChild(productTestDiv);
    addEventListeners(productTestDiv);
    renumberProductTests();
});

document.querySelectorAll('.addReplacement').forEach(button => {
    button.addEventListener('click', (e) => {
        const replacementsDiv = e.target.closest('.product-test').querySelector('.replacements');
        const replacementDiv = document.createElement('div');
        replacementDiv.classList.add('replacement');
        replacementDiv.innerHTML = `
            <div class="replacement-fields">
                <div class="form-group">
                    <label for="replacementCode">Replacement Code:</label>
                    <input type="text" class="replacementCode" placeholder="Enter replacement code">
                </div>
                <div class="form-group">
                    <label for="replacementLevel">Replacement Level:</label>
                    <select class="replacementLevel">
                        <option value="L1">L1</option>
                        <option value="L2">L2</option>
                        <option value="L3">L3</option>
                    </select>
                </div>
                <button type="button" class="removeReplacement">X</button>
            </div>
        `;
        replacementsDiv.appendChild(replacementDiv);
        addEventListeners(replacementDiv);
    });
});

document.getElementById('generateScript').addEventListener('click', () => {
    const environment = document.getElementById('environment').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const country = document.getElementById('country').value;
    const catalogEnv = document.getElementById('catalogEnv').value;
    const role = document.getElementById('role').value;

    let productTests = '';

    document.querySelectorAll('.product-test').forEach((productTestDiv, index) => {
        const productCode = productTestDiv.querySelector('.productCode').value;
        let replacements = [];

        productTestDiv.querySelectorAll('.replacement').forEach((replacementDiv) => {
            const replacementCode = replacementDiv.querySelector('.replacementCode').value;
            const replacementLevel = replacementDiv.querySelector('.replacementLevel').value;
            replacements.push({
                code: replacementCode,
                level: replacementLevel
            });
        });

        // Format the replacements array as a string
        const replacementsStr = replacements.map(rep => 
            `{ code: "${rep.code}", level: '${rep.level}' }`
        ).join(',\n          ');

        // Append each product test with proper formatting
        const isFirstTest = index === 0; // Determine if this is the first test
        productTests += `checkProductReplacements("${productCode}", [
          ${replacementsStr}
        ], ${isFirstTest});
`;
    });

    let cypressScript = '';

    if (environment === 'https://backoffice.stg.iqos.com/backoffice/login.zul') {
        cypressScript = `
Cypress.on('uncaught:exception', (err, runnable) => {
    return false;
});

describe('Replacement Matrix test', () => {
    const CATALOG_LABEL = '${country} Product Catalog : ${catalogEnv}';

    beforeEach(() => {
        cy.visit('${environment}', { failOnStatusCode: false }).wait(1000);
        cy.get('input[placeholder="Enter user name"]:visible').type("${username}").wait(300);
        cy.get('input[placeholder="Enter password"]:visible').type("${password}");
        cy.get('.login_btn').click({ force: true }).wait(30000);
        
        //Select a role
        cy.get('.z-listcell-content')
            .contains('${role}')
            .should('exist')
            .click({ force: true })
            .wait(2000);
        cy.get('.z-listcell-content')
            .contains('${role}')
            .should('exist')
            .click({ force: true })
            .wait(2000);

        cy.get('.yw-selector-btn').click().wait(20000);
        cy.get('span.z-label').contains("Products").click().wait(300);
    });

    const LABELS = {
        L1: 'CAN_BE_REPLACED_BY ->',
        L2: 'CAN_BE_REPLACED_BY_2L ->',
        L3: 'CAN_BE_REPLACED_BY_3L ->'
    };

    const checkProductReplacements = (productCode, replacements, isFirstSearch) => {
        cy.get('.yw-fulltextsearch-search-button').eq(0).click();
        const inputIndex = isFirstSearch ? 3 : 5;
        cy.get('.z-bandbox-input').eq(inputIndex).type(productCode, { force: true }).wait(300);
        cy.get('.yw-fulltextsearch-search-button').eq(0).click().wait(300);
        cy.get('span.yw-coll-browser-hyperlink').contains(CATALOG_LABEL).scrollIntoView().should('be.visible').click({ force: true });
        cy.wait(5000);
        cy.get('.yw-editorarea-tabbox-tabs-tab').contains("Categories").click().wait(300);

        replacements.forEach(replacement => {
            const label = LABELS[replacement.level];
            cy.get('.z-listitem')
                .contains(replacement.code)
                .should('contain', label)
                .parent()
                .should('contain', CATALOG_LABEL);
        });

        cy.get('.yw-navigationhistory-back').eq(0).should('be.visible').click({ force: true });
        cy.get('button[title="Clear"]').eq(0).click().wait(1000);
    };

    it('should test the replacement matrix', () => {
        ${productTests}
    });
});
        `;
    } else {
        cypressScript = `
Cypress.on('uncaught:exception', (err, runnable) => {
    return false;
});

describe('Replacement Matrix test', () => {
    const CATALOG_LABEL = '${country} Product Catalog : ${catalogEnv}';
    const PROD_URL = 'https://backoffice.iqos.com/backoffice/login.zul';
    const PreProd_URL = 'https://backoffice.pp.iqos.com/backoffice/login.zul';

    beforeEach(() => {
        cy.visit('${environment}', { failOnStatusCode: false, timeout: 30000 }).then(() => {
            cy.log('Visited the URL successfully');
        }).wait(1000);
    });

    it('should test the replacement matrix', () => {
        cy.get('div.singlesignon_login_cell')
            .contains('Login with Single Sign On')
            .should('exist')
            .click({ force: true })
            .wait(20000);

        cy.origin('https://login.microsoftonline.com', () => {
            cy.get('#i0116.form-control.ltr_override.input.ext-input.text-box.ext-text-box', { timeout: 10000 })
                .should('have.attr', 'placeholder', 'Email address, phone number or Skype')
                .type("${username}")
                .wait(1000);
            cy.get('.win-button.button_primary.high-contrast-overrides.button.ext-button.primary.ext-primary')
                .contains('Next')
                .should('exist')
                .click({ force: true })
                .wait(5000);
            cy.get('#i0118.form-control.input.ext-input.text-box.ext-text-box', { timeout: 10000 })
                .should('exist')
                .type("${password}")
                .wait(1000);
            cy.get('input#idSIButton9.win-button.button_primary.high-contrast-overrides.button.ext-button.primary.ext-primary')
                .should('exist')
                .click({ force: true })
                .wait(30000);
        });
        //Select a role
        cy.get('.z-listcell-content')
            .contains('${role}')
            .should('exist')
            .click({ force: true })
            .wait(2000);
        cy.get('.z-listcell-content')
            .contains('${role}')
            .should('exist')
            .click({ force: true })
            .wait(2000);

        cy.get('.yw-selector-btn').click({ force: true }).wait(20000);
        cy.get('span.z-label').contains("Products").should('be.visible').click().wait(300);

        const LABELS = {
            L1: 'CAN_BE_REPLACED_BY ->',
            L2: 'CAN_BE_REPLACED_BY_2L ->',
            L3: 'CAN_BE_REPLACED_BY_3L ->'
        };

        const checkProductReplacements = (productCode, replacements, isFirstSearch) => {
            cy.get('.yw-fulltextsearch-search-button').eq(0).click();
            const inputIndex = isFirstSearch ? 3 : 5;
            cy.get('.z-bandbox-input').eq(inputIndex).type(productCode, { force: true }).wait(300);
            cy.get('.yw-fulltextsearch-search-button').eq(0).click().wait(300);
            cy.get('span.yw-coll-browser-hyperlink').contains(CATALOG_LABEL).scrollIntoView().should('be.visible').click({ force: true });
            cy.wait(5000);
            cy.get('.yw-editorarea-tabbox-tabs-tab').contains("Categories").click().wait(300);

            replacements.forEach(replacement => {
                const label = LABELS[replacement.level];
                cy.get('.z-listitem')
                    .contains(replacement.code)
                    .should('contain', label)
                    .parent()
                    .should('contain', CATALOG_LABEL);
            });

            cy.get('.yw-navigationhistory-back').eq(0).should('be.visible').click({ force: true });
            cy.get('button[title="Clear"]').eq(0).click().wait(1000);
        };

        ${productTests}
    });
});
        `;
    }

    document.getElementById('cypressScript').textContent = cypressScript;
});

function addEventListeners(parentElement) {
    parentElement.querySelectorAll('.addReplacement').forEach(button => {
        button.addEventListener('click', (e) => {
            const replacementsDiv = e.target.closest('.product-test').querySelector('.replacements');
            const replacementDiv = document.createElement('div');
            replacementDiv.classList.add('replacement');
            replacementDiv.innerHTML = `
                <div class="replacement-fields">
                    <div class="form-group">
                        <label for="replacementCode">Replacement Code:</label>
                        <input type="text" class="replacementCode" placeholder="Enter replacement code">
                    </div>
                    <div class="form-group">
                        <label for="replacementLevel">Replacement Level:</label>
                        <select class="replacementLevel">
                            <option value="L1">L1</option>
                            <option value="L2">L2</option>
                            <option value="L3">L3</option>
                        </select>
                    </div>
                    <button type="button" class="removeReplacement">X</button>
                </div>
            `;
            replacementsDiv.appendChild(replacementDiv);
            addEventListeners(replacementDiv);
        });
    });

    parentElement.querySelectorAll('.removeReplacement').forEach(button => {
        button.addEventListener('click', (e) => {
            e.target.closest('.replacement').remove();
        });
    });

    parentElement.querySelectorAll('.removeProductTest').forEach(button => {
        button.addEventListener('click', (e) => {
            e.target.closest('.product-test').remove();
            renumberProductTests();
        });
    });
}

function renumberProductTests() {
    document.querySelectorAll('.product-test').forEach((productTestDiv, index) => {
        productTestDiv.querySelector('h3').textContent = `Product Test ${index + 1}`;
    });
}

addEventListeners(document);