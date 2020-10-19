const functions = require('firebase-functions');
const express = require('express');
const cookieParser = require('cookie-parser');
const md5 = require('md5');
const SquareConnect = require('square-connect');
const admin = require('firebase-admin');

const app = express();
app.use(cookieParser());

const port = process.env.PORT || "8000";
const messages = require('./sandbox-messages');
const config = require('./config.json');
const merchants = require('./merchants');

admin.initializeApp();

// Configure Square defcault client
const defaultClient = SquareConnect.ApiClient.instance;
defaultClient.basePath = config.SQ_SANDBOX_BASEURL;
// Configure Square OAuth API instance
const oauthInstance = new SquareConnect.OAuthApi();

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

app.get('/listMerchantsOauth', (req,res) => {
    const data = require('./merchants.json')
    res.send(JSON.stringify(data,0,2))
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