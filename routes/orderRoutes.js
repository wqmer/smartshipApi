const Express = require('express')
const mongoose = require('mongoose');
const excelToJson = require('convert-excel-to-json');
const multer = require('multer')
const path = require('path');
const moment = require('moment');
moment.locale("zh-cn");


const sheetToOjbect = require('../services/workBook')
const { responseClient } = require('./util')
const Order = require('../mongoDB/Order')
const requireLogin = require('../middleware/requireLogin');
const router = Express.Router();


// get all Order
// router.get('/getOrders', requireLogin, (req, res) => {
//     Order.find({}).then( data => {
//       responseClient(res, 200, 0, 'Get request successfully', data);
//     } , (e) => {
//       responseClient(res);
//     });
// });

router.get('/getOrders', (req, res) => {
  Order.find({}).sort({ createdAt: 'descending' }).then(data => {
    // console.log( data.map(item =>  moment(item.createdAt).format('lll')) )
    responseClient(res, 200, 0, 'Get request successfully', data);
  }, (e) => {
    console.log(e)
    responseClient(res, 500, 3, e);
  });
});

router.get('/getOrdersBy/:id', (req, res) => {
  let param = req.params.id;
  Order.find({ $or: [{ 'Status': param },] }).sort({ createdAt: 'descending' }).then(data => {
    responseClient(res, 200, 0, 'Get request successfully', data);
  }, (e) => {
    responseClient(res, 500, 3, e);
  });
});


// get one Order
// router.get('/getOrder/:id', async (req, res) => {
//  try {
//   const order =  await Order.findOne({_id: req.params.id})
//   responseClient(res, 200, 0, 'Get request successfully', data);
// } catch (err) {
//   responseClient(res);
// }
// });

// get one Order
router.get('/getOrder/:id', requireLogin, (req, res) => {
  var id = req.params.id;
  Order.findOne({ _id: id }).then((data) => {
    responseClient(res, 200, 0, 'Get request successfully', data);
  }).catch(e => {
    responseClient(res, 500, 3, e);
  });
});

// add one Order
// router.post('/addOrder', requireLogin, (req, res) => {
//      const { Name, Product} = req.body;
//      const order = new Order({
//        Name,
//        Product,
//        _user: req.user.id
//     });

//      order.save()
//        .then(result=>{
//            responseClient(res, 200, 0,'Add successfully',result)
//        }).cancel(err=>{
//        responseClient(res);
//    });
// });

//test for 
router.post('/addOrder', (req, res) => {
  const { Id, Name, Product, PhoneNumber, Address, Quantity, Message, Province, City, District, } = req.body;
  const order = new Order({
    Id,
    Province,
    City,
    District,
    Name,
    Product,
    PhoneNumber,
    Address,
    Quantity,
    Message
    // createdAt : moment().format('lll'),
    // _user: req.user.id
  });

  order.save()
    .then(result => {
      responseClient(res, 200, 0, 'Add successfully', result)
    }).cancel(e => {
      responseClient(res, 500, 3, e);
    });
});


// update one order
// router.patch('/updateOrder/:id', requireLogin, (req, res) => {
//    Order.findByIdAndUpdate(req.params.id, req.body, {new: true}).then((result) => {
//     if (!result) {
//       return res.status(404).send();
//     }
//     responseClient(res, 200, 0,'Update successfully',result);
//   }).catch((e) => {
//     res.status(400).send(e);
//   })
// });

router.patch('/updateOrder/:id', (req, res) => {
  Order.findByIdAndUpdate(req.params.id, req.body, { new: true }).then((result) => {
    if (!result) {
      return res.status(404).send();
    }
    responseClient(res, 200, 0, 'Update successfully', result);
  }).catch((e) => {
    responseClient(res, 500, 3, e);
  })
});

// router.delete('/deleteOrder/:id',requireLogin,  (req, res) => {
//    Order.findOneAndDelete({_id : req.params.id } ).then((result) => {
//     responseClient(res, 200, 0,'delete successfully',result);
//   }).catch((e) => {
//     res.status(400).send(e);
//   })
// });

router.delete('/deleteOrder/:id', (req, res) => {
  Order.findOneAndDelete({ _id: req.params.id }).then((result) => {
    responseClient(res, 200, 0, 'delete successfully', result);
  }).catch((e) => {
    responseClient(res, 500, 3, e);
  })
});


router.post('/importOrders', (req, res) => {
  console.log(req.body)
  req
  Order.insertMany(req.body).then(result => {
    responseClient(res, 200, 0, 'Add collection successfully', result)
  }).cancel(err => {
    responseClient(res, 500, 3, e);
  });
});


router.post('/deleteOrders', (req, res) => {
  Order.deleteMany({ '_id': { '$in': req.body } }).then(result => {
    // console.log(result)
    if (req.body.length == result.n) {
      console.log('delete compeletely ')
    } else {
      console.log('delete Uncompeletely !')
    }
    responseClient(res, 200, 0, 'remove collection successfully', result)
  }).catch(e => {
    responseClient(res, 500, 3, e);
  });
});


router.patch('/updateOrders', (req, res) => {
  let id_array = req.body.data.id
  let update_data = req.body.data.updateContent
  console.log(req.body)
  Order.updateMany({ '_id': { '$in': id_array } }, { $set: update_data }, { multi: true }).then(result => {
    // console.log(result)
    responseClient(res, 200, 0, 'update collection successfully', result)
  }).catch(e => {
    responseClient(res, 500, 3, e);
  });
});

module.exports = router;

//delete one order ; 


