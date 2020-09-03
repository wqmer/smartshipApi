const Express = require('express')
const mongoose = require('mongoose');
const excelToJson = require('convert-excel-to-json');
const multer = require('multer')
const path = require('path');

const generateSheet = require('../services/workBook')
const {responseClient} = require ('./util')
const Order = require ('../mongoDB/Order')
const requireLogin = require('../middleware/requireLogin');
const router = Express.Router();

const upload = multer();

router.post('/uploadAndConvert', upload.single('excel'), (req, res ) => {
    try{
        let file = req.file ;
        let result = excelToJson({
          source: file.buffer,
          header:{
              rows: 1
          },

          // 自定义模板
          columnToKey: {
            L: 'Name',
            G: 'Product'
          },
      });

        let data = []
        Object.keys(result).map( key => {
            data = data.concat(result[key])
        })      
        responseClient(res, 200, 0,'Add collection successfully',data)
    }catch(e){
        responseClient(res, 500, 3, e);
    }
});


router.post('/upload', upload.single('excel'), (req, res, next ) => {
    responseClient(res, 200, 0,'upload successfully',req.file);
});
  
  
router.post('/writeToSheetTemplate',(req,res) => {
    let agentlist = req.body.data.agentType
    let data = [];
    let record = req.body.data.records
    agentlist.map(agent => data.push({agentType:agent,workbook: generateSheet(agent,record)}))   
    responseClient(res, 200, 0,'generate sheet-file successfully', data)
})

module.exports = router;