let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);

// Ажлаас гарах хүсэлт
const ResignationRequestSchema = mongoose.Schema({
    employee: {emp: {type: ObjectId, ref: 'Employee'}, user: {type: ObjectId, ref: 'User'}},
    company: {type: ObjectId, ref: 'Company'},

    reason: {type: String},

    status:{type:String, enum:['idle', 'pending', 'approved', 'declined', 'deleted'], default:'idle'},
    created: {type: Date, default: Date.now},
    applied: {type: Date},
});


ResignationRequestSchema.plugin(deepPopulate, {
    whitelist: ['employee.emp', 'employee.user', 'company'],
    populate: {
        'employee.emp': {
            select: '_id staticRole'
        },
        'employee.user': {
            select: '_id first_name last_name'
        },
        'company':{
            select:'_id domain name phone email logo'
        },
    }
});


module.exports = mongoose.model('ResignationRequest', ResignationRequestSchema);