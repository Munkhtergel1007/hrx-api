let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);

// Ажлаас гарах
const ReferenceSchema = mongoose.Schema({
    employee: {emp: {type: ObjectId, ref: 'Employee'}, user: {type: ObjectId, ref: 'User'}},
    written_by: {emp: {type: ObjectId, ref: 'Employee'}, user: {type: ObjectId, ref: 'User'}},
    company: {type: ObjectId, ref: 'Company'},
    text: String,

    status:{type:String, enum:['pending', 'finished', 'deleted'], default:'pending'},
    created: {type: Date, default: Date.now},
});


ReferenceSchema.plugin(deepPopulate, {
    whitelist: ['employee.emp', 'employee.user', 'written_by.emp', 'written_by.user', 'company'],
    populate: {
        'employee.emp': {
            select: '_id staticRole'
        },
        'employee.user': {
            select: '_id first_name last_name register_id'
        },
        'written_by.emp': {
            select: '_id staticRole'
        },
        'written_by.user': {
            select: '_id first_name last_name register_id'
        },
        'company':{
            select:'_id domain name phone email logo'
        },
    }
});


module.exports = mongoose.model('Reference', ReferenceSchema);