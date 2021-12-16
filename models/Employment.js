let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);

// Ажлаас гарах
const EmploymentSchema = mongoose.Schema({
    type: {type: String, enum: ['joined', 'left']},
    employee: {emp: {type: ObjectId, ref: 'Employee'}, user: {type: ObjectId, ref: 'User'}},
    company: {type: ObjectId, ref: 'Company'},
    createdBy: {emp: {type: ObjectId, ref: 'Employee'}, user: {type: ObjectId, ref: 'User'}},

    status:{type:String, enum:['idle', 'active', 'deleted'], default: 'idle'},
    created: {type: Date, default: Date.now},
    applied: {type: Date},
});


EmploymentSchema.plugin(deepPopulate, {
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


module.exports = mongoose.model('Employment', EmploymentSchema);