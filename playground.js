const XLSX = require('xlsx');
const agentTemplate = require('./config/shppingAgent')

const mongoose = require('mongoose');
const moment = require('moment');


var Fakerator = require("fakerator");
var fakerator = Fakerator();
var name = fakerator.names.name();
const rrad = require('rrad')
const Pusher = require('pusher-js');

const randomAddress = rrad.addresses[Math.floor(Math.random() * rrad.addresses.length)]

const my_easy_post = 'W0QXyG60Ld73GkaNOkLLWw'
const huodai_os = 'EZTKe79fd0fd77ad44969260207b17695594vuWvhRaXW2IHQw7Cx9q0QA'


const Easypost = require('@easypost/api');
const api = new Easypost(huodai_os);

var parser = require('parse-address');
var parsed = parser.parseLocation('2850 kelvin ave 2850 Irvine CA 92614 Irvine CA 92614 ');



const serviceClass = require('./services/shipping_module/carrier');

const myShipment = {
    "request_id": "Huodaios",
    "from_address": {
        "company_name": "Redbrick247",
        "first_name": "Jane",
        "last_name": "Wilson",
        "line1": "247 High St",
        "city": "Palo Alto",
        "state_province": "CA",
        "postal_code": "94301",
        "phone_number": "6503915169",
        "sms": "SMS4440404",
        "email": "harry@redbrick247.com",
        "country_code": "US"
    },
    "to_address": {
        "company_name": "RedBrick247",
        "first_name": "John",
        "last_name": "Doe",
        "line1": "4100 Orme St",
        "city": "Palo Alto",
        "state_province": "CA",
        "postal_code": "94306",
        "phone_number": "8884445555",
        "country_code": "US"
    },
    "weight": 0.5,
    "weight_unit": "lb",
    "image_format": "png",
    "image_resolution": 300,
    "usps": {
        "shape": "Parcel",
        "mail_class": "Priority",
        "image_size": "4x6"
    }
}


const newShipment = {
    sender_information: {
        sender_add1: "2850 kelvin ave , apt 123",
        sender_add2: undefined,
        sender_city: 'Irvine',
        sender_company: 'SmartshipLLC',
        sender_name: "QIMIN",
        sender_phone_number: '2155880271',
        sender_state: "CA",
        sender_zip_code: "92614",
    },
    receipant_information: {
        receipant_add1: "50 Deerfield Ave",
        receipant_add2: undefined,
        receipant_city: 'Irvine',
        receipant_company: undefined,
        receipant_name: "Kimi",
        receipant_phone_number: '2155880271',
        receipant_state: 'CA',
        receipant_zip_code: '92606',
    },

    parcel_information: {
        parcel_list: [
            {
                key: "first_pak",
                pack_info: {
                    height: "5",
                    length: "2",
                    order_id: "1",
                    reference: "1",
                    same_pack: "1",
                    weight: "1",
                    width: "3",
                }
            },
            {          
                key: "123_123",
                pack_info: {
                    height: "5",
                    length: "2",
                    order_id: "1",
                    reference: "1",
                    same_pack: "1",
                    weight: "1",
                    width: "3",
                }
            }
        ]
    }
}

const account = {
    username: 'wqmer11532@gmail.com',
    password: '`198811532Ww'
}

const IbSandboxEndpoint = require('./config/dev').IBSandBoxEndpoint

const Service = serviceClass('InternationalBridge')

const service = new Service(account, IbSandboxEndpoint, 'default', 'usps', 'FirstClass')

const myfun = async () => {
    let response = await service.rate(newShipment)
    console.log(response)
}

myfun()

