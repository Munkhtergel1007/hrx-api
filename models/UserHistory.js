let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);

// Хэрэглэгчийн ажлын түүх
const UserHistorySchema = mongoose.Schema({
    // employee: {emp: {type: ObjectId, ref: 'Employee'}, user: {type: ObjectId, ref: 'User'}},
    user: {type: ObjectId, ref: 'User'},

    // *** subsidiary_change, create_employee
    prev_employee: {type: ObjectId, ref: 'Employee'},
    current_employee: {type: ObjectId, ref: 'Employee'},
    prev_subsidiary:{type:ObjectId, ref:'Company'},
    current_subsidiary:{type:ObjectId, ref:'Company'},


    // *** job_request
    // job_request:{type:ObjectId, ref:'JobRequest'},


    // *** position_change
    prev_position:{type:ObjectId, ref:'Role'},
    current_position:{type:ObjectId, ref:'Role'},


    done_by: {emp: {type: ObjectId, ref: 'Employee'}, user: {type: ObjectId, ref: 'User'}}, //company-iin udirdlaga


    created: {type: Date, default: Date.now},
    status:{type:String, enum:['active'], default:'active'},
    type:{type:String, enum:['job_request', 'create_employee', 'fired_employee', 'position_change', 'subsidiary_change']}
});


UserHistorySchema.plugin(deepPopulate, {
    whitelist: ['user'],
    populate: {
        'user': {
            select: '_id first_name last_name'
        },
    }
});


module.exports = mongoose.model('UserHistory', UserHistorySchema);