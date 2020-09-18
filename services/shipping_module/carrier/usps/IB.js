
const Service = require('../model.js')
const axios = require('axios');
const SandboxEndPoint = require('../../../../config/dev.js').IBSandBoxEndpoint;

class InternationalBridge extends Service {
    constructor(account, apiEndPoint, discount, carrier, mailClass, asset = {}) {
        super();
        this.account = account;
        this.apiEndPoint = apiEndPoint;
        this.dicount = discount;
        this.carrier = carrier;
        this.mailClass = mailClass;
        this.asset = asset
    }

    shipmentMapRequest(shipment) {
        let shipments = []
        let shipClass = {}
        shipment.parcel_information.parcel_list.forEach(element => {
            let saddress_line2 =  shipment.sender_information.sender_add2 
            let raddress_line2 =  shipment.receipant_information.receipant_add2 

            saddress_line2 = saddress_line2?saddress_line2:''
            raddress_line2 = raddress_line2?raddress_line2:''
            shipClass[this.carrier] = {
                "shape": "Parcel",
                "mail_class": this.mailClass,
                "image_size": "4x6"
            }
            let myShipment = {
                "package_key":element.key,
                "request_id": "Smartship",
                "from_address": {
                    "company_name": shipment.sender_information.sender_company,
                    "first_name": shipment.sender_information.sender_name,
                    "last_name": shipment.sender_information.last_name || " ",
                    "line1": shipment.sender_information.sender_add1 + saddress_line2,
                    "city": shipment.sender_information.sender_city,
                    "state_province": shipment.sender_information.sender_state,
                    "postal_code": shipment.sender_information.sender_zip_code,
                    "phone_number": shipment.sender_information.sender_phone_number,
                    "sms": shipment.sender_information.sender_sms,
                    "email": shipment.sender_information.sender_email,
                    "country_code": "US"
                },
                "to_address": {
                    "company_name": shipment.receipant_information.receipant_company,
                    "first_name": shipment.receipant_information.receipant_name,
                    "last_name": shipment.receipant_information.last_name || " ",
                    "line1": shipment.receipant_information.receipant_add1 + '' + raddress_line2,
                    "city": shipment.receipant_information.receipant_city,
                    "state_province": shipment.receipant_information.receipant_state,
                    "postal_code": shipment.receipant_information.receipant_zip_code,
                    "phone_number": shipment.receipant_information.receipant_phone_number,
                    "email": shipment.receipant_information.receipant_email,
                    "country_code": "US"
                },
                "weight": parseFloat(element.pack_info.weight),
                "weight_unit": "oz",
                "image_format": "png",
                "image_resolution": 300,
                ...shipClass
            }
            shipments.push(myShipment)
        });

        return shipments
    }

    async ship(shipment) {
        try {
            const response = await axios({
                method: "post",
                url: this.apiEndPoint + '/labels',
                data: this.shipmentMapRequest(shipment),
                auth: { ...this.account },
            });
            console.log(response)
            return response
        } catch (error) {
            console.log(error.response)
            return error.response
        }
    }

    async rate(shipment) {
        try {
            let getPackagesRate = this.shipmentMapRequest(shipment)
            let promises = getPackagesRate.map(shipment => {
                return (axios({
                    method: "post",
                    url: this.apiEndPoint + '/price.json',
                    data: shipment,
                    auth: { ...this.account },
                }))
            })

            const response = await Promise.all(promises)
            let ResponseWithoutHeader = response.map(item => {
                let package_key = JSON.parse(item.config.data).package_key
                let myresopnse = {
                    status : item.status,
                    data :{
                        package_key,
                        weight: item.data.weight,
                        zone:item.data[this.carrier].zone,
                        agent:'InternationalBridge',
                        carrier: this.carrier,
                        mail_class: this.mailClass,
                        price : {
                            total : item.data.total_amount
                        }, 
                        asset : {
                            // method_id: 
                            logo_url : this.asset.logo_url,
                            description:this.asset.description,
                            name:this.asset.name
                        }                 
                    }
                }
                return myresopnse
            })
            return ResponseWithoutHeader
        } catch (error) {
            console.log(error)
            return error.response
        }
    }

