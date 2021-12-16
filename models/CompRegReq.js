let mongoose = require('mongoose');

const CompanyRegReq = mongoose.Schema({
    full_name: {type: String},
    email: {type: String},
    phone: {type: String},
    company_name: {type: String},
    status: {type: String, enum: ["approved", "disapproved", "pending"], default: "pending"} ,
    position_name: {type: String},
    created: {type: Date, default: Date.now},
});

module.exports = mongoose.model('CompanyRegReq', CompanyRegReq);