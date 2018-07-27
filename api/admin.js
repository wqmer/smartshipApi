const Express = require ('express')
const {responseClient} = require ('./util')
const Asset = require('../mongoDB/models')
const bodyParser = require('body-parser')
const router = Express.Router();

router.post('/addcrypto', (req, res) => {
    let asset = new Asset({
        name : req.body.name,
        amount: 0
    });
        asset.save().then( data=>{
        responseClient(res,200,0,'add new crypto successfully', data)
    }).cancel(err=>{
        console.log(err);
        responseClient(res);
    });
});


module.exports = router;