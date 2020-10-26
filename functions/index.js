const functions = require('firebase-functions');
const express = require('express');
const cookieParser = require('cookie-parser');
const md5 = require('md5');
const SquareConnect = require('square-connect');
const admin = require('firebase-admin');
const messages = require('./sandbox-messages');
const config = require('./config.json');
const merchants = require('./merchants');
const cors = require('cors')
const app = express();

admin.initializeApp();
app.use(cookieParser());
// Automatically allow cross-origin requests
app.use(cors({ origin: true }));


// INCLUDE PERMISSIONS YOU WANT YOUR SELLER TO GRANT YOUR APPLICATION
const scopes = ["ITEMS_READ", "MERCHANT_PROFILE_READ", "PAYMENTS_WRITE_ADDITIONAL_RECIPIENTS", "PAYMENTS_WRITE", "PAYMENTS_READ"]


/**
 * Description:
 *  Serves the link that merchants click to authorize your application. For Sandbox Authentication, Sandbox Test Page must be open in web browser
 */
app.get("/sandbox_request_token", (req, res) => {
    // Set the Auth_State cookie with a random md5 string to protect against cross-site request forgery.
    // Auth_State will expire in 300 seconds (5 mins) after the page is loaded.
    var state = md5(Date.now())
    var url = config.SQ_SANDBOX_BASEURL + `/oauth2/authorize?client_id=${config.SQ_SANDBOX_APP_ID}&` + `response_type=code&` + `scope=${scopes.join('+')}` + `&state=` + state
    res.cookie("Auth_State", state, {expire: Date.now() + 300000}).send(
        `<p>
            <a href='${url}'> SANDBOX: Authorize this application</a>
        </p>`
    )
});

var merchantsData = {
    locations: getLocations(),
    menus: getMenus(),
};
function getLocations() {
    var defaultClient = SquareConnect.ApiClient.instance;
    defaultClient.basePath = 'https://connect.squareupsandbox.com';
    const data = require('./merchants.json')
    const merchants = data.merchants
    var locationsArray = []; 
    for (var i = 0; i < merchants.length; i++) {
        // Configure OAuth2 access token for authorization: oauth2
        const oauth2 = defaultClient.authentications['oauth2'];
        // Set sandbox access token
        oauth2.accessToken = merchants[i].access_token;
        // Pass client to API
        const api = new SquareConnect.LocationsApi();
        
        api.listLocations().then(function(data) {
            // console.log('API called successfully. Returned data: ' + JSON.stringify(data, 0, 1));
            locationsArray.push(data.locations[0]);
          }, function(error) {
            console.error(error);
        });
    }
    return locationsArray
}
function getMenus() {
    var defaultClient = SquareConnect.ApiClient.instance;
    defaultClient.basePath = 'https://connect.squareupsandbox.com';
    const data = require('./merchants.json')
    const merchants = data.merchants
    var menusArray = []; 
    var apiInstance = new SquareConnect.CatalogApi();

    for (var i = 0; i < merchants.length; i++) {
        // Configure OAuth2 access token for authorization: oauth2
        const oauth2 = defaultClient.authentications['oauth2'];
        // Set sandbox access token
        oauth2.accessToken = merchants[i].access_token;
        var opts = { 
            'cursor': "", // String | The pagination cursor returned in the previous response. Leave unset for an initial request. See [Pagination](https://developer.squareup.com/docs/basics/api101/pagination) for more information.
            'types': "ITEM,IMAGE" // String | An optional case-insensitive, comma-separated list of object types to retrieve, for example `ITEM,ITEM_VARIATION,CATEGORY,IMAGE`.  The legal values are taken from the CatalogObjectType enum: `ITEM`, `ITEM_VARIATION`, `CATEGORY`, `DISCOUNT`, `TAX`, `MODIFIER`, `MODIFIER_LIST`, or `IMAGE`.
        };
        apiInstance.listCatalog(opts).then(function(data) {
            // console.log('API called successfully. Returned data: ' + JSON.stringify(data, 0, 1));
            menusArray.push(data.objects);
        }, function(error) {
            console.error(error);
        });   
    }
    return menusArray
}
app.get('/getMerchantsLocations', (req,res) => {
    res.send(merchantsData.locations)
});

app.get('/getMerchantsMenus', (req,res) => {
    res.send(merchantsData.menus)
});







app.get('/sandbox_callback', (req, res) => {
    console.log(req.query)
    // Verify the state to protect against cross-site request forgery.
    if (req.cookies["Auth_State"] !== req.query['state']) {
        res.send(messages.displayStateError())
    }

    else if (req.query['error']) {
        // Check to see if the seller clicked the Deny button and handle it as a special case.
        if(("access_denied" === req.query['error']) && ("user_denied" === req.query["error_description"])) {
            res.send(messages.displayError("Authorization denied", "You chose to deny access to the app."))
        }
        // Display the error and description for all other errors.
        else {
            res.send(messages.displayError(req.query["error"], req.query["error_description"]))
        }
    }
    // When the response_type is "code", the seller clicked Allow
    // and the authorization page returned the auth tokens.
    else if ("code" === req.query["response_type"]) {
        // Extract the returned authorization code from the URL
        var code = req.query.code

         // Provide the code in a request to the Obtain Token endpoint
         var body = {
            client_id : config.SQ_SANDBOX_APP_ID,
            client_secret : config.SQ_SANDBOX_APP_SECRET,
            code : code,
            grant_type : 'authorization_code',
        }

        oauthInstance.obtainToken(body)
            // Extract the returned access token from the ObtainTokenResponse object
            .then(data => {
                // Because we want to keep things simple and we're using Sandbox,
                // we call a function that writes the tokens to the page so we can easily copy and use them directly.
                // In production, you should never write tokens to the page. You should encrypt the tokens and handle them securely.
                res.send(messages.writeTokensOnSuccess(data.access_token, data.refresh_token, data.expires_at, data.merchant_id))
                return merchants.saveMerchantOath(data.access_token, data.refresh_token, data.expires_at, data.merchant_id);
            })
            // The response from the Obtain Token endpoint did not include an access token. Something went wrong.
            .catch(error => {
                return res.send(messages.displayError('Exception', error.response.body.message))
            })
    }
    else {
        // No recognizable parameters were returned.
        res.send(messages.displayError("Unknown parameters", "Expected parameters were not returned"))
    }
});

exports.app = functions.https.onRequest(app)