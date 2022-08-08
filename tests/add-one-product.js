const Wendigo = require('wendigo');
const axios = require('axios');
const expect = require('chai').expect;
const baseUrl = 'https://juice-shop.guardrails.ai';
const validEmail = 'PlsDoNotTryToStealMyInfo@gmail.com';
const validPassword = 'PlsDoNotTryToStealMyInfo@gmail.com';
let bearerToken;
let basketId;
let products;
let productNameText;
let productPriceText;

describe('Add one product', function() {
  this.timeout(300000);
  let browser;

  before(async() => {
    // Authenticate
    await axios.post(
      `${baseUrl}/rest/user/login`,
      {email: validEmail, password: validPassword},
      {headers: {'content-type': 'application/json'}}
    ).then((response) => {
      bearerToken = response.data.authentication.token;
      basketId = response.data.authentication.bid;
    }).catch((error) => {
      console.log(error);
    });

    // Get items in basket
    await axios.get(
      `${baseUrl}/rest/basket/${basketId}`,
      {headers: {Authorization: `Bearer ${bearerToken}`}}
    ).then((response) => {
        products = response.data.data.Products;
      }).catch((error) => {
        console.log(error);
      });

    // Delete items
    // eslint-disable-next-line no-plusplus
    for(let i = 0; i < products.length; i++) {
      await axios.delete(
        `${baseUrl}/api/BasketItems/${products[i].BasketItem.id}`,
        {headers: {Authorization: `Bearer ${bearerToken}`}}
      ).then((response) => {
          expect(response.data.status).to.equal('success');
        }).catch((error) => {
          console.log(error);
        });
    }

    browser = await Wendigo.createBrowser({
      headless: false,
      defaultTimeout: 10000
    });
  });

  after(async() => {
    await browser.close();
    await Wendigo.stop();
  });

  it('Open the OWASP Juice Shop home page', async() => {
    await browser.page.setDefaultNavigationTimeout(60000);
    await browser.open('https://juice-shop.guardrails.ai');
    await browser.assert.title('OWASP Juice Shop');
    await browser.waitAndClick('button[aria-label="Close Welcome Banner"]');
    await browser.waitAndClick('a[aria-label="dismiss cookie message"]');
    await browser.waitFor('div[class*="paginator-page-size-label"]');
  });

  it('Login with valid account', async() => {
    await browser.waitAndClick('button#navbarAccount');
    await browser.page.waitForTimeout(500);
    await browser.waitFor('button#navbarLoginButton');
    await browser.waitAndClick('button#navbarLoginButton');
    await browser.waitFor('input#email');
    await browser.type('input#email', validEmail);
    await browser.type('input#password', validPassword);
    await browser.waitAndClick('button#loginButton');
    await browser.waitUntilNotVisible('button#loginButton');
  });

  it('Add one product to the basket', async() => {
    const productName = await browser.page.waitForSelector('div.item-name');
    productNameText = await productName.evaluate(el => el.textContent);
    const productPrice = await browser.page.waitForSelector('div.item-price span');
    productPriceText = await productPrice.evaluate(el => el.textContent);
    const addToBasketButtons = await browser.page.$x('//button[@aria-label="Add to Basket"]')
    await addToBasketButtons[0].click();
    await browser.page.waitForTimeout(5000);
  });

  it('Validate one product that added to the basket has correct info', async() => {
    await browser.waitAndClick('button[aria-label="Show the shopping cart"]');
    await browser.waitFor('button#checkoutButton');
    await browser.page.waitForTimeout(5000);
    const basketProductName = (await browser.page.$x('(//app-basket//mat-row)[1]//mat-cell'))[1];
    const basketProductNameText = await browser.page.evaluate(el => {
      return el.textContent;
    }, basketProductName);
    expect(basketProductNameText).to.equal(productNameText);
  });
});
