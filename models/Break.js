let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);

// Чөлөө chuluu
const Break = mongoose.Schema({
    employee: {emp: {type: ObjectId, ref: 'Employee'}, user: {type: ObjectId, ref: 'User'}},
    company: {type: ObjectId, ref: 'Company'},
    starting_date: {type:Date},
    ending_date: {type:Date},
    approved_on: {type:Date},
    reason: {type: String},
    approved_by: {emp: {type: ObjectId, ref: 'Employee'}, user: {type: ObjectId, ref: 'User'}},
    created: {type: Date, default: Date.now},
    status:{type:String, enum:['pending', 'approved', 'declined', 'deleted']},
    howManyDaysPaid:{type:Number},
    type: {type: String, enum: ['day', 'hour']}
});


Break.plugin(deepPopulate, {
    whitelist: ['employee.emp', 'employee.user', 'company', 'approved_by.emp', 'approved_by.user'],
    populate: {
        'employee.emp': {
            select: '_id staticRole'
        },
        'employee.user': {
            select: '_id first_name last_name'
        },
        'approved_by.emp':{
            select:'_id staticRole'
        },
        'approved_by.user':{
            select:'_id first_name last_name'
        },
        'company':{
            select:'_id domain name phone email logo'
        },
    }
});


module.exports = mongoose.model('Break', Break);