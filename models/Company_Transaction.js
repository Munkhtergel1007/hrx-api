let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);


const CompanyTransaction = mongoose.Schema({
    company: {type: ObjectId, ref: 'Company'},
    charge_request: {type: ObjectId, ref: 'charge_request'},
    system_bundle: {type: ObjectId, ref: 'System_bundle'}, // tsenegleh hvselt buyu charge_request ireegvi tohioldold eniig bvrtgene. adminaas tseneglel hiisen tohioldold gsn vg
    transaction: {
        result: {
            fileSize: Number,
            recSize: Number,
        },
        fileSize: Number,
        recSize: Number,
        cost: Number
    },
    admin: {type: ObjectId, ref: 'Admin'},
    ending_date: {type: Date, default: null},
    created: {type: Date, default: Date.now}
});

CompanyTransaction.plugin(deepPopulate, {
    whitelist: ['company', 'company.logo', 'system_bundle', 'charge_request', 'charge_request.type', 'charge_request.responsed_admin', 'charge_request.employee.user', 'charge_request.employee', 'admin'],
    populate: {
        'company': {
            select: '_id name domain logo'
        },
        'company.logo':{
            select:'_id path name url thumb'
        },
        'system_bundle': {
            select: '_id status type cost sale between admin create title status days'
        },
        'charge_request': {
            select: '_id status type company employee responsed_admin created'
        },
        'charge_request.type': {
            select: '_id status type cost sale between bundle admin create'
        },
        'charge_request.employee': {
            select: '_id user'
        },
        'charge_request.employee.user':{
            select:'_id username avatar phone email first_name last_name'
        },
        'charge_request.employee.user.avatar':{
            select:'_id path url'
        },
        'charge_request.responsed_admin':{
            select:'_id username avatar'
        },
        'admin':{
            select:'_id username avatar'
        }
    }
});


module.exports = mongoose.model('Company_transaction', CompanyTransaction);