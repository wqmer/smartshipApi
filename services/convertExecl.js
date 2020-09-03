const excelToJson = require('convert-excel-to-json');
// const node_xj = require("xls-to-json");

const result = excelToJson({
    sourceFile: file,
    sheets:[{
        name: 'Sheet1',
        columnToKey: {
        	L:  'Name',
    		G: 'Product'
        }
    }]
});

console.log(result)