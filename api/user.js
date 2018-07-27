const Express = require('express')
const {responseClient} = require ('./util')
const Asset = require ('../mongoDB/models')
const bodyParser = require ('body-parser')
const router = Express.Router();

router.get('/', (req, res) => {
    Asset.find({}).then( data => {
      responseClient(res, 200, 0, 'Get request successfully', data);
    } , (e) => {
      responseClient(res);
    });
});

// get all Asset
router.get('/getAllAsset', (req, res) => {
    Asset.find({}).then( data => {
      responseClient(res, 200, 0, 'Get request successfully', data);
    } , (e) => {
      responseClient(res);
    });
});

// get one Asset
router.get('/getAsset/:id', (req, res) => {
    var id = req.params.id;  
    Asset.findOne({name: id}).then((data) => {
      responseClient(res, 200, 0, 'Get request successfully', data);
    } , (e) => {
      responseClient(res);
    });
});
  

// deposit
router.post('/deposit', (req, res) => {
     const coinType = req.body.name ;
     const despoitAmount = req.body.amount
     Asset.findOneAndUpdate({name:coinType},{ $inc: {amount:despoitAmount} },{new: true})
       .then(result=>{
           responseClient(res, 200, 0,'Deposit successfully',result)
       }).cancel(err=>{
       console.log(err);
       responseClient(res);
   });
});


// withdraw
router.post('/withdraw', (req, res) => {
      const coinType = req.body.name ;
      const despoitAmount = -req.body.amount
      Asset.findOneAndUpdate({name:coinType},{ $inc: {amount:despoitAmount} },{new: true})
        .then(result=>{
            responseClient(res, 200, 0,'Deposit successfully',result)
        }).cancel(err=>{
        console.log(err);
        responseClient(res);
    });
});


// update one currency
// app.patch('/updateCurrency/:id', (req, res) => {
//   var id = req.params.id;


//  Currency.findByIdAndUpdate(id, req.body, {new: true}).then((currency) => {
//     if (!currency) {
//       return res.status(404).send();
//     }

//     res.send({currency});
//   }).catch((e) => {
//     res.status(400).send();
//   })
// });

module.exports = router;