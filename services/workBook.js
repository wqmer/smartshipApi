const XLSX = require('xlsx');
const agentTemplate = require('../config/shppingAgent')

function Workbook() {
    if (!(this instanceof Workbook))
        return new Workbook()
    this.SheetNames = []
    this.Sheets = {}
}

const generateSheet = (AgentName = '飞碟',  data =[{name: undefined}] ) =>{

    // var workbook = XLSX.readFile('./file/example.xls');
    // workbook.Custprops = undefined ;
    // workbook.Props = undefined;
    // XLSX.utils.sheet_add_aoa(workbook.Sheets.sheet1 , agentTemplate(AgentName,data).dataFormat, {origin:-1});
    // return workbook
   // if(agentTemplate(AgentName,data).head)return ''
     var ws = XLSX.utils.aoa_to_sheet([agentTemplate(AgentName,data).head]);
     XLSX.utils.sheet_add_aoa(ws, agentTemplate(AgentName,data).dataFormat, {origin:-1});
     const wb = XLSX.utils.book_new();
     wb.SheetNames.push('sheet1')
     wb.Sheets.sheet1 = ws
     var array =  new Array(agentTemplate(AgentName,data).head.length)
     var wscols = array.fill({wch:13})
     ws['!cols'] = wscols;
     ws["!ref"] = "A1:T11";
     return wb 
}

module.exports = generateSheet 