// "schedule_time": {
//     "pick_up_event":  12,   // automatcially generate pick_up_event 12 housr later after this event call 
//     "arrive_event":  16,    // automatcially generate arrive_event 16 housr later after this event call 
//     "departing":  18        // automatcially generate departing 18 housr later after this event call 
// }
// const Myrate = [
//     [2.54, 2.54, 2.55, 2.57, 2.63, 2.71, 2.83, 2.94],
//     [2.90, 2.90, 2.92, 2.94, 2.99, 3.07, 3.18, 3.32],
//     [3.55, 3.55, 3.59, 3.61, 3.69, 3.78, 3.90, 4.03],
//     [4.57, 4.57, 4.57, 4.61, 4.74, 4.86, 4.99, 5.13],
// ]
// const data = [0.125, 0.125, 0.125, 0.125, 0.125, 0.125, 0.125, 0.125] //  平均
// const data = [0.2, 0.2, 0.1, 0.1, 0.1, 0.1, 0.15, 0.05] //  1， 2 区多
// const data = [0.05, 0.05, 0.2, 0.1, 0.1, 0.1, 0.2, 0.2]  //  7， 8 区多


// const data = [0.25, 0.15, 0.15, 0.15, 0.05, 0.05, 0.1, 0.1]  //  美西，美东分仓
// const data = [0.4, 0.1, 0.1, 0.4, 0, 0, 0, 0]  // 最小区域做法
// const expect = 0.02

// const title = [ 
//     {title :'1-4oz'},
//     {title :'5-8oz'},
//     {title :'9-11oz'},
//     {title :'12-15.99oz'},
// ]
// const calculate = (weightRange, rate, arrayZone, profit) => {
//     let a = 0
//     let b = 0
//     for (let y = 0; y < arrayZone.length; y++) {
//         b = b + rate[weightRange][y] * arrayZone[y]
//         //  console.log(b)
//     }
//     return b / (1 - profit)
// }

// console.log('基于当前成本价格，如下包裹数量分布概率： ')
// for (let y = 0 ; y <data.length ; y++){
//    let string = y+1 + '区的包裹占总量 ' + '% ' + `${data[y]}`*100 + ' , '
//     console.log(string)
// }
// console.log(`如下设置不分区价格，可以保证 `  +  '%' + ` ${expect}`*100 + ' 利润')
// for (let y = 0 ; y < Myrate.length ; y++){ 
//     // console.log(title[y])
//     console.log(title[y].title +  " : "  + parseFloat(calculate(y , Myrate, data, expect)).toPrecision(3) )
// }



// console.log(parsed

// const pusher = new Pusher('a02e0dd4b8d8317e5b47', { cluster: 'us3', useTLS: true, });

// var fs = require('fs')
// var debug = require('debug')('playground')

// debug('begin')

// setTimeout(() => {
//     debug('timeout1')
//     for(var i = 0 ; i < 1000000 ; i ++  ){
//         for(var j = 0 ;  j < 100000; j ++ ){
//         }
//     }
// })

// setTimeout(() => {
//     debug('timeout2')
// })

// debug('end')
// const channel = pusher.subscribe("orders");

// channel.bind("inserted", ( data ) => {  
//     console.log(data.id_count)        
// });

// function setTimeoutPromise(v) {
//     return new Promise(resolve => {
//         setTimeout(() => {
//             resolve(v);
//         }, 2000);
//     });
// }

// const myfun = async () => {
//     let result = await setTimeoutPromise('123')
//     return result
// }

// myfun().then(result => console.log(result))

// async () => {
//     let result = await setTimeoutPromise('123')
//     console.log( result )
// }

// console.log(myfun())








/* Either objects or ids can be passed in for addresses and
 * shipments. If the object does not have an id, it will be
 * created. */

// const obj = {
//     base_zone: {
//         one: [1],
//         two: [1],
//         three: [1],
//         four: [1],
//         five: [1],
//         six: [1],
//         eight: [1],
//         nine: [1],
//         extra: [1],
//     },
//     surcharge: [{
//         name: "labeling",
//         amount: "0.5"
//     }]
// }





// //模拟创建10个shipment 带随机重量
// const test_data = []
// for (let i = 0; i < 10; i++) {
//     let random_weight = Math.floor(Math.random() * (1000 - 100) + 500) / 100
//     let random_length = Math.floor(Math.random() * (1000 - 100) + 500) / 100
//     let random_height = Math.floor(Math.random() * (1000 - 100) + 500) / 100
//     let random_width = Math.floor(Math.random() * (1000 - 100) + 500) / 100

