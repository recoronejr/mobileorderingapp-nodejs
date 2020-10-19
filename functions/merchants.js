var fs = require('fs');
var SquareConnect = require('square-connect');
var defaultClient = SquareConnect.ApiClient.instance;

module.exports = {

    saveMerchantOath : function(access_token, refresh_token, expires_at, merchant_id) {
        // Add data obj to JSON file
        var data = fs.readFileSync('merchants.json');
        // Create Oath Object 
        var obj = {
            access_token:access_token,
            refresh_token: refresh_token,
            expires_at: expires_at,
            merchant_id:merchant_id,
        }
        fs.readFile('./merchants.json', 'utf8', function (err, data) {
            if (err) {
                console.log(err)
            } else {
                const file = JSON.parse(data);
                file.merchants.push(obj);
                const json = JSON.stringify(file, null, 2);
         
                fs.writeFile('./merchants.json', json, 'utf8', function(err){
                     if(err){ 
                           console.log(err); 
                     } else {
                           //Everything went OK!
                           console.log("Merchant Added");
                     }});
            }  
         });
    },

    getMenuItemsForEachMerchant : function() {
        // Configure OAuth2 access token for authorization: oauth2
        
        fs.readFile('./merchants.json', 'utf8', function (err, data) {
            if (err) {
                console.log(err)
            } else {
                const file = JSON.parse(data);
                file.merchants.forEach(async function(element) {
                    // GET MenuItems for each merchant and add to the file
                    // Configure OAuth2 access token for authorization: oauth2
                    var oauth2 = defaultClient.authentications['oauth2'];
                    oauth2.accessToken = element.access_token;

                    var apiInstance = new SquareConnect.CatalogApi();

                    var opts = { 
                    'cursor': "", // String | The pagination cursor returned in the previous response. Leave unset for an initial request. See [Pagination](https://developer.squareup.com/docs/basics/api101/pagination) for more information.
                    'types': "ITEM,IMAGE" // String | An optional case-insensitive, comma-separated list of object types to retrieve, for example `ITEM,ITEM_VARIATION,CATEGORY,IMAGE`.  The legal values are taken from the CatalogObjectType enum: `ITEM`, `ITEM_VARIATION`, `CATEGORY`, `DISCOUNT`, `TAX`, `MODIFIER`, `MODIFIER_LIST`, or `IMAGE`.
                    };
                    apiInstance.listCatalog(opts).then(function(data) {
                        console.log('API called successfully. Returned data: ' + data);
                        try {
                           const menuItems = data; 
                           console.log(menuItems.objects)
                        } catch (error) {
                            console.log(error)
                        }
                        
                    }, function(error) {
                        console.error(error);
                    });


                })
            }  
        }); 
        

    }
}