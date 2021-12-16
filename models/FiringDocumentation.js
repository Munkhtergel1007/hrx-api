let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);
let FiringDocumentationSchema = mongoose.Schema({
    company: {type: ObjectId, ref: 'Company'},
    employee: {emp: {type: ObjectId, ref: 'Employee'}, user: {type: ObjectId, ref: 'User'}},
    status:{type:String, enum:['idle', 'pending', 'approved', 'declined', 'deleted'], default: 'idle'},
    type: {type: String, enum: ['employee', 'company'], default: 'company'},
    date: {type:Date},
    number: {type: Number},
    created: {type:Date, default: Date.now},
    requested_by: {emp: {type: ObjectId, ref: 'Employee'}, user: {type: ObjectId, ref: 'User'}},
    approved_by: {emp: {type: ObjectId, ref: 'Employee'}, user: {type: ObjectId, ref: 'User'}},
});
FiringDocumentationSchema.plugin(deepPopulate, {
    whitelist: [],
    populate: {
    }
});
module.exports = mongoose.model('FiringDocumentation', FiringDocumentationSchema);