    // void = () => {

    // }

    // track = () => {

    // }

    // verify = () => {

    // }
}

class InternationalBridgeAlternate extends Service {
    constructor(account, apiEndPoint, discount, carrier, mailClass) {
        super();
        this.account = account;
        this.apiEndPoint = apiEndPoint;
        this.dicount = discount;
        this.carrier = carrier;
        this.mailClass = mailClass;
    }

    shipmentMapRequest(shipment) {
        let shipClass = {}
        shipClass[this.carrier] = {
            "shape": "Parcel",
            "mail_class": this.mailClass,
            "image_size": "4x6"
        }
        let myShipment = {
            "request_id": "Smartship",
            "from_address": {
                "company_name": shipment.sender_information.sender_company,
                "first_name": shipment.sender_information.sender_name,
                "last_name": shipment.sender_information.last_name,
                "line1": shipment.sender_information.sender_add1 + '' + shipment.sender_information.sender_add2,
                "city": shipment.sender_information.sender_city,
                "state_province": shipment.sender_information.sender_state,
                "postal_code": shipment.sender_information.sender_zip_code,
                "phone_number": shipment.sender_information.sender_phone_number,
                "sms": shipment.sender_information.sender_sms,
                "email": shipment.sender_information.sender_email,
                "country_code": "US"
            },
            "to_address": {
                "company_name": shipment.receipant_information.receipant_company,
                "first_name": shipment.receipant_information.receipant_name,
                "last_name": shipment.receipant_information.last_name,
                "line1": shipment.receipant_information.receipant_add1 + '' + shipment.receipant_information.receipant_add2,
                "city": shipment.receipant_information.receipant_city,
                "state_province": shipment.receipant_information.receipant_state,
                "postal_code": shipment.receipant_information.receipant_zip_code,
                "phone_number": shipment.receipant_information.receipant_phone_number,
                "email": shipment.receipant_information.receipant_email,
                "country_code": "US"
            },
            "weight": pack_info.weight,
            "weight_unit": "oz",
            "image_format": "png",
            "image_resolution": 300,
            ...shipClass
        }
        return myShipment
    }

    async ship(shipment) {
        try {
            const response = await axios({
                method: "post",
                url: this.apiEndPoint + '/labels',
                data: this.shipmentMapRequest(shipment),
                auth: { ...this.account },
            });
            console.log(response)
            return response
        } catch (error) {
            console.log(error.response)
            return error.response
        }
    }

    async rate(shipment) {
        try {
            const response = await axios({
                method: "post",
                url: this.apiEndPoint + '/price.json',
                data: this.shipmentMapRequest(shipment),
                auth: { ...this.account },
            });
            console.log(response)
            return response
        } catch (error) {
            console.log(error.response)
            return error.response
        }
    }

    // void = () => {

    // }

    // track = () => {

    // }

    // verify = () => {

    // }
}

module.exports = { InternationalBridge, InternationalBridgeAlternate }

// module.exports = InternationalBridge
        // sender_information:
        // font_type: "warning"
        // is_ready: false
        // panel_title: "编辑中"
        // sender_add1: "12"
        // sender_add2: undefined
        // sender_city: undefined
        // sender_company: undefined
        // sender_name: "qIMIN"
        // sender_phone_number: undefined
        // sender_state: undefined
        // sender_zip_code: undefined

        // parcel_information:
        // font_type: "strong"
        // is_ready: true
        // panel_title: "当前录入1个包裹，重量1 , 尺寸为2 x 3 x 5"
        // parcel_list: Array(1)
        // 0:
        // font_type: "strong"
        // is_panel_opened: true
        // key: "first_pak"
        // pack_info:
        // height: "5"
        // length: "2"
        // order_id: "1"
        // reference: "1"
        // same_pack: "1"
        // weight: "1"
        // width: "3"

        // receipant_information:
        // font_type: "warning"
        // is_ready: false
        // panel_title: "编辑中"
        // receipant_add1: undefined
        // receipant_add2: undefined
        // receipant_city: undefined
        // receipant_company: undefined
        // receipant_name: "1"
        // receipant_phone_number: undefined
        // receipant_state: undefined
        // receipant_zip_code: undefined