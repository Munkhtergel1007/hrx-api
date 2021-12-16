let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);

// Ажил job
const Work_plan = mongoose.Schema({
    company: {type: ObjectId, ref: 'Company'},
    created_by: {emp: {type: ObjectId, ref: 'Employee'}, user: {type: ObjectId, ref: 'User'}},
    year_month: {type:Date},
    status:{type:String, enum:['idle', 'checking', 'approved', 'decline', 'deleted'], default:'idle'},
    created: {type: Date, default: Date.now},


    comment: {type: String}, // manager comment if he decline
    approved_by: {emp:{type:ObjectId, ref:'Employee'}, user:{type:ObjectId, ref:'User'}, date:{type:Date}}, //JOB OWNER
});


Work_plan.plugin(deepPopulate, {
    whitelist: ['created_by.emp', 'created_by.user', 'company'],
    populate: {
        'created_by.emp': {
            select: '_id staticRole'
        },
        'created_by.user': {
            select: '_id first_name last_name'
        },
        'company':{
            select:'_id domain name phone email logo'
        },
    }
});


module.exports = mongoose.model('Work_plan', Work_plan);