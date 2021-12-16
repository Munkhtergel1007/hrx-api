let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);


const EmployeeLog = mongoose.Schema({
    company: {type: ObjectId, ref: 'Company'},
    employee: {emp: {type: ObjectId, ref: 'Employee'}, user: {type: ObjectId, ref: 'User'}},
    created: {type: Date, default: Date.now},
    type: {type: String, enum: ['created', 'deleted']},
    requested_by: {emp: {type: ObjectId, ref: 'Employee'}, user: {type: ObjectId, ref: 'User'}},
    approved_by: {emp: {type: ObjectId, ref: 'Employee'}, user: {type: ObjectId, ref: 'User'}},
});
EmployeeLog.plugin(deepPopulate, {
    whitelist: [],
    populate: {

    }
});