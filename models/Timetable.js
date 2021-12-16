let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);

// Цагийн хуваарь tsagiin huvaari
const TimetableSchema = mongoose.Schema({
    company: {type: ObjectId, ref: 'Company'},
    created_by: {emp: {type: ObjectId, ref: 'Employee'}, user: {type: ObjectId, ref: 'User'}},
    deleted_by: {emp: {type: ObjectId, ref: 'Employee'}, user: {type: ObjectId, ref: 'User'}},
    title:{type:String},
    days: [
        {
            title:{type:String, enum:['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']},
            startingHour:{type:String},
            endingHour:{type:String},
        }
    ],
    status:{type:String, enum:['active', 'archived']},
    created: {type: Date, default: Date.now},
});


TimetableSchema.plugin(deepPopulate, {
    whitelist: ['employee.emp','employee.user'],
    populate: {
        'employee.emp': {
            select: '_id staticRole'
        },
        'employee.user': {
            select: '_id first_name last_name'
        },
    }
});


module.exports = mongoose.model('Timetable', TimetableSchema);