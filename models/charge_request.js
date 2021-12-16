/*
*
* bagsh admin ruu bagts solih eswel sungah hvselt ywuulna
*
* */
let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);
let changeReq = mongoose.Schema({
    created: {type:Date, default: Date.now},
    updated: {type:Date, default: null}, // adminaas uurchlult oruulsan eswel hereglegch tsutsalsan veiin udur
    company:{type:ObjectId, ref:'Company'},  // company id
    employee:{type:ObjectId, ref:'Employee'},  // ajilchnii id
    responsed_admin:{type:ObjectId, ref:'Admin', default: null},  // uurchilsun hvnii id / admin /
    status: {type: String, enum: ['pending', 'active', 'cancel'], default: 'pending'},
    type: {
        type: ObjectId,
        ref: 'System_bundle'
    }
});
changeReq.plugin(deepPopulate, {
    whitelist: ['company', 'company.logo', 'responsed_admin', 'employee', 'employee.user', 'type'],
    populate: {
        'company':{
            select:'_id slug name phone email logo'
        },
        'company.logo':{
            select:'_id path name url thumb'
        },
        'employee':{
            select:'_id user'
        },
        'employee.user':{
            select:'_id username avatar phone email first_name last_name'
        },
        'responsed_admin':{
            select:'_id username avatar'
        },
        'type':{
            select:'_id type cost sale between status bundle admin title desc num_recruitment num_file_size'
        }
    }
});
module.exports = mongoose.model('charge_request', changeReq);