//     let test =
//     {
//         "weight": random_weight,
//         "length": random_length,
//         "width": random_width,
//         "height": random_height,
//     }
//     test_data.push(test)
// }


// //封装一个转换 order 的方法 ， 次方法返回一个需要的shipments 数组
// get_order_array = (order_data) => order_data.map(item => new api.Shipment({ parcel: { predefined_package: 'FedExBox', ...item } }))
// const order = new api.Shipment({
//     to_address: toAddress,
//     from_address: fromAddress,
//     parcel: parcel ,
//     shipments: get_order_array(test_data)
// });
// order.save()
//     .then(result => console.log(result.shipments.map(item => item.parcel)))
//     .catch(error => console.log);



// const fromAddress = new api.Address({
//     company: 'EasyPost',
//     street1: '417 Montgomery Street',
//     street2: '5th Floor',
//     city: 'San Francisco',
//     state: 'CA',
//     zip: '94104',
//     phone: '415-528-7555'
// });

// const toAddress = new api.Address({
//     name: 'George Costanza',
//     company: 'Vandelay Industries',
//     street1: '1 E 161st St.',
//     city: 'Bronx',
//     state: 'NY',
//     zip: '10451'
// });


// const parcel = new api.Parcel({
//     length: 9,
//     width: 6,
//     height: 2,
//     weight: 2,
// });

// const shipment = new api.Shipment({
//     to_address: toAddress,
//     from_address: fromAddress,
//     parcel: parcel,
// });

// shipment.save().then(console.log);


// order.save().then(result => console.log(result));
// const m = moment()
// console.log(typeof(m))
// console.log(m.format('lll'))

// let test = {a:[1],b:[2],c:[3]}
// let data = []
// Object.keys(test).map( key => {
//     data = data.concat(test[key])
// }) 



// function Workbook() {
//     if (!(this instanceof Workbook))
//         return new Workbook()
//     this.SheetNames = []
//     this.Sheets = {}
// }

// const generateSheet = (AgentName = '飞碟', data =[{name: undefined}]  ) =>{
//     //  console.log(agentTemplate(AgentName, data).dataFormat )

//     var workbook = XLSX.readFile('./file/example.xls');
//     var ws = workbook.Sheets.sheet1 
//     XLSX.utils.sheet_add_aoa(ws, agentTemplate(AgentName,data).dataFormat, {origin:-1});
//     return workbook.Sheets.Sheet1[ '!rows']

//     //  var ws = XLSX.utils.aoa_to_sheet([agentTemplate(AgentName,data).head]);
//     //  XLSX.utils.sheet_add_aoa(ws, agentTemplate(AgentName,data).dataFormat, {origin:-1});
//     //  const wb = new Workbook()
//     //  wb.SheetNames.push('sheet1')
//     //  wb.Sheets.sheet1 = ws
//     //  return wb 
//     // XLSX.writeFile(workbook, 'out1.xlsx');

// }

// console.log(generateSheet ())
// var array = [ [1 ,2] ,[ 3, 4] , [5 , 6 ] ]
// console.log(array.map( item => [item[1] , item[0] ] ))





    // var myjson =  [
    //                 { '口岸': 'BC普货',
    //                   '参考号': 'XF006',
    //                   '寄件人姓名': 'CDE',
    //                   '寄件人电话': '6263521458',
    //                   '寄件人邮寄地址': '219 N Glendora Ave',
    //                   '品牌': 'MK',
    //                   '品名': '保健品',
    //                   '规格': '400g',
    //                   '数量': '2',
    //                   '重量': '5',
    //                   '申报价值': '30',
    //                   '收件姓名': '仇琰玮'
    //                  },
    //               ]
    //   const ws = XLSX.utils.json_to_sheet(myjson)


