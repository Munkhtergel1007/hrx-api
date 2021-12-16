/**
 * Created by Mega on 2020-10-14.
 */
let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);
let MassAttendance = mongoose.Schema({
    // student_id:{type : ObjectId , ref : 'EEStudents'},
    employee:{type : ObjectId , ref : 'Employee'},
    user:{type : ObjectId , ref : 'User'},
    // school_id : {type:ObjectId, ref : 'ErpEbc'},
    company: {type: ObjectId, ref: 'Company'},
    status: {type:String, enum:['active', 'delete' ,'default'], default:'active'},
    localTime:{type : Date},
    created:{type : Date , default : Date.now},
    byManager: {type: Boolean},
    manager: {emp: {type: ObjectId, ref: 'Employee'}, user: {type: ObjectId, ref: 'User'}},
    reason: {type: String}, // garaar oruulsan shaltgaan
    backup: {type: Date},

    //Timetable
    timetable: {type: ObjectId, ref: 'Timetable'},
});

MassAttendance.plugin(deepPopulate, {
    whitelist: ['employee', 'user', 'timetable', 'manager.emp', 'manager.user'],
    populate: {
        'employee':{
            select:'_id cardId staticRole'
        },
        'user':{
            select:'_id first_name last_name avatar'
        },
        'timetable':{
            select:'_id title days status created'
        },
        'manager.emp':{
            select:'_id cardId staticRole'
        },
        'manager.user':{
            select:'_id first_name last_name avatar'
        },
    }
});

module.exports = mongoose.model('MassAttendance', MassAttendance);