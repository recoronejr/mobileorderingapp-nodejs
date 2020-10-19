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
                return console.log(err)
            } else {
                const file = JSON.parse(data);
                file.merchants.push(obj);
                const json = JSON.stringify(file, null, 2);
         
                fs.writeFile('./merchants.json', json, 'utf8', function(err){
                     if(err){ 
                           return console.log(err); 
                     } else {
                           //Everything went OK!
                           return console.log("Merchant Added");
                     }});
            }  
         });
    }

}